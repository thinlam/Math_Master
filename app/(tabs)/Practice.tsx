// app/(tabs)/Practice.tsx
import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
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
type TopicKey = 'add_sub' | 'mul_div' | 'geometry' | 'algebra' | 'numberSense';
type DifficultyKey = 'easy' | 'medium' | 'hard';
type Difficulty = DifficultyKey;

type PracticeSet = {
  id: string;
  title: string;
  grade: number;
  topic?: TopicKey | string;
  difficulty?: Difficulty;
  questionCount?: number;
  coverUrl?: string;
  published: boolean;
  updatedAt?: Timestamp | null;
};

type ProgressDoc = { done?: number; total?: number };

/* ---------- Const ---------- */
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'add_sub',     label: 'Cộng trừ' },
  { key: 'mul_div',     label: 'Nhân chia' },
  { key: 'geometry',    label: 'Hình học' },
  { key: 'algebra',     label: 'Đại số' },
  { key: 'numberSense', label: 'Số học' },
];
const DIFFS: { key: DifficultyKey; label: string }[] = [
  { key: 'easy',   label: 'Dễ' },
  { key: 'medium', label: 'Vừa' },
  { key: 'hard',   label: 'Khó' },
];

/* Màu “tone” riêng cho tag độ khó */
const TONE = { green: '#22C55E', amber: '#F59E0B', red: '#EF4444' };
const TONE_BG = { green: '#0F2B1A', amber: '#2A2108', red: '#2B0F13' };

/* ---------- Main Component ---------- */
export default function PracticeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  /* ---------- Filters ---------- */
  const [grade, setGrade] = useState<number | null>(null);
  const [topic, setTopic] = useState<TopicKey | null>(null);
  const [diff, setDiff] = useState<DifficultyKey | null>(null);

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
    const base: any[] = [where('published', '==', true)];
    if (grade !== null) base.push(where('grade', '==', grade));
    if (topic) base.push(where('topic', '==', topic));             // topic là KEY
    if (diff) base.push(where('difficulty', '==', diff));          // diff là string: 'easy'|'medium'|'hard'
    // ORDER: phải khớp index (updatedAt desc, __name__ sẽ tự thêm khi phân trang)
    return query(colRef, ...base, orderBy('updatedAt', 'desc'), limit(pageSize));
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
        if (!first && lastSnapRef.current) q = query(q, startAfter(lastSnapRef.current));

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

        if (first) setItems(rows);
        else setItems((prev) => [...prev, ...rows]);

        if (snap.docs.length < pageSize) setHasMore(false);
        else lastSnapRef.current = snap.docs[snap.docs.length - 1] ?? null;

        // progress
        const uid = auth.currentUser?.uid;
        if (uid && rows.length) {
          const entries = await Promise.all(
            rows.map(async (it) => {
              const pRef = doc(db, 'users', uid, 'progress', it.id);
              const pSnap = await getDoc(pRef);
              return [it.id, pSnap.exists() ? (pSnap.data() as ProgressDoc) : { done: 0, total: it.questionCount ?? 0 }] as const;
            })
          );
          setProgressMap((prev) => {
            const copy = { ...prev };
            for (const [k, v] of entries) copy[k] = v;
            return copy;
          });
        }
      } catch (e) {
        console.error('[Practice] fetchPage error:', e);
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
      <View style={[styles.headerWrap, { paddingTop: insets.top + 8 }]}>
        <StatusBar
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={palette.bg}
        />
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Luyện tập</Text>
          <Text style={styles.headerSub}>Chọn bộ bài theo lớp, chủ đề và độ khó.</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickRow}>
          <QuickButton
            icon="flash-outline"
            label="Luyện nhanh"
            onPress={() =>
              router.push({
                pathname: '/Practice/Quick',
                params: {
                  grade: grade ?? '',
                  topic: topic ?? '',
                  difficulty: diff ?? '',
                },
              })
            }
            palette={palette}
          />
          <QuickButton
            icon="timer-outline"
            label="Thi tốc độ"
            onPress={() =>
              router.push({
                pathname: '/Practice/Speed',
                params: {
                  grade: grade ?? '',
                  topic: topic ?? '',
                  difficulty: diff ?? '',
                },
              })
            }
            palette={palette}
          />
          <QuickButton
            icon="calendar-outline"
            label="Thử thách ngày"
            onPress={() =>
              router.push({
                pathname: '/Practice/Daily',
                params: {
                  grade: grade ?? '',
                  topic: topic ?? '',
                  difficulty: diff ?? '',
                },
              })
            }
            palette={palette}
          />
        </View>

        {/* Filters */}
        <FilterRow
          label="Lớp"
          data={GRADES.map((g) => ({ key: String(g), label: `Lớp ${g}`, active: grade === g }))}
          onPress={(k) => setGrade((prev) => (prev === Number(k) ? null : Number(k)))}
          palette={palette}
        />
        <FilterRow
          label="Chủ đề"
          data={TOPICS.map((t) => ({ key: t.key, label: t.label, active: topic === t.key }))}
          onPress={(k) => setTopic((prev) => (prev === (k as TopicKey) ? null : (k as TopicKey)))}
          palette={palette}
        />
        <FilterRow
          label="Độ khó"
          data={DIFFS.map((d) => ({ key: d.key, label: d.label, active: diff === d.key }))}
          onPress={(k) => {
            const found = DIFFS.find((d) => d.key === (k as DifficultyKey))?.key ?? null;
            setDiff((prev) => (prev === found ? null : found));
          }}
          palette={palette}
        />
        <View style={{ height: 8 }} />
      </View>
    ),
    [insets.top, grade, topic, diff, router, styles, palette, colorScheme]
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
          style={styles.card}
          activeOpacity={0.85}
        >
          <View style={{ flexDirection: 'row' }}>
            <View style={styles.cover}>
              {item.coverUrl ? (
                <Image source={{ uri: item.coverUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name="shape-outline" size={28} color={palette.textMuted} />
                </View>
              )}
            </View>

            <View style={{ flex: 1, padding: 12 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Tag text={`Lớp ${item.grade}`} palette={palette} />
                {!!item.topic && (
                  <Tag
                    text={TOPICS.find(t => t.key === item.topic)?.label ?? String(item.topic)}
                    palette={palette}
                  />
                )}
                {!!item.difficulty && (
                  <Tag
                    text={diffLabel(item.difficulty)}
                    tone={diffTone(item.difficulty)}
                    palette={palette}
                  />
                )}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                <View style={{ height: 6, backgroundColor: palette.cardBorder, borderRadius: 999, flex: 1, overflow: 'hidden' }}>
                  <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: TONE.green }} />
                </View>
                <Text style={{ color: palette.textMuted, marginLeft: 8 }}>{done}/{total}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [progressMap, router, styles, palette]
  );

  const keyExtractor = useCallback((it: PracticeSet) => it.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !loading && (
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              <Text style={{ color: palette.textMuted }}>Không có dữ liệu phù hợp bộ lọc.</Text>
              <TouchableOpacity
                onPress={() => { setGrade(null); setTopic(null); setDiff(null); }}
                style={{ marginTop: 12, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: palette.pillBg, borderColor: palette.pillBorder, borderWidth: 1, borderRadius: 999 }}
              >
                <Text style={{ color: palette.text }}>Xóa bộ lọc</Text>
              </TouchableOpacity>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />
        }
        onEndReachedThreshold={0.4}
        onEndReached={() => fetchPage(false)}
        ListFooterComponent={
          (loading || paging) ? (
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={palette.ionMuted} />
            </View>
          ) : !hasMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text style={{ color: palette.textMuted }}>Đã hiển thị tất cả</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

/* ---------- Small Components ---------- */
function QuickButton({
  icon,
  label,
  onPress,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  palette: Palette;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: palette.card,
        borderColor: palette.cardBorder,
        borderWidth: 1,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={palette.text} />
      <Text style={{ color: palette.text, marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterRow({
  label,
  data,
  onPress,
  palette,
}: {
  label: string;
  data: { key: string; label: string; active?: boolean }[];
  onPress: (key: string) => void;
  palette: Palette;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: palette.textMuted, paddingHorizontal: 16, marginBottom: 8 }}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(it) => it.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPress(item.key)}
            style={{
              backgroundColor: item.active ? palette.brand : palette.pillBg,
              borderColor: palette.pillBorder,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              marginRight: 8,
            }}
          >
            <Text
              style={{
                color: item.active ? '#FFFFFF' : palette.textFaint,
                fontWeight: item.active ? '700' : '500',
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}

function Tag({
  text,
  tone,
  palette,
}: {
  text: string;
  tone?: 'green' | 'amber' | 'red';
  palette: Palette;
}) {
  const bg = tone ? TONE_BG[tone] : palette.pillBg;
  const color = tone ? TONE[tone] : palette.text;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: palette.cardBorder }}>
      <Text style={{ color, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function diffLabel(d: Difficulty) {
  if (d === 'easy') return 'Dễ';
  if (d === 'medium') return 'Vừa';
  if (d === 'hard') return 'Khó';
  return String(d);
}
function diffTone(d: Difficulty): 'green' | 'amber' | 'red' | undefined {
  if (d === 'easy') return 'green';
  if (d === 'medium') return 'amber';
  if (d === 'hard') return 'red';
  return undefined;
}

/* ---------- Styles ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    headerWrap: { backgroundColor: p.bg },
    headerTextWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    headerTitle: { color: p.text, fontSize: 22, fontWeight: '700' },
    headerSub: { color: p.textMuted, marginTop: 4 },
    quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 8 },

    card: {
      backgroundColor: p.card,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    cover: { width: 96, height: 96, backgroundColor: p.cardBorder },

    cardTitle: { color: p.text, fontSize: 16, fontWeight: '700' },
  });
}
