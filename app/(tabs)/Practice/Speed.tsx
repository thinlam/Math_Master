// app/(tabs)/Practice/Speed.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* Theme */
import { useTheme } from '@/theme/ThemeProvider';

/* Firebase */
import { auth, db } from '@/scripts/firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

/* ---------- Types ---------- */
type QType = 'numeric' | 'mcq';
type PoolQ = {
  id: string;
  grade: number;
  qType: QType;
  text: string;
  // numeric:
  answer?: number | string;
  // mcq:
  choices?: string[];
  correctIndex?: number;
  // optional meta:
  timeMs?: number;
};

type LeaderRow = {
  id: string;
  uid: string;
  name: string;
  score: number;
  timeMs: number;
  correct: number;
  total: number;
  createdAt?: any;
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const ROUND_MS = 60_000;

/* ---------- Text wrappers: luôn sáng ---------- */
type TxtProps = React.ComponentProps<typeof Text>;
function Txt({ style, ...rest }: TxtProps) {
  const { palette } = useTheme();
  return <Text {...rest} style={[{ color: palette.text }, style]} />;
}
function TxtDim({ style, ...rest }: TxtProps) {
  const { palette } = useTheme();
  // dùng textDim từ theme cho đồng nhất dark mode
  return <Text {...rest} style={[{ color: palette.textDim }, style]} />;
}

/* ---------- Small UI ---------- */
function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'success' | 'danger' | 'muted';
  disabled?: boolean;
  style?: any;
}) {
  const { palette } = useTheme();
  const map: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: palette.primary, fg: '#fff' },
    success: { bg: palette.success, fg: '#fff' },
    danger: { bg: palette.danger, fg: '#fff' },
    muted: { bg: 'rgba(255,255,255,0.08)', fg: palette.text, border: 'rgba(255,255,255,0.15)' },
  };
  const c = map[tone];
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[
        {
          backgroundColor: c.bg,
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          opacity: disabled ? 0.6 : 1,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
        },
        style,
      ]}
    >
      <Text style={{ color: c.fg, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}
function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: selected ? palette.primary : 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: selected ? palette.primary : 'rgba(255,255,255,0.16)',
      }}
    >
      <Text style={{ color: selected ? '#fff' : palette.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/* ---------- Screen ---------- */
export default function Speed() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  // Grade filter
  const [grade, setGrade] = useState<number>(1);

  // Pool (câu hỏi lấy từ DB hoặc fallback)
  const [pool, setPool] = useState<PoolQ[]>([]);
  const [poolLoading, setPoolLoading] = useState(true);

  // Gameplay
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const [input, setInput] = useState('');             // cho numeric
  const [current, setCurrent] = useState<PoolQ | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null); // cho mcq

  const [streak, setStreak] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  // Leaderboard
  const [submitting, setSubmitting] = useState(false);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [leader, setLeader] = useState<LeaderRow[]>([]);

  // ---------- Pool loader ----------
  const fetchPool = useCallback(async (g: number) => {
    setPoolLoading(true);
    try {
      const qy = query(
        collection(db, 'speed_questions'),
        where('grade', '==', g),
        orderBy('createdAt', 'desc'),
        limit(120)
      );
      const snap = await getDocs(qy);
      let arr: PoolQ[] = [];
      snap.forEach(d => {
        const data: any = d.data();
        arr.push({
          id: d.id,
          grade: data.grade,
          qType: (data.qType ?? 'numeric') as QType,
          text: String(data.text ?? ''),
          answer: data.answer,
          choices: data.choices,
          correctIndex: data.correctIndex,
          timeMs: data.timeMs,
        });
      });
      if (arr.length === 0) {
        // Không có đề trong DB -> gen fallback theo lớp
        arr = genFallbackForGrade(g, 40);
      }
      setPool(arr);
    } catch (e: any) {
      // Có thể là lỗi index. Vẫn fallback để user chơi được.
      setPool(genFallbackForGrade(g, 40));
    } finally {
      setPoolLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPool(grade);
  }, [fetchPool, grade]);

  // ---------- Timer ----------
  useEffect(() => {
    if (!playing) return;
    const i = setInterval(() => setTimeLeft(prev => (prev <= 0 ? 0 : prev - 100)), 100);
    return () => clearInterval(i);
  }, [playing]);

  useEffect(() => {
    if (playing && timeLeft <= 0) {
      setPlaying(false);
      Keyboard.dismiss();
    }
  }, [timeLeft, playing]);

  // ---------- Leaderboard ----------
  const fetchLeader = useCallback(async () => {
    try {
      setLoadingBoard(true);
      const qy = query(
        collection(db, 'speed_leaderboard'),
        orderBy('score', 'desc'),
        orderBy('timeMs', 'asc'),
        limit(20)
      );
      const snap = await getDocs(qy);
      const rows: LeaderRow[] = [];
      snap.forEach(d => rows.push({ id: d.id, ...(d.data() as any) }));
      setLeader(rows);
    } finally {
      setLoadingBoard(false);
    }
  }, []);
  useEffect(() => { fetchLeader(); }, [fetchLeader]);

  // ---------- Helpers ----------
  const pickRandom = useCallback(() => {
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }, [pool]);

  const start = useCallback(() => {
    setScore(0); setCorrect(0); setTotal(0); setStreak(0);
    setTimeLeft(ROUND_MS);
    setPlaying(true);
    setSelectedIndex(null);
    setInput('');
    setCurrent(pickRandom());
  }, [pickRandom]);

  const next = useCallback(() => {
    setSelectedIndex(null);
    setInput('');
    setCurrent(pickRandom());
  }, [pickRandom]);

  const normalizeStr = (s: string) => s.replace(/\s+/g, '').toLowerCase();

  const submitNumeric = useCallback(() => {
    if (!current || current.qType !== 'numeric' || !playing) return;
    const userRaw = input.trim();
    const userNum = Number(userRaw);
    const ans = current.answer;

    let isCorrect = false;
    if (typeof ans === 'number') {
      isCorrect = Number.isFinite(userNum) && userNum === ans;
    } else if (typeof ans === 'string') {
      // so sánh chuỗi rút gọn (cho phép nhập biểu thức rút gọn)
      isCorrect = normalizeStr(userRaw) === normalizeStr(ans);
    } else {
      isCorrect = false;
    }

    setTotal(t => t + 1);
    if (isCorrect) {
      setStreak(s => s + 1);
      setScore(s => s + 10 + Math.max(0, streak)); // bonus theo streak
      setCorrect(c => c + 1);
    } else {
      setStreak(0);
    }
    next();
  }, [current, input, playing, streak, next]);

  const submitMCQ = useCallback(
    (choiceIndex: number) => {
      if (!current || current.qType !== 'mcq' || !playing) return;
      const correctIndex = current.correctIndex ?? 0;

      setSelectedIndex(choiceIndex);
      setTotal(t => t + 1);

      const isCorrect = choiceIndex === correctIndex;
      if (isCorrect) {
        setStreak(s => s + 1);
        setScore(s => s + 10 + Math.max(0, streak));
        setCorrect(c => c + 1);
      } else {
        setStreak(0);
      }

      // chuyển câu nhanh sau 400ms để user kịp thấy feedback
      setTimeout(() => {
        setSelectedIndex(null);
        next();
      }, 400);
    },
    [current, playing, streak, next]
  );

  const canPost = useMemo(() => !playing && total > 0, [playing, total]);

  const postScore = useCallback(async () => {
    if (!canPost) return;
    try {
      setSubmitting(true);
      const u = auth.currentUser;
      const uid = u?.uid ?? 'guest';
      let name = u?.displayName || (u?.email ? u.email.split('@')[0] : 'Khách');

      try {
        if (uid !== 'guest') {
          const us = await getDoc(doc(db, 'users', uid));
          const n = us.data()?.displayName || us.data()?.name;
          if (n) name = n;
        }
      } catch {}

      const duration = Math.max(1, ROUND_MS - timeLeft);

      await addDoc(collection(db, 'speed_leaderboard'), {
        uid,
        name,
        score,
        timeMs: duration,
        correct,
        total,
        createdAt: serverTimestamp(),
      });

      Alert.alert('Đã đăng!', 'Điểm của bạn đã được đưa lên bảng xếp hạng.');
      fetchLeader();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể đăng điểm');
    } finally {
      setSubmitting(false);
    }
  }, [canPost, correct, fetchLeader, score, timeLeft, total]);

  /* ---------- UI ---------- */
  const progress = 1 - timeLeft / ROUND_MS;
  const secLeft = Math.ceil(timeLeft / 1000);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <MaterialCommunityIcons name="lightning-bolt" size={22} color={palette.text} />
          <Txt style={{ fontSize: 18, fontWeight: '800' }}>Thi Tốc Độ</Txt>
        </View>
        {!playing && (
          <Button label="Bắt đầu" onPress={start} tone="primary" />
        )}
      </View>

      {/* Grade filter */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
        <FlatList
          data={GRADES}
          keyExtractor={(i) => `g${i}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
          contentContainerStyle={{ paddingHorizontal: 4 }}
          renderItem={({ item }) => (
            <Chip label={`Lớp ${item}`} selected={item === grade} onPress={() => { setGrade(item); if (playing) { setPlaying(false); } }} />
          )}
        />
      </View>

      {/* Timer + Stats */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TimerBar progress={progress} color={palette.primaryDim} />
        <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TxtDim>Thời gian:</TxtDim>
            <Txt style={{ fontWeight: '800' }}>{secLeft}s</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TxtDim>Điểm:</TxtDim>
            <Txt style={{ fontWeight: '800' }}>{score}</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TxtDim>Đúng/Làm:</TxtDim>
            <Txt style={{ fontWeight: '800' }}>{correct}/{total}</Txt>
          </View>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TxtDim>Streak:</TxtDim>
            <Txt style={{ fontWeight: '800' }}>{streak}</Txt>
          </View>
        </View>
      </View>

      {/* Play Area */}
      <View style={{ padding: 16 }}>
        {poolLoading ? (
          <View style={{ backgroundColor: palette.card, borderRadius: 16, padding: 16, alignItems: 'center' }}>
            <ActivityIndicator color={palette.primary} />
            <TxtDim style={{ marginTop: 8 }}>Đang tải câu hỏi…</TxtDim>
          </View>
        ) : playing ? (
          <View style={{ backgroundColor: palette.card, borderRadius: 16, padding: 16 }}>
            <TxtDim>Trả lời nhanh!</TxtDim>
            <Txt style={{ fontSize: 28, fontWeight: '900', textAlign: 'center', marginVertical: 12 }}>
              {current?.text ?? '...'}
            </Txt>

            {current?.qType === 'mcq' ? (
              <View style={{ gap: 8 }}>
                {(current.choices ?? []).map((c, idx) => {
                  const isPicked = selectedIndex === idx;
                  const isCorrect = idx === (current.correctIndex ?? 0);
                  const pressed = selectedIndex != null;

                  // Hiệu ứng feedback ngắn
                  let bg = palette.bg;
                  let border = palette.border;
                  let fg = palette.text;
                  if (pressed) {
                    if (isPicked && isCorrect) { bg = palette.success; fg = '#fff'; }
                    else if (isPicked && !isCorrect) { bg = palette.danger; fg = '#fff'; }
                  }

                  return (
                    <TouchableOpacity
                      key={idx}
                      activeOpacity={0.85}
                      onPress={() => submitMCQ(idx)}
                      style={{
                        paddingVertical: 12,
                        paddingHorizontal: 12,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: border,
                        backgroundColor: bg,
                      }}
                    >
                      <Text style={{ color: fg, fontWeight: '700' }}>{c}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  keyboardType="default"
                  placeholder="Nhập đáp án"
                  placeholderTextColor={palette.textDim}
                  selectionColor={palette.primary}
                  keyboardAppearance="dark"
                  onSubmitEditing={submitNumeric}
                  returnKeyType="done"
                  style={{
                    borderWidth: 1,
                    borderColor: palette.border,
                    backgroundColor: palette.bg,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: Platform.select({ ios: 12, android: 8 }),
                    color: palette.text,
                    fontSize: 18,
                    marginTop: 8,
                  }}
                />
                <Button label="Trả lời" onPress={submitNumeric} tone="primary" style={{ marginTop: 12, alignItems: 'center' }} />
              </>
            )}
          </View>
        ) : (
          <View style={{ backgroundColor: palette.card, borderRadius: 16, padding: 16 }}>
            {total === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                <Ionicons name="stopwatch" size={36} color={palette.text} />
                <Txt style={{ fontSize: 16, marginTop: 8, textAlign: 'center' }}>
                  Chọn lớp ở trên rồi bấm “Bắt đầu” để thi 60 giây. Câu hỏi lấy từ bộ đề admin (nếu có), nếu không sẽ dùng câu hỏi ngẫu nhiên phù hợp lớp.
                </Txt>
              </View>
            ) : (
              <View>
                <Txt style={{ fontSize: 18, fontWeight: '800' }}>Kết quả</Txt>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                  <Stat label="Điểm" value={score.toString()} />
                  <Stat label="Đúng/Làm" value={`${correct}/${total}`} />
                  <Stat label="Độ chính xác" value={`${total ? Math.round((correct / total) * 100) : 0}%`} />
                </View>

                <View style={{ flexDirection: 'row', marginTop: 12, gap: 10 }}>
                  <Button label="Thi lại" onPress={start} tone="primary" style={{ flex: 1, alignItems: 'center' }} />
                  <Button
                    label={submitting ? 'Đang đăng…' : 'Đăng bảng xếp hạng'}
                    onPress={postScore}
                    tone="success"
                    style={{ flex: 1, alignItems: 'center' }}
                    disabled={submitting}
                  />
                </View>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Leaderboard */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <MaterialCommunityIcons name="trophy-variant" size={20} color={palette.text} />
          <Txt style={{ fontSize: 16, fontWeight: '800' }}>Bảng xếp hạng</Txt>
        </View>

        {loadingBoard ? (
          <View style={{ paddingVertical: 16 }}>
            <ActivityIndicator color={palette.primary} />
          </View>
        ) : leader.length === 0 ? (
          <TxtDim>Chưa có ai lên bảng. Hãy là người đầu tiên!</TxtDim>
        ) : (
          <FlatList
            data={leader}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item, index }) => (
              <Row
                rank={index + 1}
                name={item.name}
                score={item.score}
                timeMs={item.timeMs}
                correct={item.correct}
                total={item.total}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* ---------- Small components ---------- */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingRight: 16, marginVertical: 6 }}>
      <TxtDim>{label}</TxtDim>
      <Txt style={{ fontWeight: '800', fontSize: 17 }}>{value}</Txt>
    </View>
  );
}

function Row({
  rank, name, score, timeMs, correct, total,
}: {
  rank: number; name: string; score: number; timeMs: number; correct: number; total: number;
}) {
  const { palette } = useTheme();
  const acc = total ? Math.round((correct / total) * 100) : 0;
  const timeSec = (timeMs / 1000).toFixed(1);
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

  return (
    <View
      style={{
        backgroundColor: palette.card,
        borderRadius: 12,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
        <Txt style={{ width: 36, fontWeight: '800' }}>{medal}</Txt>
        <View style={{ flex: 1 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '800', fontSize: 15 }}>{name}</Txt>
          <TxtDim style={{ marginTop: 2, fontSize: 12 }}>
            {correct}/{total} đúng • {acc}% • {timeSec}s
          </TxtDim>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Txt style={{ fontWeight: '900', fontSize: 18 }}>{score}</Txt>
        <TxtDim style={{ fontSize: 12 }}>điểm</TxtDim>
      </View>
    </View>
  );
}

function TimerBar({ progress, color }: { progress: number; color: string }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ height: 10, backgroundColor: '#3A3A3A', borderRadius: 8, overflow: 'hidden' }}>
      <View style={{ height: '100%', width: `${clamped * 100}%`, backgroundColor: color }} />
    </View>
  );
}

/* ---------- Fallback generator ---------- */
function genFallbackForGrade(grade: number, n: number): PoolQ[] {
  const out: PoolQ[] = [];
  for (let i = 0; i < n; i++) {
    if (grade <= 5) {
      // Tiểu học: + - × ÷ nhỏ, chia làm tròn xuống kết quả nguyên
      const ops: ('+' | '-' | '×' | '÷')[] = ['+', '-', '×', '÷'];
      const op = ops[randInt(0, ops.length - 1)];
      let a = randInt(1, 20), b = randInt(1, 20), ans = 0;
      if (op === '+') ans = a + b;
      else if (op === '-') { const x = Math.max(a, b); const y = Math.min(a, b); a = x; b = y; ans = a - b; }
      else if (op === '×') { a = randInt(1, 12); b = randInt(1, 12); ans = a * b; }
      else { b = randInt(2, 9); const k = randInt(2, 9); a = b * k; ans = k; }
      out.push({ id: `fb${grade}-${i}`, grade, qType: 'numeric', text: `${a} ${op} ${b} = ?`, answer: ans });
    } else if (grade <= 9) {
      // THCS: số âm & lũy thừa/nhân nhanh
      const mode = randInt(0, 2);
      if (mode === 0) {
        const a = randInt(-15, 15), b = randInt(1, 15);
        out.push({ id: `fb${grade}-${i}`, grade, qType: 'numeric', text: `${a} × ${b} = ?`, answer: a * b });
      } else if (mode === 1) {
        const a = randInt(-20, 20), b = randInt(-20, 20);
        out.push({ id: `fb${grade}-${i}`, grade, qType: 'numeric', text: `${a} + ${b} = ?`, answer: a + b });
      } else {
        const base = randInt(2, 5), exp = randInt(2, 4);
        out.push({ id: `fb${grade}-${i}`, grade, qType: 'numeric', text: `${base}^${exp} = ?`, answer: Math.pow(base, exp) });
      }
    } else {
      // THPT: MCQ nhanh – đạo hàm/giới hạn/véc-tơ… (đơn giản)
      const variant = randInt(0, 3);
      if (variant === 0) {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: 'Đạo hàm của x² là?',
          choices: ['x', '2x', 'x²', '2'],
          correctIndex: 1,
          answer: '2x',
        });
      } else if (variant === 1) {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: 'lim x→0 (sin x)/x = ?',
          choices: ['0', '1', '∞', 'Không tồn tại'],
          correctIndex: 1,
          answer: '1',
        });
      } else if (variant === 2) {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: '∫ 2x dx = ? (bỏ hằng số)',
          choices: ['x²', 'x² + C', 'x^2/2', '2x²'],
          correctIndex: 0,
          answer: 'x²',
        });
      } else if(variant === 3) {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: 'Véc-tơ nào vuông góc với (1,2)?',
          choices: ['(2,1)', '(-2,1)', '(-2,4)', '(2,-1)'],
          correctIndex: 1,
          answer: '(-2,1)',
        });
      }
      else if (variant === 4) {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: 'Véc-tơ nào ngược hướng với (1,2)?',
          choices: ['(2,4)', '(-1,-2)', '(1,-2)', '(-2,4)'],
          correctIndex: 1,
          answer: '(-1,-2)',
        });
      }
      else {
        out.push({
          id: `fb${grade}-${i}`,
          grade,
          qType: 'mcq',
          text: 'Véc-tơ nào cùng hướng với (1,2)?',
          choices: ['(2,4)', '(-1,-2)', '(1,-2)', '(-2,4)'],
          correctIndex: 0,
          answer: '(2,4)',
        });
      }

    }
  }
  return out;
}

/* ---------- Utils ---------- */
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
