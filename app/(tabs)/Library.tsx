import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
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
  grade: number;                    // 1..12
  type: 'pdf' | 'video' | 'exercise' | 'note' | 'link';
  coverUrl?: string;
  tags?: string[];
  updatedAt?: any;                  // Firestore Timestamp | null
  lessonId?: string;                // nếu muốn mở sang bài học
  url?: string;                     // nếu là link/pdf/video ngoài
  sizeMB?: number;
  pages?: number;
  durationSec?: number;
  premium?: boolean;
};

/* ---------- Consts ---------- */
const PAGE_SIZE = 12;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const TYPE_ICON: Record<LibraryItem['type'], React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  pdf: 'file-pdf-box',
  video: 'play-circle',
  exercise: 'atom-variant',
  note: 'note-text-outline',
  link: 'link-variant',
};

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
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt');
  const debouncedQ = useDebounced(queryText.trim().toLowerCase(), 400);

  /* ---------- Build Firestore query ---------- */
  const buildQuery = useCallback(() => {
    const col = collection(db, 'library'); // (collection: library)
    let qRef: any[] = [];

    if (grade) qRef.push(where('grade', '==', grade));
    // tìm kiếm đơn giản bằng field keywords (bạn có thể lưu lowercase title + tags)
    // nếu bạn CHƯA có trường keywords (array of string) thì bỏ đoạn where này,
    // và ta sẽ lọc client-side ở dưới
    // Ví dụ: qRef.push(where('keywords', 'array-contains', debouncedQ));

    qRef.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
    qRef.push(limit(PAGE_SIZE));

    // @ts-ignore
    return query(col, ...qRef);
  }, [grade, sortBy]);

  /* ---------- Load first page ---------- */
  const loadInitial = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;

    try {
      const qRef = buildQuery();
      const snap = await getDocs(qRef);
      const data: LibraryItem[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));

      // Nếu không có trường keywords để search server-side, lọc client tại đây
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
  }, [grade, sortBy, debouncedQ, hasMore, loading, refreshing]);

  /* ---------- Effects ---------- */
  useEffect(() => {
    loadInitial();
  }, [grade, sortBy, debouncedQ]); // thay đổi filter -> tải lại

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
      // Ưu tiên lessonId, nếu có thì đẩy qua màn bài học
      if (item.lessonId) {
        router.push(`/Learnning/Lesson/${item.lessonId}`);
        return;
      }
      // Nếu là link/pdf/video ngoài thì mở màn LibraryItem chi tiết (tùy bạn xây)
      router.push({ pathname: '/Library/Item', params: { id: item.id } });
    };

    return (
      <TouchableOpacity
        onPress={goDetail}
        activeOpacity={0.9}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 14,
          backgroundColor: '#fff',
          borderRadius: 16,
          marginHorizontal: 16,
          marginVertical: 8,
          elevation: 1,
          shadowColor: '#000',
          shadowOpacity: 0.05,
          shadowRadius: 8,
        }}
      >
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            backgroundColor: '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name={iconName} size={28} color="#111827" />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
            {item.title || 'Tài liệu'}
          </Text>
          <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
            {item.subtitle || `Lớp ${item.grade} • ${item.type}`}
          </Text>

          {!!item.tags?.length && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
              {item.tags.slice(0, 3).map((t, idx) => (
                <View
                  key={idx}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: '#EEF2FF',
                    borderRadius: 999,
                    marginRight: 6,
                    marginBottom: 6,
                  }}
                >
                  <Text style={{ fontSize: 11, color: '#4F46E5' }}>#{t}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  }, [router]);

  const keyExtractor = useCallback((it: LibraryItem) => it.id, []);

  /* ---------- Header: Search + Filters ---------- */
  const ListHeader = useMemo(() => {
    return (
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
        {/* Title */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#111827', flex: 1 }}>Thư viện</Text>
          <TouchableOpacity
            onPress={() => setSortBy(s => (s === 'updatedAt' ? 'title' : 'updatedAt'))}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
          >
            <Ionicons name="swap-vertical" size={18} color="#374151" />
            <Text style={{ marginLeft: 6, color: '#374151' }}>
              {sortBy === 'updatedAt' ? 'Mới nhất' : 'A → Z'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 14,
            backgroundColor: '#F3F4F6',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Tìm tài liệu, tag, chủ đề…"
            placeholderTextColor="#9CA3AF"
            value={queryText}
            onChangeText={setQueryText}
            style={{ flex: 1, marginLeft: 8, color: '#111827' }}
            returnKeyType="search"
          />
          {!!queryText && (
            <TouchableOpacity onPress={() => setQueryText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Grade filter */}
        <FlatList
          horizontal
          data={GRADES}
          keyExtractor={(g) => `g${g}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 6 }}
          renderItem={({ item: g }) => {
            const active = grade === g;
            return (
              <TouchableOpacity
                onPress={() => setGrade(prev => (prev === g ? null : g))}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  marginHorizontal: 4,
                  backgroundColor: active ? '#4F46E5' : '#EEF2FF',
                }}
              >
                <Text style={{ color: active ? '#fff' : '#4F46E5', fontWeight: '600' }}>Lớp {g}</Text>
              </TouchableOpacity>
            );
          }}
          ListHeaderComponent={<View style={{ width: 4 }} />}
          ListFooterComponent={<View style={{ width: 8 }} />}
        />
      </View>
    );
  }, [insets.top, queryText, grade, sortBy]);

  /* ---------- Empty / Footer ---------- */
  const ListEmpty = useCallback(() => (
    <View style={{ alignItems: 'center', paddingTop: 48 }}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Ionicons name="book-outline" size={42} color="#9CA3AF" />
          <Text style={{ color: '#6B7280', marginTop: 8 }}>Không có tài liệu phù hợp</Text>
        </>
      )}
    </View>
  ), [loading]);

  const ListFooter = useCallback(() => {
    if (loading && items.length === 0) return null;
    if (!hasMore) return <View style={{ height: 24 }} />;
    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }, [loading, hasMore, items.length]);

  /* ---------- Render ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onEndReachedThreshold={0.3}
        onEndReached={loadMore}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
