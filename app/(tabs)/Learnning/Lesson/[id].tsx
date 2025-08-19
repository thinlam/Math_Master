// app/(tabs)/Learnning/Lesson/[id].tsx (hoặc đúng path bạn đang dùng)
import { db } from '@/scripts/firebase';
import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
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

export default function LessonDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<(LessonDoc & { id: string }) | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState(false);

  const fetchLesson = useCallback(async () => {
    setLoading(true);
    const snap = await getDoc(doc(db, 'lessons', String(id)));
    const data = snap.exists() ? ({ id: snap.id, ...(snap.data() as LessonDoc) }) : null;
    setLesson(data);
    const init: Record<string, string | null> = {};
    (data?.questions ?? []).forEach(q => { init[q.id] = null; });
    setAnswers(init);
    setSubmitted(false);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let mounted = true;
    (async () => { if (mounted) await fetchLesson(); })();
    return () => { mounted = false; };
  }, [fetchLesson]);

  const questions = useMemo(() => lesson?.questions ?? [], [lesson?.questions]);

  const totalPoints = useMemo(
    () => questions.reduce((s, q) => s + (q.points ?? 1), 0),
    [questions]
  );
  const gainedPoints = useMemo(() => {
    if (!submitted) return 0;
    return questions.reduce((s, q) => {
      if (q.type !== 'mcq' || !q.options) return s;
      const sel = answers[q.id];
      const ok = q.options.some(o => o.id === sel && o.correct);
      return s + (ok ? (q.points ?? 1) : 0);
    }, 0);
  }, [submitted, questions, answers]);

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
        <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8, width: 30 }}>
          <Ionicons name="close" size={24} color={palette.link} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '700', color: palette.text }}>Không tìm thấy bài học</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, paddingTop: insets.top + 10 }}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />

      {/* Back + tiêu đề */}
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8, width: 30 }}>
        <Ionicons name="close" size={28} color={palette.brandSoft} />
      </TouchableOpacity>

      <Text style={styles.title}>{lesson.title || 'Bài học'}</Text>
      <Text style={[styles.muted, { marginTop: 6 }]}>
        Lớp {lesson.grade ?? '—'} {lesson.unit ? `• ${lesson.unit}` : ''} {lesson.topicType ? `• ${lesson.topicType}` : ''}
      </Text>

      {lesson.content ? <Text style={[styles.body, { marginTop: 12 }]}>{lesson.content}</Text> : null}

      {/* Câu hỏi */}
      <View style={{ marginTop: 18 }}>
        <Text style={styles.sectionTitle}>Câu hỏi ({questions.length})</Text>

        <FlatList
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
                setAnswers((prev) => ({ ...prev, [item.id]: optId }));
              }}
            />
          )}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />

        {!submitted ? (
          <TouchableOpacity
            onPress={() => setSubmitted(true)}
            style={[styles.primaryBtn]}
          >
            <Text style={styles.primaryBtnText}>Nộp bài</Text>
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
              }}
              style={{ marginTop: 8 }}
            >
              <Text style={{ color: palette.link, fontWeight: '600' }}>Làm lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ---------- Card câu hỏi (MCQ) ---------- */
function QuestionCard({
  q, idx, selected, submitted, onSelect, palette,
}: {
  q: Question; idx: number; selected: string | null; submitted: boolean; onSelect: (optId: string) => void; palette: Palette;
}) {
  const isMCQ = q.type === 'mcq' && Array.isArray(q.options);
  return (
    <View style={[cardStyles.card(palette)]}>
      <Text style={[cardStyles.prompt(palette)]}>
        <Text style={{ color: palette.text, fontWeight: '800' }}>Câu {idx}:</Text> {q.prompt}
      </Text>
      {q.hint ? <Text style={{ color: palette.textMuted, fontStyle: 'italic' }}>Gợi ý: {q.hint}</Text> : null}

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
                style={[
                  cardStyles.optionRow(palette),
                  { borderColor, opacity: submitted ? 0.95 : 1 },
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
}

/* ---------- Utils ---------- */
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

/* ---------- Styles theo theme ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg },
    title: { color: p.text, fontSize: 22, fontWeight: '800' },
    body: { color: p.textFaint },
    muted: { color: p.textMuted },
    sectionTitle: { color: p.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },

    primaryBtn: {
      marginTop: 16,
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
};
