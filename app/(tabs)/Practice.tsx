// app/(tabs)/Practice.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase ---------- */
import { auth, db } from '@/scripts/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  where,
} from 'firebase/firestore';

/* ---------- Types ---------- */
type Difficulty = 'easy' | 'medium' | 'hard' | number;
type PracticeSet = {
  id: string;
  title: string;
  grade: number;
  topic?: string;
  difficulty?: Difficulty;
  questionCount?: number;
  coverUrl?: string;
  published: boolean;
  updatedAt?: Timestamp | null;
};

type ProgressDoc = { done?: number; total?: number };

/* ---------- UI Helpers ---------- */
const COLORS = {
  bg: '#0B1020',
  card: '#141A2E',
  text: '#E6E9F5',
  sub: '#A7B0C0',
  chip: '#1E2540',
  chipActive: '#2F3B71',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  line: '#2A3354',
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const TOPICS = ['Cộng trừ', 'Nhân chia', 'Hình học', 'Đại số', 'Số học', 'Phân số', 'Tư duy'];
const DIFFS: { key: Difficulty; label: string }[] = [
  { key: 'easy', label: 'Dễ' },
  { key: 'medium', label: 'Vừa' },
  { key: 'hard', label: 'Khó' },
];

/* ---------- Main Component ---------- */
export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* ---------- Filters ---------- */
  const [grade, setGrade] = useState<number | null>(null);
  const [topic, setTopic] = useState<string | null>(null);
  const [diff, setDiff] = useState<Difficulty | null>(null);

  /* ---------- Data States ---------- */
  const [items, setItems] = useState<PracticeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paging, setPaging] = useState(false);
  const lastSnapRef = useRef<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  /* ---------- Progress cache ---------- */
  const [progressMap, setProgressMap] = useState<Record<string, ProgressDoc>>({});

  const pageSize = 12;

  const buildQuery = useCallback(() => {
    const colRef = collection(db, 'practiceSets');
    let q: any = query(
      colRef,
      where('published', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(pageSize)
    );

    if (grade !== null) {
      q = query(colRef, where('published', '==', true), where('grade', '==', grade), orderBy('updatedAt', 'desc'), limit(pageSize));
    }
    if (topic) {
      // nếu có grade + topic
      if (grade !== null) {
        q = query(
          colRef,
          where('published', '==', true),
          where('grade', '==', grade),
          where('topic', '==', topic),
          orderBy('updatedAt', 'desc'),
          limit(pageSize)
        );
      } else {
        q = query(
          colRef,
          where('published', '==', true),
          where('topic', '==', topic),
          orderBy('updatedAt', 'desc'),
          limit(pageSize)
        );
      }
    }
    if (diff !== null) {
      // diff có thể là string/number; lưu dưới field difficulty
      const baseConstraints: any[] = [where('published', '==', true)];
      if (grade !== null) baseConstraints.push(where('grade', '==', grade));
      if (topic) baseConstraints.push(where('topic', '==', topic));
      baseConstraints.push(where('difficulty', '==', diff));
      q = query(colRef, ...baseConstraints, orderBy('updatedAt', 'desc'), limit(pageSize));
    }
    return q;
  }, [grade, topic, diff]);

  const fetchPage = useCallback(
    async (first = false) => {
      try {
        if (first) {
          setLoading(true);
          lastSnapRef.current = null;
          setHasMore(true);
        } else {
          if (!hasMore || paging) return;
          setPaging(true);
        }

        let q = buildQuery();
        if (!first && lastSnapRef.current) {
          // cần cùng orderBy với query trước
          q = query(q, startAfter(lastSnapRef.current));
        }

        const snap = await getDocs(q);
        const rows: PracticeSet[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          rows.push({
            id: d.id,
            title: data.title,
            grade: data.grade,
            topic: data.topic,
            difficulty: data.difficulty,
            questionCount: data.questionCount,
            coverUrl: data.coverUrl,
            published: data.published,
            updatedAt: data.updatedAt ?? null,
          });
        });

        if (first) {
          setItems(rows);
        } else {
          setItems((prev) => [...prev, ...rows]);
        }

        if (snap.docs.length < pageSize) {
          setHasMore(false);
        } else {
          lastSnapRef.current = snap.docs[snap.docs.length - 1] ?? null;
        }

        // nạp tiến độ cho các item mới (nếu đã đăng nhập)
        const uid = auth.currentUser?.uid;
        if (uid) {
          const entries = await Promise.all(
            rows.map(async (it) => {
              const pRef = doc(db, 'users', uid, 'progress', it.id);
              const pSnap = await getDoc(pRef);
              return [it.id, (pSnap.exists() ? (pSnap.data() as ProgressDoc) : { done: 0, total: it.questionCount ?? 0 })] as const;
            })
          );
          setProgressMap((prev) => {
            const copy = { ...prev };
            for (const [k, v] of entries) copy[k] = v;
            return copy;
          });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setPaging(false);
        setRefreshing(false);
      }
    },
    [buildQuery, hasMore, paging]
  );

  useFocusEffect(
    useCallback(() => {
      fetchPage(true);
    }, [grade, topic, diff])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(true);
  }, [fetchPage]);

  const header = useMemo(
    () => (
      <View style={{ paddingTop: insets.top + 8, backgroundColor: COLORS.bg }}>
        <StatusBar barStyle="light-content" />
        <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
          <Text style={{ color: COLORS.text, fontSize: 22, fontWeight: '700' }}>
            Luyện tập
          </Text>
          <Text style={{ color: COLORS.sub, marginTop: 4 }}>
            Chọn bộ bài theo lớp, chủ đề và độ khó.
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 8 }}>
          <QuickButton
            icon="flash-outline"
            label="Luyện nhanh"
            onPress={() => router.push('/Practice/Quick')}
          />
          <QuickButton
            icon="timer-outline"
            label="Thi tốc độ"
            onPress={() => router.push('/Practice/Speed')}
          />
          <QuickButton
            icon="calendar-outline"
            label="Thử thách ngày"
            onPress={() => router.push('/Practice/Daily')}
          />
        </View>

        {/* Filters */}
        <FilterRow
          label="Lớp"
          data={GRADES.map((g) => ({ key: String(g), label: `Lớp ${g}`, active: grade === g }))}
          onPress={(k) => setGrade((prev) => (prev === Number(k) ? null : Number(k)))}
        />
        <FilterRow
          label="Chủ đề"
          data={TOPICS.map((t) => ({ key: t, label: t, active: topic === t }))}
          onPress={(k) => setTopic((prev) => (prev === k ? null : k))}
        />
        <FilterRow
          label="Độ khó"
          data={DIFFS.map((d) => ({ key: String(d.key), label: d.label, active: String(diff) === String(d.key) }))}
          onPress={(k) => {
            const found = DIFFS.find((d) => String(d.key) === k)?.key ?? null;
            setDiff((prev) => (String(prev) === k ? null : found));
          }}
        />
        <View style={{ height: 8 }} />
      </View>
    ),
    [insets.top, grade, topic, diff, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: PracticeSet }) => {
      const p = progressMap[item.id];
      const done = p?.done ?? 0;
      const total = p?.total ?? item.questionCount ?? 0;
      const ratio = total > 0 ? Math.min(1, done / total) : 0;

      return (
        <TouchableOpacity
          onPress={() => router.push(`/Practice/Set/${item.id}`)}
          style={{
            backgroundColor: COLORS.card,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.line,
          }}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: 96, height: 96, backgroundColor: '#0F1530' }}>
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="shape-outline" size={28} color={COLORS.sub} />
                </View>
              )}
            </View>

            <View style={{ flex: 1, padding: 12 }}>
              <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Tag text={`Lớp ${item.grade}`} />
                {!!item.topic && <Tag text={item.topic} />}
                {!!item.difficulty && <Tag text={diffLabel(item.difficulty)} tone={diffTone(item.difficulty)} />}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View style={{ height: 6, backgroundColor: COLORS.line, borderRadius: 999, flex: 1, overflow: 'hidden' }}>
                  <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: COLORS.green }} />
                </View>
                <Text style={{ color: COLORS.sub, marginLeft: 8 }}>{done}/{total}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [progressMap, router]
  );

  const keyExtractor = useCallback((it: PracticeSet) => it.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Text style={{ color: COLORS.sub }}>Không có dữ liệu phù hợp bộ lọc.</Text>
              <TouchableOpacity
                onPress={() => {
                  setGrade(null); setTopic(null); setDiff(null);
                }}
                style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.chip, borderRadius: 999 }}
              >
                <Text style={{ color: COLORS.text }}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => fetchPage(false)}
        ListFooterComponent={
          (loading || paging) ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color="#fff" />
            </View>
          ) : !hasMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: COLORS.sub }}>Đã hiển thị tất cả</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

/* ---------- Small Components ---------- */
function QuickButton({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: COLORS.card,
        borderColor: COLORS.line,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={COLORS.text} />
      <Text style={{ color: COLORS.text, marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterRow({
  label,
  data,
  onPress,
}: {
  label: string;
  data: { key: string; label: string; active?: boolean }[];
  onPress: (key: string) => void;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: COLORS.sub, paddingHorizontal: 16, marginBottom: 8 }}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(it) => it.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPress(item.key)}
            style={{
              backgroundColor: item.active ? COLORS.chipActive : COLORS.chip,
              borderColor: COLORS.line,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              marginRight: 8,
            }}
          >
            <Text style={{ color: COLORS.text, fontWeight: item.active ? '700' : '500' }}>{item.label}</Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

function Tag({ text, tone }: { text: string; tone?: 'green' | 'amber' | 'red' }) {
  const bg =
    tone === 'green' ? '#0F2B1A' : tone === 'amber' ? '#2A2108' : tone === 'red' ? '#2B0F13' : COLORS.chip;
  const color =
    tone === 'green' ? COLORS.green : tone === 'amber' ? COLORS.amber : tone === 'red' ? COLORS.red : COLORS.text;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: COLORS.line }}>
      <Text style={{ color, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function diffLabel(d: Difficulty) {
  if (d === 'easy' || d === 1) return 'Dễ';
  if (d === 'medium' || d === 2) return 'Vừa';
  if (d === 'hard' || d === 3) return 'Khó';
  return String(d);
}
function diffTone(d: Difficulty): 'green' | 'amber' | 'red' | undefined {
  if (d === 'easy' || d === 1) return 'green';
  if (d === 'medium' || d === 2) return 'amber';
  if (d === 'hard' || d === 3) return 'red';
  return undefined;
}
