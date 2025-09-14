// app/(tabs)/Practice/Daily.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* Firebase */
import { db } from '@/scripts/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

/* ------------------- Types ------------------- */
type DailyTask = {
  id: string;
  title: string;
  subtitle?: string;
  estMinutes?: number;
  grade?: number;
  topic?: string;
  difficulty?: string; // 'easy' | 'medium' | 'hard' (gợi ý)
  createdAt?: any;
};

/* ------------------- Mock fallback ------------------- */
const MOCK_TASKS: DailyTask[] = [
  { id: 'warmup-10', title: 'Khởi động 10 câu', subtitle: 'Làm nhanh kiểm tra phản xạ', estMinutes: 3, difficulty: 'easy' },
  { id: 'speed-60', title: 'Speed 60s', subtitle: 'Cố gắng đúng nhiều nhất trong 1 phút', estMinutes: 1, topic: 'speed' },
  { id: 'topic-geometry', title: 'Hình học cơ bản', subtitle: 'Ôn lại diện tích, chu vi', estMinutes: 5, grade: 6, topic: 'geometry', difficulty: 'medium' },
];

/* ------------------- Keys ------------------- */
const CACHE_KEY = 'daily_tasks_cache';
const LAST_TAPPED_KEY = 'lastDailyTask';

/* ------------------- Component ------------------- */
export default function DailyPracticeScreen() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastTapped, setLastTapped] = useState<string | null>(null);
  const router = useRouter();

  /** Tải cache trước (để UI hiển thị nhanh) */
  const loadCacheFirst = useCallback(async () => {
    const cache = await AsyncStorage.getItem(CACHE_KEY);
    const last = await AsyncStorage.getItem(LAST_TAPPED_KEY);
    if (cache) {
      try {
        const parsed = JSON.parse(cache) as DailyTask[];
        if (Array.isArray(parsed) && parsed.length) setTasks(parsed);
      } catch {}
    }
    if (last) setLastTapped(last);
  }, []);

  /** Load dữ liệu Firestore */
  const fetchRemote = useCallback(async () => {
    const q = query(collection(db, 'daily_tasks'), orderBy('createdAt', 'desc'), limit(10));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docs: DailyTask[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<DailyTask, 'id'>;
        return { id: d.id, ...data };
      });
      setTasks(docs);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(docs));
    } else {
      setTasks(MOCK_TASKS);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      await fetchRemote();
    } catch (err) {
      console.error('Error fetching daily tasks:', err);
      setTasks((prev) => (prev.length ? prev : MOCK_TASKS));
      Alert.alert('Lỗi', 'Không thể tải dữ liệu, dùng danh sách mẫu.');
    } finally {
      setLoading(false);
    }
  }, [fetchRemote]);

  useEffect(() => {
    // 1) Hiển thị cache ngay
    loadCacheFirst().finally(() => {
      // 2) Sau đó gọi remote để cập nhật
      fetchTasks();
    });
  }, [loadCacheFirst, fetchTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRemote();
    } catch {
      Alert.alert('Lỗi', 'Không thể làm mới, vui lòng thử lại.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchRemote]);

  /** Khi chọn 1 task → điều hướng sang Practice/Detail/[id].tsx */
  const handlePressTask = useCallback(async (task: DailyTask) => {
    await AsyncStorage.setItem(LAST_TAPPED_KEY, task.id);
    setLastTapped(task.id);
    router.push(`/Practice/Detail/${task.id}`);
  }, [router]);

  const EmptyState = useMemo(
    () => (
      <View style={S.emptyWrap}>
        <Text style={S.emptyTitle}>Chưa có bài cho hôm nay</Text>
        <Text style={S.emptySub}>Thử kéo để làm mới hoặc quay lại sau nhé.</Text>
        <TouchableOpacity style={S.retryBtn} onPress={fetchTasks}>
          <Text style={S.retryText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    ),
    [fetchTasks]
  );

  return (
    <SafeAreaView style={S.container}>
      {/* Header đơn giản, đúng brand */}
      <Text style={S.header}>Luyện tập hôm nay</Text>

      {loading && tasks.length === 0 ? (
        // Skeleton nhẹ khi chưa có cache
        <View style={{ gap: 12 }}>
          <View style={S.skeleton} />
          <View style={S.skeleton} />
          <View style={S.skeleton} />
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TaskCard
              task={item}
              onPress={() => handlePressTask(item)}
              highlight={lastTapped === item.id}
            />
          )}
          ListEmptyComponent={EmptyState}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
}

/* ------------------- Item Card ------------------- */
function TaskCard({
  task,
  onPress,
  highlight,
}: {
  task: DailyTask;
  onPress: () => void;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity style={[S.card, highlight && S.cardHighlight]} onPress={onPress} activeOpacity={0.8}>
      <View style={{ flex: 1 }}>
        <Text style={S.title}>{task.title}</Text>
        {!!task.subtitle && <Text style={S.subtitle}>{task.subtitle}</Text>}

        <View style={S.tagsRow}>
          {!!task.estMinutes && (
            <View style={[S.badge, { backgroundColor: '#EEF0FF', borderColor: '#DCE0FF' }]}>
              <Text style={[S.badgeText, { color: '#4A57D4' }]}>~{task.estMinutes} phút</Text>
            </View>
          )}
          {!!task.difficulty && (
            <View style={S.tag}>
              <Text style={S.tagText}>
                {task.difficulty === 'easy' ? 'Dễ' : task.difficulty === 'hard' ? 'Khó' : 'Trung bình'}
              </Text>
            </View>
          )}
          {!!task.grade && (
            <View style={S.tag}>
              <Text style={S.tagText}>Lớp {task.grade}</Text>
            </View>
          )}
          {!!task.topic && (
            <View style={S.tag}>
              <Text style={S.tagText}>{task.topic}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Chevron */}
      <View style={S.chevron}>
        <Text style={{ fontSize: 20, color: '#A3A8B4' }}>{'›'}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ------------------- Styles (brand-ready) ------------------- */
const S = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // brand: nền trắng
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 12,
    color: '#0B1220', // brand text
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFBFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EAF2',
  },
  cardHighlight: {
    borderColor: '#6C63FF',
    shadowColor: '#6C63FF',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0B1220',
  },
  subtitle: {
    fontSize: 13.5,
    color: '#5C6272',
    marginTop: 4,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tag: {
    backgroundColor: '#F3F4F8',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EAEDF5',
  },
  tagText: {
    fontSize: 12,
    color: '#43495A',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  chevron: {
    width: 24,
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  /* Empty state + Skeleton */
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0B1220',
  },
  emptySub: {
    fontSize: 13,
    color: '#6A7282',
  },
  retryBtn: {
    marginTop: 10,
    backgroundColor: '#6C63FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  skeleton: {
    height: 72,
    backgroundColor: '#F1F3FA',
    borderRadius: 16,
  },
});
