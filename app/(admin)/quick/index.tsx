// app/(admin)/quick/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase ---------- */
import { db } from '@/scripts/firebase';
import {
  collection,
  deleteDoc,
  doc,
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
type QuickDoc = {
  id: string;
  title: string;
  class: number;
  questions?: any[];
  createdAt?: any;
  titleSearch?: string;
};

/* ---------- UI ---------- */
const C = {
  bg: '#0b1220',
  card: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.08)',
  text: 'white',
  sub: 'rgba(255,255,255,0.65)',
  good: '#21d07a',
  bad: '#ff5a5f',
  warn: '#ffb020',
};

const PAGE_SIZE = 20;

export default function AdminQuickIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<QuickDoc[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // bộ lọc
  const [classFilter, setClassFilter] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');

  const firstLoadedRef = useRef(false);
  const colRef = collection(db, 'quick_practice');

  /* ---------- Helpers ---------- */
  const toast = (msg: string) => {
    if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  };

  const buildQuery = (opts?: { isLoadMore?: boolean }) => {
    const base: any[] = [];
    if (classFilter !== 'all') base.push(where('class', '==', classFilter));

    const qLower = q.trim().toLowerCase();
    if (qLower) {
      base.push(where('titleSearch', '>=', qLower));
      base.push(where('titleSearch', '<=', qLower + '\uf8ff'));
    }

    return query(
      colRef,
      ...base,
      orderBy(qLower ? 'titleSearch' : 'createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
  };

  const fetchFirst = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    setLastDoc(null);
    try {
      const qSnap = await getDocs(buildQuery());
      const arr: QuickDoc[] = [];
      qSnap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      setItems(arr);
      const last = qSnap.docs[qSnap.docs.length - 1] || null;
      setLastDoc(last);
      setHasMore(Boolean(last));
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
      firstLoadedRef.current = true;
    }
  }, [classFilter, q]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || !lastDoc) return;
    try {
      const core = buildQuery({ isLoadMore: true });
      const paginated = query(core, startAfter(lastDoc));
      const qSnap = await getDocs(paginated);
      const arr: QuickDoc[] = [];
      qSnap.forEach(d => arr.push({ id: d.id, ...(d.data() as any) }));
      setItems(prev => [...prev, ...arr]);
      const last = qSnap.docs[qSnap.docs.length - 1] || null;
      setLastDoc(last);
      setHasMore(Boolean(last));
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e?.message || 'Không tải thêm được');
    }
  }, [hasMore, lastDoc, classFilter, q]);

  useEffect(() => {
    fetchFirst();
  }, [fetchFirst]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirst();
    setRefreshing(false);
  }, [fetchFirst]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    if (!qLower) return items;
    return items.filter(it => (it.title || '').toLowerCase().includes(qLower));
  }, [items, q]);

  /* ---------- Delete handler: tách khỏi điều hướng & báo lỗi chi tiết ---------- */
  const onDelete = useCallback((id: string, title?: string) => {
    Alert.alert(
      'Xoá Quick',
      `Bạn muốn xoá "${title || id}"? Hành động không thể hoàn tác.`,
      [
        { text: 'Huỷ' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'quick_practice', id));
              setItems(prev => prev.filter(i => i.id !== id));
              toast('Đã xoá');
            } catch (e: any) {
              console.error(e);
              Alert.alert('Không xoá được', `${e?.code || ''} ${e?.message || ''}`.trim());
            }
          },
        },
      ],
    );
  }, []);

  const onCopyId = useCallback(async (id: string) => {
    await Clipboard.setStringAsync(id);
    toast('Đã sao chép ID');
  }, []);

  /* ---------- Render ---------- */
  const renderItem = ({ item }: { item: QuickDoc }) => {
    const count = item.questions?.length ?? 0;
    const goDetail = () =>
      router.push({ pathname: '/(admin)/quick/[id]', params: { id: item.id } });

    return (
      <View
        style={{
          padding: 14,
          marginHorizontal: 12,
          marginVertical: 6,
          backgroundColor: C.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: C.line,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center', justifyContent: 'center', marginRight: 12
            }}
          >
            <MaterialCommunityIcons name="lightning-bolt" size={20} color={C.text} />
          </View>

          {/* Vùng bấm để mở chi tiết */}
          <TouchableOpacity onPress={goDetail} style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
              {item.title || '(Chưa đặt tên)'}
            </Text>
            <Text style={{ color: C.sub, fontSize: 12, marginTop: 2 }}>
              Lớp {item.class ?? '—'} • {count} câu hỏi
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginLeft: 8 }}>
            <TouchableOpacity onPress={() => onCopyId(item.id)} hitSlop={10}>
              <Ionicons name="copy-outline" size={18} color={C.sub} />
            </TouchableOpacity>
            <TouchableOpacity onPress={goDetail} hitSlop={10}>
              <Ionicons name="create-outline" size={18} color={C.sub} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(item.id, item.title)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={C.bad} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16, paddingVertical: 12,
          borderBottomWidth: 1, borderColor: C.line,
          flexDirection: 'row', alignItems: 'center', gap: 8
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
          Quick Practice (Admin)
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/(admin)/quick/create')}
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}
        >
          <Ionicons name="add-circle-outline" size={18} color={C.text} />
          <Text style={{ color: C.text, marginLeft: 6 }}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 4, gap: 8 }}>
        {/* Tìm kiếm */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
            borderWidth: 1, borderColor: C.line
          }}
        >
          <Ionicons name="search" size={18} color={C.sub} />
          <TextInput
            placeholder="Tìm theo tiêu đề…"
            placeholderTextColor={C.sub}
            value={q}
            onChangeText={setQ}
            style={{ flex: 1, color: C.text, marginLeft: 8, paddingVertical: Platform.OS === 'ios' ? 6 : 2 }}
            returnKeyType="search"
            onSubmitEditing={fetchFirst}
          />
          {q ? (
            <TouchableOpacity onPress={() => { setQ(''); }} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={C.sub} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Lọc lớp */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {['all', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => {
            const active = classFilter === v;
            return (
              <TouchableOpacity
                key={String(v)}
                onPress={() => setClassFilter(v as any)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
                  backgroundColor: active ? 'rgba(33,208,122,0.25)' : C.card,
                  borderWidth: 1, borderColor: active ? C.good : C.line
                }}
              >
                <Text style={{ color: C.text, fontWeight: active ? '700' : '500' }}>
                  {v === 'all' ? 'Tất cả' : `Lớp ${v}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          onEndReachedThreshold={0.3}
          onEndReached={() => {
            if (q.trim().length === 0 || firstLoadedRef.current) fetchMore();
          }}
          ListEmptyComponent={
            <Text style={{ color: C.sub, textAlign: 'center', marginTop: 24 }}>
              Không có Quick nào phù hợp bộ lọc.
            </Text>
          }
          ListFooterComponent={
            hasMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : (
              <View style={{ height: 16 }} />
            )
          }
        />
      )}
    </View>
  );
}
