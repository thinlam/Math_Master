import { useTheme } from '@/theme/ThemeProvider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Modal, RefreshControl, SafeAreaView, StatusBar,
  Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Firebase */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection, doc, DocumentData, getDocs, limit, onSnapshot, orderBy, query,
  QueryDocumentSnapshot, startAfter, where,
} from 'firebase/firestore';

/* Local */
import { LibraryStyles } from '@/components/style/tab/LibraryStyles';
import { GRADES, PAGE_SIZE, TYPE_ICON, TYPES } from '@/constants/tab/library';
import { useDebounced } from '@/hooks/common/useDebounced';
import { computeIsPremium } from '@/utils/subscription';

/* Types */
type LibraryItem = {
  id: string;
  title: string;
  subtitle?: string;
  grade: number; // 1..12
  type: (typeof TYPES)[number];
  coverUrl?: string;
  tags?: string[];
  updatedAt?: any;
  lessonId?: string;
  url?: string;
  sizeMB?: number;
  pages?: number;
  durationSec?: number;
  premium?: boolean;
};

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => LibraryStyles(palette), [palette]);

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // user & premium
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState(false);

  // holds unsub
  const userUnsubRef = useRef<null | (() => void)>(null);
  const subsUnsubRef = useRef<null | (() => void)>(null);

  // filters
  const [queryText, setQueryText] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<LibraryItem['type'] | null>(null);
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt');
  const debouncedQ = useDebounced(queryText.trim().toLowerCase(), 400);

  /* Auth + realtime premium */
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);

      userUnsubRef.current?.(); userUnsubRef.current = null;
      subsUnsubRef.current?.(); subsUnsubRef.current = null;

      if (u?.uid) {
        const userRef = doc(db, 'users', u.uid);
        userUnsubRef.current = onSnapshot(
          userRef,
          (snap) => setIsPremium(computeIsPremium(snap.exists() ? snap.data() : {})),
          () => setIsPremium(false)
        );

        const LISTEN_SUBS = true;
        if (LISTEN_SUBS) {
          const qSubs = query(collection(db, 'subscriptions'), where('userId', '==', u.uid));
          subsUnsubRef.current = onSnapshot(
            qSubs,
            (snap) => {
              let active = false;
              snap.forEach((d) => {
                const st = String((d.data() as any)?.status || '').toLowerCase();
                if (['active', 'trialing', 'past_due'].includes(st)) active = true;
              });
              if (active) setIsPremium(true);
            },
            () => {}
          );
        }
      } else {
        setIsPremium(false);
      }
    });

    return () => {
      unsubAuth();
      userUnsubRef.current?.(); userUnsubRef.current = null;
      subsUnsubRef.current?.(); subsUnsubRef.current = null;
    };
  }, []);

  /* Build query */
  const buildQuery = useCallback(() => {
    const col = collection(db, 'library');
    const parts: any[] = [];
    if (grade) parts.push(where('grade', '==', grade));
    if (typeFilter) parts.push(where('type', '==', typeFilter));
    parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
    parts.push(limit(PAGE_SIZE));
    // @ts-ignore
    return query(col, ...parts);
  }, [grade, typeFilter, sortBy]);

  /* Initial load */
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
    } finally {
      setLoading(false);
    }
  }, [buildQuery, debouncedQ]);

  /* Load more */
  const loadMore = useCallback(async () => {
    if (!hasMore || loading || refreshing) return;
    if (!lastDocRef.current) return;

    const colRef = collection(db, 'library');
    const parts: any[] = [];
    if (grade) parts.push(where('grade', '==', grade));
    if (typeFilter) parts.push(where('type', '==', typeFilter));
    parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
    parts.push(startAfter(lastDocRef.current));
    parts.push(limit(PAGE_SIZE));
    const qRef = query(colRef, ...parts);

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
  }, [grade, typeFilter, sortBy, debouncedQ, hasMore, loading, refreshing]);

  useEffect(() => { loadInitial(); }, [grade, typeFilter, sortBy, debouncedQ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInitial();
    setRefreshing(false);
  }, [loadInitial]);

  /* Navigation */
  const openItem = useCallback((item: LibraryItem) => {
    const locked = !!item.premium && !isPremium;
    if (locked) return setShowPaywall(true);
    if (item.lessonId) return router.push(`/Learnning/Lesson/${item.lessonId}`);
    router.push({ pathname: '/(tabs)/Library/Item', params: { id: item.id } });
  }, [isPremium, router]);

  /* Item */
  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    const iconName = TYPE_ICON[item.type] || 'file-outline';
    const locked = !!item.premium && !isPremium;

    return (
      <TouchableOpacity onPress={() => openItem(item)} activeOpacity={locked ? 0.8 : 0.9} style={[styles.card, locked && { opacity: 0.6 }]}>
        <View style={styles.cardIcon}>
          <MaterialCommunityIcons name={iconName} size={28} color={palette.text} />
          {locked && (
            <View style={styles.lockBadge}>
              <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
            </View>
          )}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Tài liệu'}</Text>
            {!!item.premium && (
              <View style={[styles.premiumPill, { backgroundColor: palette.brandSoft, borderColor: palette.pillBorder }]}>
                <Ionicons name="star" size={12} color={palette.text} />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            )}
          </View>
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
  }, [openItem, styles, palette, isPremium]);

  const keyExtractor = useCallback((it: LibraryItem) => it.id, []);

  /* Header */
  const ListHeader = useMemo(() => (
    <View style={[styles.headerWrap, { paddingTop: insets.top + 4 }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Thư viện</Text>

        {isPremium ? (
          <View style={styles.mePill}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={[styles.mePillText, { color: '#10B981' }]}>Đã nâng cấp</Text>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setShowPaywall(true)} style={styles.mePill}>
            <Ionicons name="star" size={14} color={palette.text} />
            <Text style={styles.mePillText}>Nâng cấp</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => setSortBy(s => (s === 'updatedAt' ? 'title' : 'updatedAt'))} style={styles.sortBtn}>
          <Ionicons name="swap-vertical" size={18} color={palette.text} />
          <Text style={styles.sortText}>{sortBy === 'updatedAt' ? 'Mới nhất' : 'A → Z'}</Text>
        </TouchableOpacity>
      </View>

      {!isPremium && (
        <TouchableOpacity onPress={() => setShowPaywall(true)} style={[styles.upsell, { borderColor: palette.cardBorder }]}>
          <Ionicons name="lock-closed" size={16} color={palette.text} />
          <Text style={styles.upsellText}>Một số tài liệu nâng cao đã bị khóa. Nâng cấp Premium để mở toàn bộ nội dung.</Text>
          <Ionicons name="chevron-forward" size={16} color={palette.ionMuted} />
        </TouchableOpacity>
      )}

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
              style={[
                styles.gradeChip,
                { backgroundColor: active ? palette.brand : palette.pillBg, borderColor: palette.pillBorder },
              ]}
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
  ), [insets.top, queryText, grade, sortBy, styles, palette, isPremium]);

  /* Empty / Footer */
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

  /* Modal */
  const goUpgrade = useCallback(() => {
    setShowPaywall(false);
    router.push('/(tabs)/Store');
  }, [router]);

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

      <Modal visible={showPaywall} transparent animationType="fade" onRequestClose={() => setShowPaywall(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <View style={styles.modalIcon}>
              <Ionicons name="lock-closed" size={24} color={palette.text} />
            </View>
            <Text style={styles.modalTitle}>Nội dung Premium</Text>
            <Text style={styles.modalDesc}>
              Tài liệu này chỉ dành cho tài khoản Premium. Nâng cấp để mở toàn bộ tài liệu nâng cao, không giới hạn.
            </Text>

            <View style={styles.modalRow}>
              <TouchableOpacity onPress={() => setShowPaywall(false)} style={[styles.modalBtn, { backgroundColor: palette.pillBg, borderColor: palette.pillBorder }]}>
                <Text style={[styles.modalBtnText, { color: palette.text }]}>Để sau</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={goUpgrade} style={[styles.modalBtn, { backgroundColor: palette.brand }]}>
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Nâng cấp ngay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
