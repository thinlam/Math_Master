// app/(main)/Practice/Quick/[id].tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase ---------- */
import { db } from '@/scripts/firebase';
import { doc, getDoc } from 'firebase/firestore';

/* ---------- Types ---------- */
type Option = { id: string; text: string; correct?: boolean };
type Question = { id: string; text: string; options: Option[] };
type QuickDoc = {
  title: string;
  class: number;
  questions: Question[];
};

/* ---------- UI Colors ---------- */
const C = {
  bg: '#0b1220',
  card: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.08)',
  text: 'white',
  sub: 'rgba(255,255,255,0.7)',
  good: '#21d07a',
  bad: '#ff5a5f',
  warn: '#ffb020',
};

/* ---------- Helpers ---------- */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function QuickDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<QuickDoc | null>(null);

  // quiz state
  const [qIndex, setQIndex] = useState(0);
  const [picked, setPicked] = useState<Record<string, string | null>>({}); // questionId -> optionId
  const [locked, setLocked] = useState<Record<string, boolean>>({});       // questionId -> locked after pick
  const [shuffledMap, setShuffledMap] = useState<Record<string, Option[]>>({});
  const [done, setDone] = useState(false);

  // timer
  const startedAtRef = useRef<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timer | null>(null);

  /* ---------- Load quick doc ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'quick_practice', id));
        if (!snap.exists()) {
          Alert.alert('Không tìm thấy', 'Bộ Quick này không tồn tại hoặc đã bị xoá.');
          router.back();
          return;
        }
        const raw = snap.data() as any;
        const questions: Question[] = (raw?.questions || []).map((q: any, idx: number) => ({
          id: q?.id || `q_${idx}`,
          text: String(q?.text ?? ''),
          options: (q?.options || []).map((op: any, j: number) => ({
            id: op?.id || `o_${idx}_${j}`,
            text: String(op?.text ?? ''),
            correct: Boolean(op?.correct),
          })),
        }));
        const docData: QuickDoc = {
          title: String(raw?.title ?? 'Quick Practice'),
          class: Number(raw?.class ?? 0),
          questions,
        };
        if (!mounted) return;
        // shuffle options per-question (không đổi thứ tự câu)
        const map: Record<string, Option[]> = {};
        for (const q of questions) {
          map[q.id] = shuffle(q.options);
        }
        setShuffledMap(map);
        setData(docData);
        setLoading(false);
        // init timer
        startedAtRef.current = Date.now();
        timerRef.current = setInterval(() => {
          setElapsed(prev => prev + 1);
        }, 1000);
      } catch (e: any) {
        console.error(e);
        Alert.alert('Lỗi', e?.message || 'Không thể tải dữ liệu');
        router.back();
      }
    })();
    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const questions = data?.questions || [];
  const current = questions[qIndex];

  const correctCount = useMemo(() => {
    return questions.reduce((acc, q) => {
      const opId = picked[q.id];
      if (!opId) return acc;
      const ops = shuffledMap[q.id] || q.options;
      const chosen = ops.find(o => o.id === opId);
      if (chosen?.correct) return acc + 1;
      return acc;
    }, 0);
  }, [questions, picked, shuffledMap]);

  const allAnswered = useMemo(() => {
    if (!questions.length) return false;
    return questions.every(q => picked[q.id]);
  }, [questions, picked]);

  function onPickOption(q: Question, option: Option) {
    if (locked[q.id]) return; // đã khoá khi chọn rồi
    setPicked(p => ({ ...p, [q.id]: option.id }));
    setLocked(l => ({ ...l, [q.id]: true }));
  }

  function next() {
    if (qIndex < questions.length - 1) setQIndex(i => i + 1);
  }
  function prev() {
    if (qIndex > 0) setQIndex(i => i - 1);
  }
  function finish() {
    setDone(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }
  function retry() {
    // reset toàn bộ lựa chọn & timer
    setPicked({});
    setLocked({});
    setQIndex(0);
    setDone(false);
    setElapsed(0);
    startedAtRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    // reshuffle options mỗi lần làm lại (tuỳ thích)
    if (data) {
      const map: Record<string, Option[]> = {};
      for (const q of data.questions) map[q.id] = shuffle(q.options);
      setShuffledMap(map);
    }
  }

  function formatTime(sec: number) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
    }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!data || !current) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: C.text }}>Không có dữ liệu.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontSize: 16, fontWeight: '600' }}>{data.title}</Text>
          <Text style={{ color: C.sub, fontSize: 12 }}>Lớp {data.class} • {done ? 'Hoàn thành' : 'Đang làm'} • {formatTime(elapsed)}</Text>
        </View>
        <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.card, borderRadius: 8 }}>
          <Text style={{ color: C.text, fontSize: 12 }}>
            {qIndex + 1}/{questions.length}
          </Text>
        </View>
      </View>

      {/* Body */}
      {!done ? (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Câu hỏi */}
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
              Câu {qIndex + 1}
            </Text>
            <Text style={{ color: C.text, fontSize: 16, lineHeight: 22 }}>{current.text}</Text>
          </View>

          {/* Options */}
          <View style={{ marginTop: 12, gap: 10 }}>
            {(shuffledMap[current.id] || current.options).map(op => {
              const selected = picked[current.id] === op.id;
              const showState = locked[current.id]; // chỉ tô màu đúng sai sau khi pick
              const isCorrect = Boolean(op.correct);
              const bg =
                selected && showState
                  ? isCorrect ? 'rgba(33,208,122,0.25)' : 'rgba(255,90,95,0.25)'
                  : 'rgba(255,255,255,0.06)';
              const border =
                selected && showState
                  ? isCorrect ? C.good : C.bad
                  : C.line;

              return (
                <TouchableOpacity
                  key={op.id}
                  disabled={locked[current.id]}
                  onPress={() => onPickOption(current, op)}
                  style={{
                    backgroundColor: bg,
                    borderWidth: 1,
                    borderColor: border,
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: C.text, fontSize: 15 }}>{op.text}</Text>
                  {selected && showState && (
                    <View style={{ position: 'absolute', right: 12, top: 12 }}>
                      <Ionicons
                        name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={isCorrect ? C.good : C.bad}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Điều hướng */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              onPress={prev}
              disabled={qIndex === 0}
              style={{
                flex: 1,
                opacity: qIndex === 0 ? 0.5 : 1,
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}>
              <Text style={{ color: C.text }}>Prev</Text>
            </TouchableOpacity>

            {qIndex < questions.length - 1 ? (
              <TouchableOpacity
                onPress={next}
                style={{
                  flex: 1,
                  backgroundColor: C.card,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                }}>
                <Text style={{ color: C.text }}>Next</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  if (!allAnswered) {
                    Alert.alert('Chưa trả lời hết', 'Bạn vẫn muốn nộp bài?', [
                      { text: 'Tiếp tục làm' },
                      { text: 'Vẫn nộp', style: 'destructive', onPress: finish },
                    ]);
                  } else {
                    finish();
                  }
                }}
                style={{
                  flex: 1,
                  backgroundColor: C.good,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: 'center',
                }}>
                <Text style={{ color: 'black', fontWeight: '700' }}>Nộp bài</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      ) : (
        // Kết quả
        <View style={{ flex: 1, padding: 16 }}>
          <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
              Kết quả
            </Text>
            <Text style={{ color: C.sub, fontSize: 14, marginBottom: 2 }}>
              Lớp {data.class} • {questions.length} câu • Thời gian: {formatTime(elapsed)}
            </Text>
            <Text style={{ color: C.text, fontSize: 32, fontWeight: '800', marginTop: 6 }}>
              {correctCount} / {questions.length}
            </Text>
          </View>

          {/* Review nhanh: list câu với trạng thái */}
          <ScrollView style={{ flex: 1 }}>
            {questions.map((q, idx) => {
              const selId = picked[q.id];
              const ops = shuffledMap[q.id] || q.options;
              const sel = ops.find(o => o.id === selId);
              const correct = ops.find(o => o.correct);
              const ok = sel?.id && sel?.id === correct?.id;
              return (
                <TouchableOpacity
                  key={q.id}
                  onPress={() => { setDone(false); setQIndex(idx); }}
                  style={{
                    borderWidth: 1,
                    borderColor: C.line,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 10,
                    backgroundColor: 'rgba(255,255,255,0.03)',
                  }}
                >
                  <Text style={{ color: C.sub, fontSize: 12, marginBottom: 4 }}>Câu {idx + 1}</Text>
                  <Text style={{ color: C.text, fontSize: 15, marginBottom: 6 }}>{q.text}</Text>
                  <Text style={{ color: ok ? C.good : C.bad, fontWeight: '600' }}>
                    {ok ? 'Đúng' : 'Sai'}
                  </Text>
                  <Text style={{ color: C.sub, marginTop: 4 }}>
                    Đã chọn: {sel?.text ?? '—'}
                    {'\n'}
                    Đáp án đúng: {correct?.text ?? '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
            <TouchableOpacity
              onPress={retry}
              style={{
                flex: 1,
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}>
              <Text style={{ color: C.text }}>Làm lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                flex: 1,
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 14,
                alignItems: 'center',
              }}>
              <Text style={{ color: C.text }}>Về danh sách</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
