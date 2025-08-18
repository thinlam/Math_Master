import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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

export default function LessonDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [lesson, setLesson] = useState<(LessonDoc & { id: string }) | null>(null);

  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, 'lessons', String(id)));
      if (mounted) {
        const data = snap.exists() ? ({ id: snap.id, ...(snap.data() as LessonDoc) }) : null;
        setLesson(data);
        const init: Record<string, string | null> = {};
        (data?.questions ?? []).forEach(q => { init[q.id] = null; });
        setAnswers(init);
        setSubmitted(false);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

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
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator /><Text style={{ marginTop: 8, color: '#666' }}>Đang tải bài học…</Text>
    </View>;
  }
  if (!lesson) {
    return <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity onPress={() => router.back()}>
        <Ionicons name="close" size={24} color="#2563eb" />
      </TouchableOpacity>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Không tìm thấy bài học</Text>
    </View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#0b0b0c' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40, paddingTop: insets.top + 10 }}
    >
      {/* Back + tiêu đề */}
      <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 8, width: 30 }}>
        <Ionicons name="close" size={28} color="#60a5fa" />
      </TouchableOpacity>

      <Text style={{ color: 'white', fontSize: 22, fontWeight: '800' }}>{lesson.title}</Text>
      <Text style={{ color: '#9aa0a6', marginTop: 6 }}>
        Lớp {lesson.grade ?? '—'} {lesson.unit ? `• ${lesson.unit}` : ''} {lesson.topicType ? `• ${lesson.topicType}` : ''}
      </Text>

      {lesson.content ? <Text style={{ color: '#cbd5e1', marginTop: 12 }}>{lesson.content}</Text> : null}

      {/* Câu hỏi */}
      <View style={{ marginTop: 18 }}>
        <Text style={{ color: 'white', fontSize: 18, fontWeight: '800', marginBottom: 10 }}>
          Câu hỏi ({questions.length})
        </Text>

        <FlatList
          data={questions}
          keyExtractor={(q) => q.id}
          renderItem={({ item, index }) => (
            <QuestionCard
              q={item}
              idx={index + 1}
              selected={answers[item.id]}
              submitted={submitted}
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
            style={{ marginTop: 16, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: 'white', fontWeight: '800' }}>Nộp bài</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#0b0f1a' }}>
            <Text style={{ color: '#cbd5e1' }}>
              Kết quả: <Text style={{ color: '#22c55e', fontWeight: '800' }}>{gainedPoints}</Text> / {totalPoints} điểm
            </Text>
            <TouchableOpacity onPress={() => { setSubmitted(false); setAnswers(Object.fromEntries(questions.map(q => [q.id, null]))); }} style={{ marginTop: 8 }}>
              <Text style={{ color: '#60a5fa' }}>Làm lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/* ---------- Card câu hỏi (MCQ) ---------- */
function QuestionCard({
  q, idx, selected, submitted, onSelect,
}: {
  q: Question; idx: number; selected: string | null; submitted: boolean; onSelect: (optId: string) => void;
}) {
  const isMCQ = q.type === 'mcq' && Array.isArray(q.options);
  return (
    <View style={{ backgroundColor: '#111827', borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', padding: 12 }}>
      <Text style={{ color: '#cbd5e1', marginBottom: 6 }}>
        <Text style={{ color: 'white', fontWeight: '800' }}>Câu {idx}:</Text> {q.prompt}
      </Text>
      {q.hint ? <Text style={{ color: '#9aa0a6', fontStyle: 'italic' }}>Gợi ý: {q.hint}</Text> : null}

      {isMCQ ? (
        <View style={{ marginTop: 10 }}>
          {q.options!.map((op) => {
            const isSelected = selected === op.id;
            const isCorrect = !!op.correct;
            const borderColor =
              submitted && isSelected && !isCorrect ? '#ef4444' :
              submitted && isCorrect ? '#22c55e' : '#1f2937';
            const iconName =
              !submitted ? (isSelected ? 'radio-button-on' : 'radio-button-off') :
              isCorrect ? 'checkmark-circle' :
              isSelected ? 'close-circle' : 'ellipse-outline';
            const iconColor =
              submitted && isCorrect ? '#22c55e' :
              submitted && isSelected && !isCorrect ? '#ef4444' :
              '#9aa0a6';

            return (
              <TouchableOpacity
                key={op.id}
                onPress={() => onSelect(op.id)}
                disabled={submitted}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingVertical: 10, paddingHorizontal: 12,
                  borderRadius: 12, borderWidth: 1, borderColor,
                  backgroundColor: '#0b0f1a', marginBottom: 8,
                  opacity: submitted ? 0.95 : 1,
                }}
              >
                <Ionicons name={iconName as any} size={18} color={iconColor} style={{ marginRight: 8 }} />
                <Text style={{ color: '#cbd5e1' }}>{op.text}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      {submitted && q.solution ? (
        <Text style={{ color: '#86efac', marginTop: 8 }}>Lời giải: {q.solution}</Text>
      ) : null}
    </View>
  );
}
