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

/* ---------- Dark Palette (giống ảnh) ---------- */
const COLORS = {
  bg: '#0F172A',       // slate-900
  card: '#111827',     // gray-900
  ink: '#F8FAFC',      // slate-50
  sub: '#94A3B8',      // slate-400
  border: '#1F2937',   // slate-800
  chipBg: '#334155',   // slate-700
  chipText: '#E2E8F0', // slate-200
  primary: '#3B82F6',  // blue-500
  mute: '#64748B',     // slate-500
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

    parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
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
          <MaterialCommunityIcons name={iconName} size={28} color={COLORS.ink} />
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

        <Ionicons name="chevron-forward" size={20} color={COLORS.mute} />
      </TouchableOpacity>
    );
  }, [router]);

  const keyExtractor = useCallback((it: LibraryItem) => it.id, []);

  /* ---------- Header: Title + Type filter + Search + Grade chips ---------- */
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
            <Ionicons name="swap-vertical" size={18} color={COLORS.ink} />
            <Text style={styles.sortText}>{sortBy === 'updatedAt' ? 'Mới nhất' : 'A → Z'}</Text>
          </TouchableOpacity>
        </View>

        {/* Type filter chips
        <View style={styles.modeRow}>
          {(['Tất cả', ...TYPES] as const).map((label, i) => {
            const isAll = label === 'Tất cả';
            const active = isAll ? typeFilter === null : typeFilter === label;
            const text = isAll
              ? 'Tất cả'
              : label === 'pdf' ? 'PDF'
              : label === 'video' ? 'Video'
              : label === 'exercise' ? 'Bài tập'
              : label === 'note' ? 'Ghi chú'
              : 'Link';
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setTypeFilter(isAll ? null : (label as LibraryItem['type']))}
                style={[styles.modeChip, { backgroundColor: active ? COLORS.primary : COLORS.chipBg }]}
                activeOpacity={0.8}
              >
                <Text style={[styles.modeText, { color: active ? '#FFFFFF' : COLORS.chipText }]}>{text}</Text>
              </TouchableOpacity>
            );
          })}
        </View> */}

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={COLORS.mute} />
          <TextInput
            placeholder="Tìm tài liệu, tag, chủ đề…"
            placeholderTextColor={COLORS.mute}
            value={queryText}
            onChangeText={setQueryText}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {!!queryText && (
            <TouchableOpacity onPress={() => setQueryText('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.mute} />
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
                style={[styles.gradeChip, { backgroundColor: active ? COLORS.primary : COLORS.chipBg }]}
              >
                <Text style={[styles.gradeText, { color: active ? '#FFFFFF' : COLORS.chipText }]}>
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
  }, [insets.top, queryText, grade, sortBy, typeFilter]);

  /* ---------- Empty / Footer ---------- */
  const ListEmpty = useCallback(() => (
    <View style={styles.emptyWrap}>
      {loading ? (
        <ActivityIndicator color={COLORS.mute} />
      ) : (
        <>
          <Ionicons name="book-outline" size={42} color={COLORS.mute} />
          <Text style={styles.emptyText}>Không có tài liệu phù hợp</Text>
        </>
      )}
    </View>
  ), [loading]);

  const ListFooter = useCallback(() => {
    if (loading && items.length === 0) return null;
    if (!hasMore) return <View style={{ height: 24 }} />;
    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator color={COLORS.mute} />
      </View>
    );
  }, [loading, hasMore, items.length]);

  /* ---------- Render ---------- */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.mute} />}
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

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, backgroundColor: COLORS.bg },

  headerWrap: { backgroundColor: COLORS.bg, paddingBottom: 8 },
  titleRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.ink, flex: 1 },
  sortBtn: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  sortText: { marginLeft: 6, color: COLORS.ink, fontWeight: '600' },

  /* Type filter row */
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  modeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.chipBg,
  },
  modeText: { fontWeight: '700' },

  searchBox: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: RADIUS.md,
    backgroundColor: '#1F2937', // slate-800
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, marginLeft: 8, color: COLORS.ink },

  gradeList: { paddingHorizontal: 12, paddingVertical: 6 },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    marginHorizontal: 4,
  },
  gradeText: { fontWeight: '700' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
    elevation: 0, // bỏ bóng trên dark
  },
  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#1F2937', // slate-800
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.ink },
  cardSub: { fontSize: 13, color: COLORS.sub, marginTop: 2 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.chipBg,
    borderRadius: RADIUS.pill,
    marginRight: 6,
    marginBottom: 6,
  },
  tagText: { fontSize: 11, color: COLORS.chipText, fontWeight: '600' },

  emptyWrap: { alignItems: 'center', paddingTop: 48 },
  emptyText: { color: COLORS.sub, marginTop: 8 },
});
