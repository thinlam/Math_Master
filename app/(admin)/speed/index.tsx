// app/(admin)/speed/index.tsx
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* Theme */
import { useTheme } from '@/theme/ThemeProvider';

/* Firebase */
import { db } from '@/scripts/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';

/* ---------- Types ---------- */
type QType = 'numeric' | 'mcq';
type Difficulty = 'easy' | 'medium' | 'hard';

type QDoc = {
  id: string;
  grade: number;
  qType: QType;
  text: string;
  answer?: number | string;
  choices?: string[];
  correctIndex?: number;
  tags?: string[];
  difficulty?: Difficulty;
  timeMs?: number;
  explanation?: string;
  createdAt?: any;
  updatedAt?: any;
};

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const PAGE_SIZE = 30;

/** Tag gợi ý sẵn để bấm (có thể chỉnh theo nhu cầu) */
const TAG_OPTIONS = [
  'đại số',
  'số học',
  'giải tích',
  'hình học',
  'vector',
  'giới hạn',
  'đạo hàm',
  'tích phân',
  'xác suất',
  'thống kê',
  'tổ hợp',
];

const isAndroid = Platform.OS === 'android';

/* ---------- Small UI helpers (đồng bộ màu – tránh chữ đen) ---------- */
function Txt({ style, ...rest }: React.ComponentProps<typeof Text>) {
  const { palette } = useTheme();
  return <Text {...rest} style={[{ color: palette.text }, style]} />;
}
function TxtDim({ style, ...rest }: React.ComponentProps<typeof Text>) {
  const { palette } = useTheme();
  return <Text {...rest} style={[{ color: palette.textDim }, style]} />;
}

/* Common Button (đã bỏ shadow Android để không có “ô đen”) */
function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'success' | 'danger' | 'muted' | 'warn';
  disabled?: boolean;
}) {
  const { palette } = useTheme();
  const colors: Record<string, { bg: string; fg: string; border: string }> = {
    primary: { bg: palette.primary, fg: '#fff', border: 'rgba(247, 222, 4, 0.12)' },
    success: { bg: palette.success, fg: '#fff', border: 'rgba(53, 250, 4, 0.99)' },
    danger:  { bg: palette.danger,  fg: '#fff', border: 'rgba(51, 255, 0, 1)' },
    muted:   { bg: 'rgba(255,255,255,0.06)', fg: palette.text, border: 'rgba(255, 255, 255, 1)' },
    warn:    { bg: palette.warn,    fg: '#fff6f6ff', border: 'rgba(217, 255, 0, 1)' },
  };
  const c = colors[tone];
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      disabled={disabled}
      style={{
        backgroundColor: c.bg,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        opacity: disabled ? 0.6 : 1,
        borderWidth: 1,
        borderColor: c.border,
        // Shadow: chỉ iOS để tránh quầng đen Android
        shadowColor: '#000',
        shadowOpacity: isAndroid ? 0 : 0.12,
        shadowRadius: isAndroid ? 0 : 8,
        shadowOffset: { width: 0, height: isAndroid ? 0 : 3 },
        elevation: isAndroid ? 0 : 2,
      }}
    >
      <Text style={{ color: c.fg, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/* Segmented Chip (bo tròn, padding đều) */
function Chip({
  label,
  selected,
  onPress,
  size = 'md',
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  size?: 'sm' | 'md';
}) {
  const { palette } = useTheme();
  const padV = size === 'sm' ? 8 : 10;
  const padH = size === 'sm' ? 12 : 14;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingVertical: padV,
        paddingHorizontal: padH,
        borderRadius: 999,
        backgroundColor: selected ? palette.primary : 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: selected ? palette.primary : 'rgba(255,255,255,0.18)',
        minHeight: 36,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: selected ? '#fff' : palette.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

/* Field (TextInput) */
function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  style,
}: React.ComponentProps<typeof TextInput>) {
  const { palette } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={palette.textDim}
      keyboardType={keyboardType}
      multiline={multiline}
      style={[
        {
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.10)',
          borderRadius: 12,
          color: palette.text,
          paddingHorizontal: 12,
          paddingVertical: Platform.select({ ios: 12, android: 10 }),
        },
        style,
      ]}
    />
  );
}

/* Card (bỏ elevation Android) */
function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: palette.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          padding: 14,
          // Chỉ đổ bóng trên iOS
          shadowColor: '#000',
          shadowOpacity: isAndroid ? 0 : 0.10,
          shadowRadius: isAndroid ? 0 : 10,
          shadowOffset: { width: 0, height: isAndroid ? 0 : 4 },
          elevation: isAndroid ? 0 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ---------- UI helpers cho form ---------- */
function FormLabel({ children, style }: { children: React.ReactNode; style?: any }) {
  const { palette } = useTheme();
  return (
    <Text style={[{ color: palette.text, fontWeight: '800', fontSize: 13, marginBottom: 6 }, style]}>
      {children}
    </Text>
  );
}
function HelperText({ children }: { children: React.ReactNode }) {
  const { palette } = useTheme();
  return <Text style={{ color: palette.textDim, fontSize: 12, marginTop: 6 }}>{children}</Text>;
}
function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 14 }} />;
}

/* ==================================================================== */

export default function AdminSpeedBank() {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();

  /* Filters */
  const [grade, setGrade] = useState<number>(1);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<string>('');

  /* List state */
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QDoc[]>([]);
  const [moreLoading, setMoreLoading] = useState(false);
  const lastDocRef = useRef<any>(null);

  /* Modals */
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<QDoc | null>(null);

  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [newTag, setNewTag] = useState(''); // input thêm tag tự do

  /* ---------- Load list ---------- */
  const baseQuery = () => {
    const conds: any[] = [where('grade', '==', grade)];
    return query(collection(db, 'speed_questions'), ...conds, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));
  };

  const loadFirst = useCallback(async () => {
    setLoading(true);
    lastDocRef.current = null;
    const snap = await getDocs(baseQuery());
    const list: QDoc[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    setItems(applyClientFilters(list, difficultyFilter, tagFilter));
    lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    setLoading(false);
  }, [grade, difficultyFilter, tagFilter]);

  const loadMore = useCallback(async () => {
    if (!lastDocRef.current || moreLoading) return;
    setMoreLoading(true);
    const qy = query(baseQuery(), startAfter(lastDocRef.current));
    const snap = await getDocs(qy);
    const list: QDoc[] = [];
    snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
    setItems((prev) => [...prev, ...applyClientFilters(list, difficultyFilter, tagFilter)]);
    lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
    setMoreLoading(false);
  }, [difficultyFilter, tagFilter, moreLoading]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  /* ---------- CRUD helpers ---------- */
  const openCreate = () => {
    setEditing({
      id: '',
      grade,
      qType: 'numeric',
      text: '',
      answer: '',
      choices: [''],
      correctIndex: 0,
      tags: [],
      difficulty: 'easy',
      timeMs: 10000,
      explanation: '',
    });
    setNewTag('');
    setShowEdit(true);
  };

  const openEdit = (it: QDoc) => {
    setEditing(JSON.parse(JSON.stringify(it)));
    setNewTag('');
    setShowEdit(true);
  };

  const onDelete = async (id: string) => {
    Alert.alert('Xoá câu hỏi?', 'Thao tác này không thể hoàn tác.', [
      { text: 'Huỷ' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'speed_questions', id));
          setItems((prev) => prev.filter((x) => x.id !== id));
        },
      },
    ]);
  };

  const onSave = async () => {
    try {
      if (!editing) return;
      const payload = normalizeBeforeSave(editing);
      if (editing.id) {
        await updateDoc(doc(db, 'speed_questions', editing.id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'speed_questions'), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setShowEdit(false);
      await loadFirst();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể lưu câu hỏi');
    }
  };

  const onBulkImport = async () => {
    try {
      const lines = bulkText.split('\n').map((s) => s.trim()).filter(Boolean);
      if (lines.length === 0) return;
      let ok = 0,
        fail = 0;
      for (const line of lines) {
        const parts = line.split('|').map((s) => s.trim());
        if (parts.length < 2) {
          fail++;
          continue;
        }
        const isMcq = parts[1].includes(';');
        if (isMcq) {
          const [text, choicesStr, idxStr, tagsStr = '', diffStr = 'easy', timeStr = '10000', expl = ''] = parts;
          const choices = choicesStr.split(';').map((s) => s.trim()).filter(Boolean);
          const correctIndex = Number(idxStr);
          if (!text || choices.length < 2 || !Number.isFinite(correctIndex)) {
            fail++;
            continue;
          }
          await addDoc(collection(db, 'speed_questions'), {
            grade,
            qType: 'mcq',
            text,
            choices,
            correctIndex,
            tags: parseTags(tagsStr),
            difficulty: parseDiff(diffStr),
            timeMs: Number(timeStr) || 10000,
            explanation: expl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ok++;
        } else {
          const [text, ansStr, tagsStr = '', diffStr = 'easy', timeStr = '10000', expl = ''] = parts;
          const answerNum = parseMaybeNumber(ansStr);
          if (!text || answerNum === null) {
            fail++;
            continue;
          }
          await addDoc(collection(db, 'speed_questions'), {
            grade,
            qType: 'numeric',
            text,
            answer: answerNum,
            tags: parseTags(tagsStr),
            difficulty: parseDiff(diffStr),
            timeMs: Number(timeStr) || 10000,
            explanation: expl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          ok++;
        }
      }
      Alert.alert('Nhập nhanh', `Thành công: ${ok}, lỗi: ${fail}`);
      setShowBulk(false);
      setBulkText('');
      loadFirst();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không thể nhập nhanh');
    }
  };

  /* ---------- Filters header (cuộn ngang) ---------- */
  const FiltersHeader = (
    <View style={{ paddingHorizontal: 12, paddingTop: 4, paddingBottom: 12 }}>
      {/* Tag search */}
      <Field
        value={tagFilter}
        onChangeText={setTagFilter}
        placeholder="Lọc theo tag (vd: giải tích, hình học...)"
        onSubmitEditing={loadFirst}
        style={{ marginBottom: 10 }}
      />

      {/* Quick tag suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {TAG_OPTIONS.map((t) => (
          <Chip
            key={t}
            size="sm"
            label={t}
            selected={tagFilter.toLowerCase() === t.toLowerCase()}
            onPress={() => {
              setTagFilter(t);
              loadFirst();
            }}
          />
        ))}
      </ScrollView>

      {/* Grades */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 12 }}>
        {GRADES.map((g) => (
          <Chip key={g} label={`Lớp ${g}`} selected={g === grade} onPress={() => setGrade(g)} />
        ))}
      </ScrollView>

      {/* Difficulty */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, marginTop: 10, alignItems: 'center' }}
      >
        {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
          <Chip
            key={d}
            size="sm"
            label={d === 'all' ? 'Tất cả' : d}
            selected={difficultyFilter === d}
            onPress={() => setDifficultyFilter(d as any)}
          />
        ))}
      </ScrollView>
    </View>
  );

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg, paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <MaterialCommunityIcons name="database-cog" size={22} color={palette.text} />
          <Txt style={{ fontWeight: '900', fontSize: 18 }}>Bộ đề Thi Tốc Độ</Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Nhập nhanh" tone="warn" onPress={() => setShowBulk(true)} />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ padding: 20 }}>
          <ActivityIndicator color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          ListHeaderComponent={FiltersHeader}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, paddingBottom: 80 + insets.bottom }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          onEndReachedThreshold={0.3}
          onEndReached={loadMore}
          renderItem={({ item }) => (
            <Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <Txt style={{ fontWeight: '800', fontSize: 15 }}>{item.qType === 'mcq' ? '🅼 ' : '🔢 '} {item.text}</Txt>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Button label="Sửa" tone="primary" onPress={() => openEdit(item)} />
                  <Button label="Xoá" tone="danger" onPress={() => onDelete(item.id)} />
                </View>
              </View>

              {item.qType === 'mcq' ? (
                <TxtDim style={{ marginTop: 6 }}>
                  Đáp án đúng: <Txt style={{ fontWeight: '800' }}>{item.choices?.[item.correctIndex ?? 0]}</Txt>
                </TxtDim>
              ) : (
                <TxtDim style={{ marginTop: 6 }}>
                  Đáp án: <Txt style={{ fontWeight: '800' }}>{String(item.answer)}</Txt>
                </TxtDim>
              )}

              <TxtDim style={{ marginTop: 4, fontSize: 12 }}>
                Lớp {item.grade} • {(item.difficulty ?? 'easy').toUpperCase()}
                {item.tags?.length ? ` • ${item.tags.join(', ')}` : ''}
                {item.timeMs ? ` • ${Math.round((item.timeMs as any) / 1000)}s` : ''}
              </TxtDim>

              {item.explanation ? <TxtDim style={{ marginTop: 6 }}>{item.explanation}</TxtDim> : null}
            </Card>
          )}
          ListEmptyComponent={
            <View style={{ paddingVertical: 36, alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="file-question-outline" size={28} color={palette.textDim} />
              <TxtDim>Chưa có câu nào cho lớp {grade}.</TxtDim>
              <Button label="+ Thêm câu đầu tiên" tone="success" onPress={openCreate} />
            </View>
          }
          ListFooterComponent={moreLoading ? <ActivityIndicator color={palette.primary} /> : null}
        />
      )}

      {/* FAB (không shadow Android, dùng ring mảnh) */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: 16,
          bottom: 16 + insets.bottom,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={openCreate}
          style={{
            backgroundColor: palette.primary,
            height: 56,
            width: 56,
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.22)',
            shadowColor: '#000',
            shadowOpacity: isAndroid ? 0 : 0.18,
            shadowRadius: isAndroid ? 0 : 8,
            shadowOffset: { width: 0, height: isAndroid ? 0 : 4 },
            elevation: isAndroid ? 0 : 4,
          }}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Add/Edit Modal */}
      <Modal visible={showEdit} animationType="slide" transparent onRequestClose={() => setShowEdit(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <Card style={{ maxHeight: '90%', width: '100%' }}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Header row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Txt style={{ fontWeight: '900', fontSize: 18 }}>
                  {editing?.id ? 'Sửa câu hỏi' : 'Thêm câu hỏi'} • Lớp {grade}
                </Txt>
                <Button label="Đóng" tone="muted" onPress={() => setShowEdit(false)} />
              </View>

              <Divider />

              {/* Type */}
              <FormLabel>Loại câu hỏi</FormLabel>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['numeric', 'mcq'] as const).map((t) => (
                  <Chip
                    key={t}
                    label={t === 'numeric' ? 'Numeric (nhập đáp án)' : 'MCQ (trắc nghiệm)'}
                    selected={editing?.qType === t}
                    onPress={() => setEditing((e) => (e ? { ...e, qType: t } : e))}
                  />
                ))}
              </View>
              <HelperText>Numeric phù hợp lớp nhỏ; MCQ dùng cho mọi lớp, nhất là 10–12.</HelperText>

              <Divider />

              {/* Nội dung */}
              <FormLabel>Nội dung</FormLabel>
              <Field
                value={editing?.text ?? ''}
                onChangeText={(v) => setEditing((e) => ({ ...(e as any), text: v }))}
                placeholder="Nhập đề bài (vd: Giải phương trình..., Tính đạo hàm..., 7×8=? )"
              />

              {/* Numeric / MCQ */}
              {editing?.qType === 'numeric' ? (
                <>
                  <FormLabel style={{ marginTop: 12 }}>Đáp án</FormLabel>
                  <Field
                    value={String(editing?.answer ?? '')}
                    onChangeText={(v) => setEditing((e) => ({ ...(e as any), answer: v.trim() }))}
                    keyboardType="default"
                    placeholder="Có thể là số hoặc biểu thức rút gọn"
                  />
                </>
              ) : (
                <>
                  <FormLabel style={{ marginTop: 12 }}>Phương án trắc nghiệm</FormLabel>
                  {(editing?.choices ?? []).map((c, idx) => (
                    <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <Chip
                        size="sm"
                        label={editing?.correctIndex === idx ? 'Đúng' : 'Chọn đúng'}
                        selected={editing?.correctIndex === idx}
                        onPress={() => setEditing((e) => ({ ...(e as any), correctIndex: idx }))}
                      />
                      <Field
                        value={c}
                        onChangeText={(v) =>
                          setEditing((e) => {
                            const choices = [...(e?.choices ?? [])];
                            choices[idx] = v;
                            return { ...(e as any), choices };
                          })
                        }
                        placeholder={`Phương án #${idx + 1}`}
                        style={{ flex: 1 }}
                      />
                      <Button
                        label="Xoá"
                        tone="danger"
                        onPress={() =>
                          setEditing((e) => {
                            const choices = [...(e?.choices ?? [])];
                            choices.splice(idx, 1);
                            let correctIndex = e?.correctIndex ?? 0;
                            if (correctIndex >= choices.length) correctIndex = Math.max(0, choices.length - 1);
                            return { ...(e as any), choices, correctIndex };
                          })
                        }
                      />
                    </View>
                  ))}
                  <Button
                    label="+ Thêm phương án"
                    tone="muted"
                    onPress={() => setEditing((e) => ({ ...(e as any), choices: [...(e?.choices ?? []), '' ] }))}
                  />
                  <HelperText>Chạm “Chọn đúng” để đánh dấu đáp án đúng.</HelperText>
                </>
              )}

              <Divider />

              {/* Meta */}
              <FormLabel>Thiết lập</FormLabel>

              {/* Difficulty chips */}
              <TxtDim>Độ khó</TxtDim>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                {(['easy', 'medium', 'hard'] as const).map((d) => (
                  <Chip key={d} label={d} selected={editing?.difficulty === d} onPress={() => setEditing((e) => ({ ...(e as any), difficulty: d }))} />
                ))}
              </View>

              {/* Time field */}
              <TxtDim style={{ marginTop: 10 }}>Thời gian gợi ý (ms)</TxtDim>
              <Field
                value={String(editing?.timeMs ?? 10000)}
                onChangeText={(v) => setEditing((e) => ({ ...(e as any), timeMs: Number(v) || 10000 }))}
                keyboardType="numeric"
                placeholder="VD: 10000 = 10 giây"
                style={{ marginTop: 6 }}
              />

              {/* TAGS */}
              <FormLabel style={{ marginTop: 12 }}>Tags</FormLabel>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {TAG_OPTIONS.map((t) => {
                  const selected = (editing?.tags ?? []).includes(t);
                  return (
                    <Chip
                      key={t}
                      label={t}
                      selected={selected}
                      onPress={() =>
                        setEditing((e) => {
                          if (!e) return e;
                          const set = new Set(e.tags ?? []);
                          selected ? set.delete(t) : set.add(t);
                          return { ...e, tags: Array.from(set) };
                        })
                      }
                    />
                  );
                })}
              </View>

              {/* Add custom tag */}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 }}>
                <Field
                  value={newTag}
                  onChangeText={setNewTag}
                  placeholder="Nhập tag mới…"
                  style={{ flex: 1 }}
                />
                <Button
                  label="+ Thêm tag"
                  tone="success"
                  onPress={() => {
                    const t = newTag.trim();
                    if (!t) return;
                    setEditing((e) => {
                      if (!e) return e;
                      const set = new Set((e.tags ?? []).map((x) => x.trim()));
                      set.add(t);
                      return { ...e, tags: Array.from(set) };
                    });
                    setNewTag('');
                  }}
                />
              </View>
              <HelperText>Các tag được lưu dưới dạng mảng (ví dụ: ['đại số','giải tích']).</HelperText>

              <FormLabel style={{ marginTop: 12 }}>Giải thích / lời giải (tuỳ chọn)</FormLabel>
              <Field
                value={editing?.explanation ?? ''}
                onChangeText={(v) => setEditing((e) => ({ ...(e as any), explanation: v }))}
                placeholder="Gợi ý, bước giải, công thức…"
                multiline
                style={{ minHeight: 100, textAlignVertical: 'top' }}
              />

              <Divider />

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Button label="Huỷ" tone="muted" onPress={() => setShowEdit(false)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={editing?.id ? 'Lưu thay đổi' : 'Thêm câu hỏi'} tone="primary" onPress={onSave} />
                </View>
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Bulk Import */}
      <Modal visible={showBulk} animationType="slide" transparent onRequestClose={() => setShowBulk(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.45)',
            justifyContent: 'center',
            padding: 16,
            paddingBottom: 16 + insets.bottom,
          }}
        >
          <Card>
            <Txt style={{ fontWeight: '900', fontSize: 16 }}>Nhập nhanh • Lớp {grade}</Txt>
            <TxtDim style={{ marginTop: 8 }}>
              Dòng <Txt>numeric</Txt>: <Txt>text|answer|tags|difficulty|timeMs|explanation</Txt>
            </TxtDim>
            <TxtDim>
              Dòng <Txt>MCQ</Txt>: <Txt>text|A;B;C;D|correctIndex(0-based)|tags|difficulty|timeMs|explanation</Txt>
            </TxtDim>
            <TxtDim style={{ marginTop: 6, marginBottom: 8 }}>
              Ví dụ:
              {'\n'}
              <Txt>7 × 8 = ?|56|nhân|easy|8000|Bảng cửu chương</Txt>
              {'\n'}
              <Txt>lim x→0 sin x / x?|0;1;∞;Không tồn tại|1|giới hạn|easy|12000|Chuẩn 1</Txt>
            </TxtDim>

            <Field value={bulkText} onChangeText={setBulkText} multiline placeholder="Dán nhiều dòng theo định dạng trên…" style={{ minHeight: 180, textAlignVertical: 'top' }} />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Button label="Đóng" tone="muted" onPress={() => setShowBulk(false)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="Nhập" tone="success" onPress={onBulkImport} />
              </View>
            </View>
          </Card>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Helpers ---------- */
function applyClientFilters(list: QDoc[], diff: Difficulty | 'all', tag: string) {
  let res = list;
  if (diff !== 'all') res = res.filter((x) => (x.difficulty ?? 'easy') === diff);
  if (tag.trim()) {
    const t = tag.toLowerCase();
    res = res.filter((x) => (x.tags ?? []).some((s) => s.toLowerCase().includes(t)));
  }
  return res;
}
function parseTags(s: string) {
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}
function parseDiff(s: string): Difficulty {
  const v = (s || '').toLowerCase();
  return (['easy', 'medium', 'hard'] as const).includes(v as any) ? (v as Difficulty) : 'easy';
}
function parseMaybeNumber(s: string): number | string | null {
  if (s == null) return null;
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  return s.trim() ? s.trim() : null;
}
function normalizeBeforeSave(e: QDoc): any {
  const base = {
    grade: e.grade,
    qType: e.qType,
    text: e.text?.trim() ?? '',
    tags: e.tags ?? [],
    difficulty: e.difficulty ?? 'easy',
    timeMs: e.timeMs ?? 10000,
    explanation: e.explanation ?? '',
  };
  if (e.qType === 'mcq') {
    return {
      ...base,
      choices: (e.choices ?? []).map((s) => s.trim()).filter(Boolean),
      correctIndex: Number(e.correctIndex ?? 0),
    };
  }
  return { ...base, answer: typeof e.answer === 'string' ? e.answer.trim() : e.answer };
}
