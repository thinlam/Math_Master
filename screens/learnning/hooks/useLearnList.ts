import { mapLesson, type Lesson } from '@/screens/learning/utils/mapLesson';
import { db } from '@/scripts/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import {
    collection,
    DocumentData,
    getDocs, limit, orderBy, query, QueryDocumentSnapshot, startAfter,
    where
} from 'firebase/firestore';
import React from 'react';

const PAGE_SIZE = 12;

export function useLearnList() {
  const router = useRouter();

  const [grade, setGrade] = React.useState<number | null>(null);
  const [items, setItems] = React.useState<Lesson[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const lastDocRef = React.useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const resolveGrade = React.useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('selectedGrade');
      const g = stored ? Number(stored) : NaN;
      setGrade(!Number.isNaN(g) && g >= 1 && g <= 12 ? g : 1);
    } catch { setGrade(1); }
  }, []);

  useFocusEffect(React.useCallback(() => { resolveGrade(); }, [resolveGrade]));

  const baseQuery = React.useMemo(() => {
    if (grade == null) return null;
    return query(
      collection(db, 'lessons'),
      where('grade', '==', grade),
      orderBy('updatedAt', 'desc'),
      limit(PAGE_SIZE)
    );
  }, [grade]);

  const fetchFirstPage = React.useCallback(async () => {
    if (!baseQuery) return;
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    try {
      const snap = await getDocs(baseQuery);
      const nextItems: Lesson[] = snap.docs.map((d) => mapLesson(d.data(), d.id));
      setItems(nextItems);
      setHasMore(snap.size === PAGE_SIZE);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    } finally { setLoading(false); }
  }, [baseQuery]);

  const fetchNextPage = React.useCallback(async () => {
    if (!hasMore || !lastDocRef.current || grade == null) return;
    const q2 = query(
      collection(db, 'lessons'),
      where('grade', '==', grade),
      orderBy('updatedAt', 'desc'),
      startAfter(lastDocRef.current),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q2);
    const nextItems: Lesson[] = snap.docs.map((d) => mapLesson(d.data(), d.id));
    setItems((prev) => [...prev, ...nextItems]);
    setHasMore(snap.size === PAGE_SIZE);
    lastDocRef.current = snap.docs[snap.docs.length - 1] ?? lastDocRef.current;
  }, [grade, hasMore]);

  React.useEffect(() => {
    if (grade == null) return;
    setItems([]);
    setHasMore(true);
    lastDocRef.current = null;
    fetchFirstPage();
  }, [grade, fetchFirstPage]);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  }, [fetchFirstPage]);

  const openLesson = React.useCallback(
    (it: Lesson) => { 
      // giữ path bạn đã fix
      router.push(`/(tabs)/Learnning/Lesson/${it.id}`);
    }, [router]
  );

  const goChangeGrade = React.useCallback(() => router.push('/(tabs)'), [router]);

  const init = React.useCallback(() => {
    // tách riêng để container gọi 1 lần cho sạch
    resolveGrade();
  }, [resolveGrade]);

  return {
    grade, items, loading, refreshing, hasMore,
    init, next: fetchNextPage, refresh, openLesson, goChangeGrade,
  };
}
