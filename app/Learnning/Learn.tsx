// app/(tabs)/Learning/Learn.tsx
import { db } from '@/scripts/firebase';
import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

type Lesson = {
  id: string;
  title: string;
  grade: number;
  unit?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | number | string;
  questionCount?: number;
  coverUrl?: string | null;
  updatedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
};

function mapLesson(d: DocumentData, id: string): Lesson {
  const coverUrl = d.coverUrl ?? d.coverImage ?? null;
  const questionCount = Array.isArray(d.questions) ? d.questions.length : d.questionCount ?? 0;
  const updatedAt: Timestamp | null = d.updatedAt ?? d.createdAt ?? null;
  return {
    id,
    title: d.title ?? d.name ?? 'Bài học',
    grade: Number(d.grade) || 0,
    unit: d.unit,
    difficulty: d.difficulty,
    questionCount,
    coverUrl,
    updatedAt,
    createdAt: d.createdAt ?? null,
  };
}

const PAGE_SIZE = 12;

export default function LearnScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [grade, setGrade] = useState<number | null>(null);
  const [items, setItems] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  // ✅ đọc lớp từ AsyncStorage khi màn hình focus
  const resolveGrade = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('selectedGrade');
      const g = stored ? Number(stored) : NaN;
      setGrade(!Number.isNaN(g) && g >= 1 && g <= 12 ? g : 1);
    } catch {
      setGrade(1);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      resolveGrade();
    }, [resolveGrade])
  );

  const baseQuery = useMemo(() => {
    if (grade == null) return null;
    return query(
      collection(db, 'lessons'),
      where('grade', '==', grade),
      orderBy('updatedAt', 'desc'),
      limit(PAGE_SIZE)
    );
  }, [grade]);

  const fetchFirstPage = useCallback(async () => {
    if (!baseQuery) return;
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    try {
      const snap = await getDocs(baseQuery);
      const nextItems: Lesson[] = [];
      snap.forEach((d) => nextItems.push(mapLesson(d.data(), d.id)));
      setItems(nextItems);
      setHasMore(snap.size === PAGE_SIZE);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    } catch (e: any) {
      console.log(e);
      Alert.alert('Lỗi tải bài học', e?.message ?? 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  }, [baseQuery]);

  const fetchNextPage = useCallback(async () => {
    if (!hasMore || !lastDocRef.current || grade == null) return;
    try {
      const q2 = query(
        collection(db, 'lessons'),
        where('grade', '==', grade),
        orderBy('updatedAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q2);
      const nextItems: Lesson[] = [];
      snap.forEach((d) => nextItems.push(mapLesson(d.data(), d.id)));
      setItems((prev) => [...prev, ...nextItems]);
      setHasMore(snap.size === PAGE_SIZE);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? lastDocRef.current;
    } catch (e) {
      console.log(e);
    }
  }, [grade, hasMore]);

  useEffect(() => {
    if (grade == null) return;
    setItems([]);
    setHasMore(true);
    lastDocRef.current = null;
    fetchFirstPage();
  }, [grade, fetchFirstPage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirstPage();
    setRefreshing(false);
  }, [fetchFirstPage]);

  const onPressLesson = useCallback(
    (it: Lesson) => {
      router.push(`/(tabs)/Learnning/Lesson/${it.id}`);
    },
    [router]
  );

  const handleClose = useCallback(() => {
    // @ts-ignore
    if (router.canGoBack?.()) router.back();
    else router.push('/(tabs)');
  }, [router]);

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, StatusBar.currentHeight ?? 0) }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />

      {/* Header */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.headerIconBtn}
        >
          <Ionicons name="close" size={26} color={palette.brandSoft} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Học theo lớp</Text>
          <Text style={styles.headerSub}>
            {grade == null ? 'Đang xác định lớp…' : `Lớp ${grade} • Bắt đầu luyện tập`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/(tabs)')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.changeBtn}
        >
          <Text style={styles.changeBtnText}>Đổi lớp</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {grade == null || loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>
            {grade == null ? 'Đang tải lớp…' : 'Đang tải bài học…'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />}
          onEndReachedThreshold={0.4}
          onEndReached={fetchNextPage}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="cloud-offline-outline" size={36} color={palette.ionMuted} />
              <Text style={[styles.emptyTitle]}>Chưa có bài cho lớp này</Text>
              <Text style={[styles.emptySub, { textAlign: 'center' }]}>
                Vui lòng quay lại trang chủ để đổi lớp khác hoặc kéo để làm mới.
              </Text>
            </View>
          }
          renderItem={({ item }) => <LessonCard lesson={item} onPress={() => onPressLesson(item)} palette={palette} />}
          ListFooterComponent={
            hasMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function LessonCard({
  lesson,
  onPress,
  palette,
}: {
  lesson: Lesson;
  onPress: () => void;
  palette: Palette;
}) {
  const diffLabel = React.useMemo(() => {
    const d = lesson.difficulty;
    if (d === 'easy' || d === 1) return 'Dễ';
    if (d === 'medium' || d === 2) return 'Trung bình';
    if (d === 'hard' || d === 3) return 'Khó';
    return typeof d === 'string' ? d : '—';
  }, [lesson.difficulty]);

  const updated = lesson.updatedAt?.toDate ? lesson.updatedAt.toDate() : null;

  return (
    <TouchableOpacity onPress={onPress} style={[cardStyles.card(palette)]} activeOpacity={0.8}>
      <View style={{ flexDirection: 'row' }}>
        <View style={cardStyles.thumb(palette)}>
          {lesson.coverUrl ? (
            <Image source={{ uri: lesson.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="school-outline" size={28} color={palette.ionMuted} />
            </View>
          )}
        </View>

        <View style={{ flex: 1, marginLeft: 12, justifyContent: 'space-between' }}>
          <View>
            <Text numberOfLines={2} style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>
              {lesson.title}
            </Text>
            <Text style={{ color: palette.textMuted, marginTop: 4 }}>
              Lớp {lesson.grade} {lesson.unit ? `• ${lesson.unit}` : ''}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <Badge icon="barbell-outline" label={`Độ khó: ${diffLabel}`} palette={palette} />
            <View style={{ width: 8 }} />
            <Badge icon="help-circle-outline" label={`${lesson.questionCount ?? 0} câu`} palette={palette} />
            {updated ? (
              <>
                <View style={{ width: 8 }} />
                <Badge icon="time-outline" label={fmtDate(updated)} palette={palette} />
              </>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function Badge({
  icon,
  label,
  palette,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  palette: Palette;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.pillBg,
        borderRadius: 999,
        paddingHorizontal: 10,
        height: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.pillBorder,
      }}
    >
      <Ionicons name={icon} size={14} color={palette.ionMuted} style={{ marginRight: 6 }} />
      <Text style={{ color: palette.textFaint, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

function fmtDate(d: Date) {
  try {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return '';
  }
}

/* ---------------- Styles ---------------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },
    headerRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: p.bg,
    },
    headerIconBtn: { padding: 4, marginRight: 8 },
    headerTitle: { color: p.text, fontSize: 22, fontWeight: '700' },
    headerSub: { color: p.textMuted, marginTop: 4 },
    changeBtn: {
      paddingHorizontal: 10,
      height: 30,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.cardBorder,
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    changeBtnText: { color: p.textFaint, fontSize: 12, fontWeight: '600' },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { color: p.textMuted, marginTop: 8 },

    emptyTitle: { color: p.text, fontSize: 16, marginTop: 6, fontWeight: '600' },
    emptySub: { color: p.textMuted, marginTop: 4 },
  });
}

const cardStyles = {
  card: (p: Palette) =>
    ({
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: p.cardBorder,
    } as const),
  thumb: (p: Palette) =>
    ({
      width: 88,
      height: 88,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: p.bg,
      borderWidth: 1,
      borderColor: p.cardBorder,
    } as const),
};
