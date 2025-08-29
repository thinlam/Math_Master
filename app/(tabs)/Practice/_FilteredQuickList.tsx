import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';

/* Firebase */
import { db } from '@/scripts/firebase';
import {
    collection,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    startAfter,
    where,
} from 'firebase/firestore';

type QuickDoc = {
  id: string;
  title: string;
  class: number;
  topic?: string;        // 'add_sub' | 'mul_div' | 'geometry' | 'algebra' | 'numberSense'
  difficulty?: string;   // 'easy' | 'medium' | 'hard'
  createdAt?: any;
};

const PAGE = 20;

export default function FilteredQuickList({ title }: { title: string }) {
  const router = useRouter();
  // params được đẩy từ Practice.tsx
  const { grade, topic, difficulty } = useLocalSearchParams<{
    grade?: string;
    topic?: string;
    difficulty?: string;
  }>();

  const [items, setItems] = useState<QuickDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastRef = useRef<QueryDocumentSnapshot | null>(null);

  // ép kiểu params
  const g = useMemo(() => {
    const n = Number(grade);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [grade]);
  const t = topic ? String(topic) : null;
  const d = difficulty ? String(difficulty) : null;

  const buildQuery = useCallback(() => {
    const col = collection(db, 'quick_practice');
    const conds: any[] = [];
    if (g !== null) conds.push(where('class', '==', g));
    if (t) conds.push(where('topic', '==', t));
    if (d) conds.push(where('difficulty', '==', d));
    return query(col, ...conds, orderBy('createdAt', 'desc'), limit(PAGE));
  }, [g, t, d]);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    lastRef.current = null;
    try {
      const q = buildQuery();
      const snap = await getDocs(q);
      const rows: QuickDoc[] = [];
      snap.forEach(docu => rows.push({ id: docu.id, ...(docu.data() as any) }));
      setItems(rows);
      if (snap.docs.length < PAGE) setHasMore(false);
      else lastRef.current = snap.docs[snap.docs.length - 1];
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  const loadMore = useCallback(async () => {
    if (!hasMore || paging || !lastRef.current) return;
    setPaging(true);
    try {
      const q = query(buildQuery(), startAfter(lastRef.current));
      const snap = await getDocs(q);
      const rows: QuickDoc[] = [];
      snap.forEach(docu => rows.push({ id: docu.id, ...(docu.data() as any) }));
      setItems(prev => [...prev, ...rows]);
      if (snap.docs.length < PAGE) setHasMore(false);
      else lastRef.current = snap.docs[snap.docs.length - 1];
    } finally {
      setPaging(false);
    }
  }, [buildQuery, hasMore, paging]);

  useEffect(() => {
    loadFirst();
  }, [g, t, d, loadFirst]);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220', paddingTop: 10 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18, marginLeft: 8, flex: 1 }}>
          {title}
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => {
                // tuỳ luồng của bạn, điều hướng vào màn chơi/chi tiết
                // ví dụ: /Practice/Quick/Set/[id]
                router.push(`/Practice/Quick/Set/${item.id}`);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                marginHorizontal: 12,
                marginVertical: 6,
                borderRadius: 14,
                padding: 12,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>{item.title}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                Lớp {item.class}
                {item.topic ? ` • ${item.topic}` : ''}
                {item.difficulty ? ` • ${item.difficulty}` : ''}
              </Text>
            </TouchableOpacity>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListEmptyComponent={
            <Text style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginTop: 24 }}>
              Không có dữ liệu phù hợp bộ lọc.
            </Text>
          }
          ListFooterComponent={
            paging ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
