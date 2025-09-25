// app/(tabs)/Learnning/Lesson/[id].tsx
import { db } from '@/scripts/firebase';
import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Option = { id: string; text: string; correct?: boolean };
type Question = {
  id: string;
  prompt: string;
  hint?: string;
  options?: Option[];
  points?: number;
  level?: number;
  type?: 'mcq' | string;
  solution?: string;
};
type LessonDoc = {
  title?: string; grade?: number; unit?: string; topicType?: string;
  difficulty?: string | number; timeLimitMin?: number;
  book?: { name?: string; edition?: string } | null;
  chapter?: string; content?: string; tags?: string[];
  questions?: Question[]; createdAt?: Timestamp | null; updatedAt?: Timestamp | null;
};

const SUCCESS = '#10B981';
const STORAGE_KEY = (id: string) => `lessonProgress:${id}`;

/* ============ Helpers ============ */
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
function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============ Screen ============ */
export default function LessonDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lesson, setLesson] = useState<(LessonDoc & { id: string }) | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState(false);

  // Timer
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const timerRef = useRef<any>(null);

  const questions = useMemo(() => lesson?.questions ?? [], [lesson?.questions]);

  const totalPoints = useMemo(
    () => questions.reduce((s, q) => s + (q.points ?? 1), 0),
    [questions]
  );
  const gainedPoints = useMemo(() => {
    return questions.reduce((s, q) => {
      if (q.type !== 'mcq' || !q.options) return s;
      const sel = answers[q.id];
      const ok = q.options.some(o => o.id === sel && o.correct);
      return s + (ok ? (q.points ?? 1) : 0);
    }, 0);
  }, [questions, answers]);

  const completedCount = useMemo(
    () => questions.filter(q => answers[q.id] != null).length,
    [questions, answers]
  );

  const canSubmit = useMemo(
    () => questions.length > 0 && completedCount === questions.length && !submitted,
    [questions.length, completedCount, submitted]
  );

  const saveProgress = useCallback(async (lessonId: string, data: any) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY(lessonId), JSON.stringify(data));
    } catch {}
  }, []);

  const loadProgress = useCallback(async (lessonId: string) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY(lessonId));
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const applyTimer = useCallback((min?: number | null) => {
    if (!min || min <= 0) {
      setSecondsLeft(null);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    setSecondsLeft(Math.max(0, Math.round(min * 60)));
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev == null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          // Auto submit when time’s up
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const fetchLesson = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'lessons', String(id)));
      const data = snap.exists() ? ({ id: snap.id, ...(snap.data() as LessonDoc) }) : null;

      // Optional: shuffle options (toggle true/false nếu muốn)
      const SHUFFLE_OPTIONS = true;
      if (data?.questions && SHUFFLE_OPTIONS) {
        data.questions = data.questions.map(q =>
          q.type === 'mcq' && Array.isArray(q.options)
            ? { ...q, options: shuffle(q.options!) }
            : q
        );
      }

      setLesson(data);

      // init answers
      const init: Record<string, string | null> = {};
      (data?.questions ?? []).forEach(q => { init[q.id] = null; });

      // try load saved progress
      const saved = data ? await loadProgress(data.id) : null;
      if (saved && saved.answers) {
        setAnswers(saved.answers);
        setSubmitted(!!saved.submitted);
        setSecondsLeft(saved.secondsLeft ?? null);
        // resume timer only if not submitted
        if (!saved.submitted && typeof saved.secondsLeft === 'number') {
          if (timerRef.current) clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setSecondsLeft(prev => {
              if (prev == null) return null;
              if (prev <= 1) {
                clearInterval(timerRef.current!);
                timerRef.current = null;
                setSubmitted(true);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }
      } else {
        setAnswers(init);
        setSubmitted(false);
        applyTimer(data?.timeLimitMin ?? null);
      }
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được bài học.');
    } finally {
      setLoading(false);
    }
  }, [id, loadProgress, applyTimer]);

  useEffect(() => {
    let mounted = true;
    (async () => { if (mounted) await fetchLesson(); })();
    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchLesson]);

  // persist on every important change
  useEffect(() => {
    if (!lesson) return;
    void saveProgress(lesson.id, { answers, submitted, secondsLeft });
  }, [answers, submitted, secondsLeft, lesson, saveProgress]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLesson();
    setRefreshing(false);
  }, [fetchLesson]);

  const timeLabel = useMemo(() => {
    if (secondsLeft == null) return null;
    const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
    const ss = String(secondsLeft % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [secondsLeft]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <ActivityIndicator color={palette.ionMuted} />
        <Text style={[styles.muted, { marginTop: 8 }]}>Đang tải bài học…</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.replace('/Learnning/Learn')} style={{ marginBottom: 8, width: 30 }}>
          <Ionicons name="close" size={28} color={palette.brandSoft} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: palette.text }}>Không tìm thấy bài học</Text>
      </View>
    );
  }

  const updated =
    lesson.updatedAt instanceof Timestamp
      ? lesson.updatedAt.toDate()
      : typeof lesson.updatedAt === 'object' && lesson.updatedAt
      ? (lesson.updatedAt as any)?.toDate?.() ?? null
      : null;

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
      <FlatList
        ListHeaderComponent={
          <View style={{ padding: 16, paddingTop: insets.top + 10 }}>
            {/* Back */}
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8, width: 30 }}>
              <Ionicons name="close" size={28} color={palette.brandSoft} />
            </TouchableOpacity>

            {/* Title + meta */}
            <Text style={styles.title}>{lesson.title || 'Bài học'}</Text>
            <Text style={[styles.muted, { marginTop: 6 }]}>
              Lớp {lesson.grade ?? '—'} {lesson.unit ? `• ${lesson.unit}` : ''} {lesson.topicType ? `• ${lesson.topicType}` : ''}
              {updated ? ` • cập nhật ${fmtDate(updated)}` : ''}
            </Text>

            {lesson.content ? <Text style={[styles.body, { marginTop: 10 }]}>{lesson.content}</Text> : null}

            {/* Progress bar + timer */}
            <View style={{ marginTop: 14 }}>
              <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { width: `${questions.length ? (completedCount / questions.length) * 100 : 0}%` }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                <Text style={styles.muted}>{completedCount}/{questions.length} câu</Text>
                {timeLabel ? (
                  <Text style={[styles.muted, { fontWeight: '800' }]}>
                    <Ionicons name="timer-outline" size={14} color={palette.textMuted} /> {timeLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Câu hỏi ({questions.length})</Text>
          </View>
        }
        data={questions}
        keyExtractor={(q) => q.id}
        renderItem={({ item, index }) => (
          <QuestionCard
            q={item}
            idx={index + 1}
            selected={answers[item.id]}
            submitted={submitted}
            palette={palette}
            onSelect={(optId) => {
              if (submitted) return;
              setAnswers((prev) => ({ ...prev, [item.id]: prev[item.id] === optId ? null : optId }));
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        ListFooterComponent={
          <View style={{ paddingTop: 10, paddingBottom: 20 }}>
            {!submitted ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Nộp bài"
                onPress={() => setSubmitted(true)}
                style={[styles.primaryBtn, !canSubmit && { opacity: 0.6 }]}
                disabled={!canSubmit}
              >
                <Text style={styles.primaryBtnText}>
                  Nộp bài {gainedPoints ? `• ${gainedPoints}/${totalPoints}` : ''}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.resultCard}>
                <Text style={styles.body}>
                  Kết quả: <Text style={{ color: SUCCESS, fontWeight: '800' }}>{gainedPoints}</Text> / {totalPoints} điểm
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setSubmitted(false);
                    setAnswers(Object.fromEntries(questions.map(q => [q.id, null])));
                    applyTimer(lesson.timeLimitMin ?? null);
                  }}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ color: palette.link, fontWeight: '600' }}>Làm lại</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.ionMuted}
          />
        }
      />
    </View>
  );
}

/* ---------- Card câu hỏi (MCQ) ---------- */
const QuestionCard = React.memo(function QuestionCard({
  q, idx, selected, submitted, onSelect, palette,
}: {
  q: Question; idx: number; selected: string | null; submitted: boolean; onSelect: (optId: string) => void; palette: Palette;
}) {
  const isMCQ = q.type === 'mcq' && Array.isArray(q.options);
  return (
    <View style={[cardStyles.card(palette)]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Text style={[cardStyles.prompt(palette)]}>
          <Text style={{ color: palette.text, fontWeight: '800' }}>Câu {idx}:</Text> {q.prompt}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {typeof q.points === 'number' ? (
            <View style={[cardStyles.badge(palette)]}>
              <Ionicons name="trophy-outline" size={12} color={palette.textMuted} />
              <Text style={cardStyles.badgeText(palette)}>{q.points}</Text>
            </View>
          ) : null}
          {typeof q.level === 'number' ? (
            <View style={[cardStyles.badge(palette), { marginLeft: 6 }]}>
              <Ionicons name="barbell-outline" size={12} color={palette.textMuted} />
              <Text style={cardStyles.badgeText(palette)}>Lv {q.level}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {q.hint ? <Text style={{ color: palette.textMuted, fontStyle: 'italic', marginTop: 2 }}>Gợi ý: {q.hint}</Text> : null}

      {isMCQ ? (
        <View style={{ marginTop: 10 }}>
          {q.options!.map((op) => {
            const isSelected = selected === op.id;
            const isCorrect = !!op.correct;
            const borderColor =
              submitted && isSelected && !isCorrect ? palette.danger :
              submitted && isCorrect ? SUCCESS : palette.cardBorder;
            const iconName =
              !submitted ? (isSelected ? 'radio-button-on' : 'radio-button-off') :
              isCorrect ? 'checkmark-circle' :
              isSelected ? 'close-circle' : 'ellipse-outline';
            const iconColor =
              submitted && isCorrect ? SUCCESS :
              submitted && isSelected && !isCorrect ? palette.danger :
              palette.ionMuted;

            return (
              <TouchableOpacity
                key={op.id}
                onPress={() => onSelect(op.id)}
                disabled={submitted}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: submitted }}
                accessibilityLabel={`Đáp án: ${op.text}`}
                style={[
                  cardStyles.optionRow(palette),
                  {
                    borderColor,
                    opacity: submitted ? 0.95 : 1,
                    backgroundColor: isSelected && !submitted ? palette.pillBgActive ?? palette.pillBg : palette.pillBg,
                  },
                ]}
              >
                <Ionicons name={iconName as any} size={18} color={iconColor} style={{ marginRight: 8 }} />
                <Text style={{ color: palette.textFaint }}>{op.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {submitted && q.solution ? (
        <Text style={{ color: SUCCESS, marginTop: 8 }}>Lời giải: {q.solution}</Text>
      ) : null}
    </View>
  );
});

/* ---------- Styles theo theme ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg },
    title: { color: p.text, fontSize: 22, fontWeight: '800' },
    body: { color: p.textFaint },
    muted: { color: p.textMuted },
    sectionTitle: { color: p.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },

    progressWrap: {
      height: 8,
      backgroundColor: p.pillBg,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    progressBar: {
      height: 8,
      backgroundColor: p.brand,
    },

    primaryBtn: {
      marginTop: 8,
      backgroundColor: p.brand,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: p.editBtnText, fontWeight: '800' },

    resultCard: {
      marginTop: 14,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.card,
    },
  });
}

const cardStyles = {
  card: (p: Palette) =>
    ({
      backgroundColor: p.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.cardBorder,
      padding: 12,
    } as const),
  prompt: (p: Palette) =>
    ({
      color: p.textFaint,
      marginBottom: 6,
      flex: 1,
      paddingRight: 6,
    } as const),
  optionRow: (p: Palette) =>
    ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      backgroundColor: p.pillBg,
      marginBottom: 8,
    } as const),
  badge: (p: Palette) =>
    ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      height: 22,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.pillBg,
    } as const),
  badgeText: (p: Palette) =>
    ({
      color: p.textMuted,
      marginLeft: 4,
      fontSize: 12,
      fontWeight: '700',
    } as const),
};
