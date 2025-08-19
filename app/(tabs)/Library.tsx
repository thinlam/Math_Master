import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase ---------- */
import { db } from '@/scripts/firebase';
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  where,
} from 'firebase/firestore';

/* ---------- Types ---------- */
type LibraryItem = {
  id: string;
  title: string;
  subtitle?: string;
  grade: number; // 1..12
  type: 'pdf' | 'video' | 'exercise' | 'note' | 'link';
  coverUrl?: string;
  tags?: string[];
  updatedAt?: any; // Firestore Timestamp | null
  lessonId?: string;
  url?: string;
  sizeMB?: number;
  pages?: number;
  durationSec?: number;
  premium?: boolean;
};

/* ---------- Consts ---------- */
const PAGE_SIZE = 12;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const TYPES: LibraryItem['type'][] = ['pdf', 'video', 'exercise', 'note', 'link'];

const TYPE_ICON: Record<
  LibraryItem['type'],
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  pdf: 'file-pdf-box',
  video: 'play-circle',
  exercise: 'atom-variant',
  note: 'note-text-outline',
  link: 'link-variant',
};

const RADIUS = { lg: 16, md: 12, pill: 999 };

/* ---------- Helper: Debounce ---------- */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/* ---------- UI ---------- */
export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // filters
  const [queryText, setQueryText] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<LibraryItem['type'] | null>(null);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt');
  const debouncedQ = useDebounced(queryText.trim().toLowerCase(), 400);

  /* ---------- Build Firestore query ---------- */
  const buildQuery = useCallback(() => {
    const col = collection(db, 'library');
    const parts: any[] = [];

    if (grade) parts.push(where('grade', '==', grade));
    if (typeFilter) parts.push(where('type', '==', typeFilter));
    // Nếu có field `keywords` (lowercase title + tags) có thể bật:
    // if (debouncedQ) parts.push(where('keywords', 'array-contains', debouncedQ));

    parts.push(
      orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc')
    );
    parts.push(limit(PAGE_SIZE));

    // @ts-ignore
    return query(col, ...parts);
  }, [grade, typeFilter, sortBy]);

  /* ---------- Load first page ---------- */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;

    try {
      const qRef = buildQuery();
      const snap = await getDocs(qRef);
      const data: LibraryItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const filtered = debouncedQ
        ? data.filter(it =>
            (it.title || '').toLowerCase().includes(debouncedQ) ||
            (it.subtitle || '').toLowerCase().includes(debouncedQ) ||
            (it.tags || []).some(t => t.toLowerCase().includes(debouncedQ))
          )
        : data;

      setItems(filtered);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    } catch (e) {
      console.warn('loadInitial error', e);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, debouncedQ]);

  /* ---------- Load more (pagination) ---------- */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    if (!lastDocRef.current) return;

    try {
      const col = collection(db, 'library');
      const parts: any[] = [];
      if (grade) parts.push(where('grade', '==', grade));
      if (typeFilter) parts.push(where('type', '==', typeFilter));
      parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
      parts.push(startAfter(lastDocRef.current));
      parts.push(limit(PAGE_SIZE));
      const qRef = query(col, ...parts);

      const snap = await getDocs(qRef);
      const data: LibraryItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      const filtered = debouncedQ
        ? data.filter(it =>
            (it.title || '').toLowerCase().includes(debouncedQ) ||
            (it.subtitle || '').toLowerCase().includes(debouncedQ) ||
            (it.tags || []).some(t => t.toLowerCase().includes(debouncedQ))
          )
        : data;

      setItems(prev => [...prev, ...filtered]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : lastDocRef.current;
    } catch (e) {
      console.warn('loadMore error', e);
    }
  }, [grade, typeFilter, sortBy, debouncedQ, hasMore, loading, refreshing]);

  /* ---------- Effects ---------- */
  useEffect(() => { loadInitial(); }, [grade, typeFilter, sortBy, debouncedQ]);

  /* ---------- Refresh ---------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  /* ---------- Item UI ---------- */
  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    const iconName = TYPE_ICON[item.type] || 'file-outline';
    const goDetail = () => {
      if (item.lessonId) {
        router.push(`/Learnning/Lesson/${item.lessonId}`);
        return;
      }
      router.push({ pathname: '/(tabs)/Library/Item', params: { id: item.id } });
    };

    return (
      <TouchableOpacity onPress={goDetail} activeOpacity={0.9} style={styles.card}>
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons name={iconName} size={28} color={palette.text} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Tài liệu'}</Text>
          <Text style={styles.cardSub} numberOfLines={1}>
            {item.subtitle || `Lớp ${item.grade} • ${item.type}`}
          </Text>

          {!!item.tags?.length && (
            <View style={styles.tagRow}>
              {item.tags.slice(0, 3).map((t, idx) => (
                <View key={idx} style={styles.tagChip}>
                  <Text style={styles.tagText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color={palette.ionMuted} />
      </TouchableOpacity>
    );
  }, [router, styles, palette]);

  const keyExtractor = useCallback((it: LibraryItem) => it.id, []);

  /* ---------- Header ---------- */
  const ListHeader = useMemo(() => {
    return (
      <View style={[styles.headerWrap, { paddingTop: insets.top + 4 }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <Text style={styles.title}>Thư viện</Text>
          <TouchableOpacity
            onPress={() => setSortBy(s => (s === 'updatedAt' ? 'title' : 'updatedAt'))}
            style={styles.sortBtn}
          >
            <Ionicons name="swap-vertical" size={18} color={palette.text} />
            <Text style={styles.sortText}>{sortBy === 'updatedAt' ? 'Mới nhất' : 'A → Z'}</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={palette.ionMuted} />
          <TextInput
            placeholder="Tìm tài liệu, tag, chủ đề…"
            placeholderTextColor={palette.ionMuted}
            value={queryText}
            onChangeText={setQueryText}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {!!queryText && (
            <TouchableOpacity onPress={() => setQueryText('')}>
              <Ionicons name="close-circle" size={18} color={palette.ionMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Grade filter chips */}
        <FlatList
          horizontal
          data={GRADES}
          keyExtractor={(g) => `g${g}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeList}
          renderItem={({ item: g }) => {
            const active = grade === g;
            return (
              <TouchableOpacity
                onPress={() => setGrade(prev => (prev === g ? null : g))}
                style={[styles.gradeChip, { backgroundColor: active ? palette.brand : palette.pillBg, borderColor: palette.pillBorder }]}
              >
                <Text style={[styles.gradeText, { color: active ? '#FFFFFF' : palette.textFaint }]}>
                  Lớp {g}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={<View style={{ width: 4 }} />}
          ListFooterComponent={<View style={{ width: 8 }} />}
        />
      </View>
    );
  }, [insets.top, queryText, grade, sortBy, typeFilter, styles, palette]);

  /* ---------- Empty / Footer ---------- */
  const ListEmpty = useCallback(() => (
    <View style={styles.emptyWrap}>
      {loading ? (
        <ActivityIndicator color={palette.ionMuted} />
      ) : (
        <>
          <Ionicons name="book-outline" size={42} color={palette.ionMuted} />
          <Text style={styles.emptyText}>Không có tài liệu phù hợp</Text>
        </>
      )}
    </View>
  ), [loading, styles, palette]);

  const ListFooter = useCallback(() => {
    if (loading && items.length === 0) return null;
    if (!hasMore) return <View style={{ height: 24 }} />;
    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator color={palette.ionMuted} />
      </View>
    );
  }, [loading, hasMore, items.length, palette]);

  /* ---------- Render ---------- */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
      <View style={styles.container}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles theo theme ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    container: { flex: 1, backgroundColor: p.bg },

    headerWrap: { backgroundColor: p.bg, paddingBottom: 8 },
    titleRow: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    title: { fontSize: 24, fontWeight: '800', color: p.text, flex: 1 },
    sortBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
    sortText: { marginLeft: 6, color: p.text, fontWeight: '600' },

    // search
    searchBox: {
      marginHorizontal: 16,
      marginBottom: 8,
      borderRadius: RADIUS.md,
      backgroundColor: p.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      height: 44,
    },
    searchInput: { flex: 1, marginLeft: 8, color: p.text },

    gradeList: { paddingHorizontal: 12, paddingVertical: 6 },
    gradeChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      marginHorizontal: 4,
      borderWidth: 1,
    },
    gradeText: { fontWeight: '700' },

    // card
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: p.card,
      borderRadius: RADIUS.lg,
      marginHorizontal: 16,
      marginVertical: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.cardBorder,
      elevation: 0,
    },
    cardIcon: {
      width: 54,
      height: 54,
      borderRadius: 14,
      backgroundColor: p.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    cardTitle: { fontSize: 16, fontWeight: '700', color: p.text },
    cardSub: { fontSize: 13, color: p.textMuted, marginTop: 2 },

    // tags
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
    tagChip: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: p.pillBg,
      borderRadius: RADIUS.pill,
      marginRight: 6,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: p.pillBorder,
    },
    tagText: { fontSize: 11, color: p.textFaint, fontWeight: '600' },

    emptyWrap: { alignItems: 'center', paddingTop: 48 },
    emptyText: { color: p.textMuted, marginTop: 8 },
  });
}
