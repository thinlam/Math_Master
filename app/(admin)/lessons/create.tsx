// app/(admin)/lessons/create.tsx

/* ---------- Imports ---------- */
import { auth, db } from '@/scripts/firebase'; // ⬅️ Không dùng storage nữa
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Types ---------- */
type QOption = { id: string; text: string; correct?: boolean };
type QStep = { prompt: string; answer?: string };

type Question = {
  id: string;
  type: 'mcq' | 'short_answer' | 'essay' | 'multi_step';
  prompt: string;
  image?: string | null;
  points: number;
  level?: 1 | 2 | 3;
  hint?: string;
  solution?: string;
  options?: QOption[];
  answers?: string[];
  steps?: QStep[];
};

type Lesson = {
  title: string;
  grade: number;
  subject: 'math';
  book?: { name: string; edition?: string | null };
  chapter?: string;
  unit?: string;
  topicType?: string;
  difficulty: 'easy' | 'med' | 'hard'; // ⬅️ bỏ 'mix'
  timeLimitMin?: number;
  objectives: string[];
  tags: string[];
  content?: string;
  coverImage?: string | null;
  status: 'draft' | 'published';
  version: number;
  authorUid?: string | null;
  questions: Question[];
  createdAt?: any;
  updatedAt?: any;
};

/* ---------- UI const ---------- */
const DIFFS = [
  { key: 'easy', label: 'Dễ' },
  { key: 'med', label: 'Trung bình' },
  { key: 'hard', label: 'Khó' },
] as const;

const Q_TYPES = [
  { key: 'mcq', label: 'Trắc nghiệm' },
  { key: 'short_answer', label: 'Điền đáp án' },
  { key: 'essay', label: 'Tự luận/ảnh' },
  { key: 'multi_step', label: 'Nhiều bước' },
] as const;

/* ---------- Helpers ---------- */
function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* ===== Cloudinary ENV ===== */
// 🔥 Thay vì lấy từ process.env, bạn viết thẳng ra:
const CLOUD_NAME = "djf9vnngm";              // cloud_name của bạn
const CLOUD_PRESET = "unsigned_mobile";     // preset unsigned vừa tạo
const CLOUD_FOLDER = "lessons";
 // Folder mặc định muốn lưu


async function uploadToCloudinary(localUri: string, folder: string) {
  const ext = (localUri.split("?")[0].split(".").pop() || "jpg").toLowerCase();
  const mime =
    ext === "png" ? "image/png" :
    ext === "webp" ? "image/webp" :
    "image/jpeg";

  const data = new FormData();
  data.append("file", {
    uri: localUri,
    name: `mm_${Date.now()}.${ext}`,
    type: mime,
  } as any);
  data.append("upload_preset", CLOUD_PRESET);
data.append("folder", `${CLOUD_FOLDER}/${folder}`);


  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const res = await fetch(url, { method: "POST", body: data });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Cloudinary upload failed (${res.status}): ${txt}`);
  }
  const json = await res.json();
  return json.secure_url as string;
}

async function pickImageAndUpload(pathPrefix: string) {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (perm.status !== 'granted') {
    Alert.alert('Quyền bị từ chối', 'Cần quyền truy cập ảnh để tải lên.');
    return undefined;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return undefined;

  const asset = result.assets[0];
  try {
    const url = await uploadToCloudinary(asset.uri, pathPrefix);
    return url;
  } catch (e: any) {
    Alert.alert('Lỗi upload', e?.message ?? 'Không thể tải ảnh lên Cloudinary.');
    return undefined;
  }
}

/* ---------- Hook: chiều cao bàn phím ---------- */
function useKeyboardHeight() {
  const [kh, setKh] = useState(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s1 = Keyboard.addListener(showEvt, (e) =>
      setKh(e.endCoordinates.height),
    );
    const s2 = Keyboard.addListener(hideEvt, () => setKh(0));
    return () => {
      s1.remove();
      s2.remove();
    };
  }, []);
  return kh;
}

/* ---------- Main ---------- */
export default function CreateLessonScreen() {
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const kb = useKeyboardHeight();

  const [tab, setTab] =
    useState<'meta' | 'questions' | 'preview' | 'settings'>('meta');

  // Meta
  const [title, setTitle] = useState('');
  const [grade, setGrade] = useState<string>('');
  const [bookName, setBookName] = useState('Kết nối tri thức');
  const [bookEdition, setBookEdition] = useState('2024');
  const [chapter, setChapter] = useState('');
  const [unit, setUnit] = useState('');
  const [topicType, setTopicType] = useState('');
  const [difficulty, setDifficulty] =
    useState<Lesson['difficulty']>('med'); // default 'med'
  const [timeLimitMin, setTimeLimitMin] = useState<string>('20');
  const [objectives, setObjectives] = useState<string>(
    'Củng cố cộng trừ trong phạm vi 100',
  );
  const [tags, setTags] = useState<string>('cộng trừ, lớp 1');
  const [content, setContent] = useState('');

  // Settings (cover image)
  // undefined: chưa đụng; null: sẽ xoá; string: URL
  const [coverImage, setCoverImage] = useState<string | null | undefined>(
    undefined,
  );
  const [status, setStatus] = useState<Lesson['status']>('draft');
  const [version, setVersion] = useState<number>(1);

  // Questions
  const [questions, setQuestions] = useState<Question[]>([]);

  // Loading/Saving
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  // Pickers data
  const gradeItems = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: `Lớp ${i + 1}`,
        value: i + 1,
      })),
    [],
  );
  const timeItems = useMemo(
    () =>
      [10, 15, 20, 25, 30, 45, 60, 75, 90].map((m) => ({
        label: `${m} phút`,
        value: m,
      })),
    [],
  );
  const pointsItems = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => ({
        label: `${i + 1} điểm`,
        value: i + 1,
      })),
    [],
  );
  const levelItems = useMemo(
    () => [1, 2, 3].map((l) => ({ label: `Mức ${l}`, value: l as 1 | 2 | 3 })),
    [],
  );

  // Picker toggles
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [qPointsPicker, setQPointsPicker] = useState<string | undefined>(
    undefined,
  );
  const [qLevelPicker, setQLevelPicker] = useState<string | undefined>(
    undefined,
  );

  /* ---------- Load if editing ---------- */
  useEffect(() => {
    const load = async () => {
      if (!editId) return;
      setLoading(true);
      const snap = await getDoc(doc(db, 'lessons', String(editId)));
      if (snap.exists()) {
        const d = snap.data() as Lesson;
        setTitle(d.title || '');
        setGrade(String(d.grade ?? ''));
        setBookName(d.book?.name || bookName);
        setBookEdition((d.book?.edition as string) || bookEdition);
        setChapter(d.chapter || '');
        setUnit(d.unit || '');
        setTopicType(d.topicType || '');
        // map 'mix' -> 'med'
        const diff = (d.difficulty as any) || 'med';
        setDifficulty(diff === 'mix' ? 'med' : diff);
        setTimeLimitMin(d.timeLimitMin ? String(d.timeLimitMin) : '');
        setObjectives(d.objectives?.join(', ') || '');
        setTags(d.tags?.join(', ') || '');
        setContent(d.content || '');
        setCoverImage(
          Object.prototype.hasOwnProperty.call(d, 'coverImage')
            ? (d.coverImage as any)
            : null,
        );
        setStatus(d.status || 'draft');
        setVersion(d.version || 1);
        setQuestions(d.questions || []);
      }
      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  /* ---------- Validate ---------- */
  function validate(): string | null {
    if (!title.trim()) return 'Nhập tiêu đề bài học.';
    const g = Number(grade);
    if (!g || g < 1 || g > 12) return 'Lớp phải từ 1 đến 12.';
    if (!chapter.trim()) return 'Nhập Chương.';
    if (!unit.trim()) return 'Nhập Bài.';
    if (!topicType.trim()) return 'Nhập Dạng bài.';
    if (!questions.length) return 'Thêm ít nhất 1 câu hỏi.';
    for (const [i, q] of questions.entries()) {
      if (!q.prompt.trim()) return `Câu ${i + 1} chưa có đề bài.`;
      if (q.type === 'mcq') {
        if (!q.options?.length)
          return `Câu ${i + 1} (trắc nghiệm) chưa có phương án.`;
        if (!q.options.some((o) => o.correct))
          return `Câu ${i + 1} (trắc nghiệm) chưa đánh dấu đáp án đúng.`;
      }
      if (q.type === 'short_answer') {
        if (!q.answers?.length || !q.answers[0]?.trim())
          return `Câu ${i + 1} (điền) chưa có đáp án.`;
      }
      if (q.type === 'multi_step' && !q.steps?.length)
        return `Câu ${i + 1} (nhiều bước) chưa có bước nào.`;
    }
    return null;
  }

  /* ---------- Save ---------- */
  const save = async () => {
    const err = validate();
    if (err) return Alert.alert('Thiếu', err);

    // làm sạch dữ liệu user nhập (loại undefined trong mảng/object lồng nhau)
    const sanitizeUserData = (val: any): any => {
      if (Array.isArray(val))
        return val.map(sanitizeUserData).filter((v) => v !== undefined);
      if (val && typeof val === 'object') {
        const out: any = {};
        for (const [k, v] of Object.entries(val)) {
          if (v !== undefined) out[k] = sanitizeUserData(v);
        }
        return out;
      }
      return val;
    };

    try {
      setSaving(true);
      const id = editId || doc(collection(db, 'lessons')).id;

      // book: không để undefined
      const _book: { name: string; edition?: string | null } = {
        name: bookName.trim(),
      };
      if (bookEdition.trim()) _book.edition = bookEdition.trim();

      // questions: loại bỏ undefined trong options/answers/steps/… (nhưng giữ null nếu có)
      const sanitizedQuestions = sanitizeUserData(questions);

      const lesson = {
        title: title.trim(),
        grade: Number(grade),
        subject: 'math' as const,
        book: _book,
        chapter: chapter.trim(),
        unit: unit.trim(),
        topicType: topicType.trim(),
        difficulty,
        objectives: objectives.split(',').map((s) => s.trim()).filter(Boolean),
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        status,
        version: Number(version) || 1,
        authorUid: auth?.currentUser?.uid ?? null,
        questions: sanitizedQuestions as Question[],
        updatedAt: serverTimestamp(),
        ...(timeLimitMin ? { timeLimitMin: Number(timeLimitMin) } : {}),
        ...(content.trim() ? { content: content.trim() } : {}),
        // chỉ ghi khi người dùng đã tác động: string/null sẽ được ghi, undefined thì bỏ qua
        ...(coverImage !== undefined ? { coverImage } : {}),
        ...(editId ? {} : { createdAt: serverTimestamp() }),
      };

      if (editId) {
        await updateDoc(doc(db, 'lessons', id), lesson as any);
      } else {
        await setDoc(doc(db, 'lessons', id), lesson as any);
      }

      Alert.alert(
        'Thành công',
        editId ? 'Đã cập nhật bài học.' : 'Đã tạo bài học.',
      );
      router.back();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Lưu bài học thất bại.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Question menu state ---------- */
  type QMenuState = { visible: boolean; qid?: string; index?: number };
  const [qMenu, setQMenu] = useState<QMenuState>({ visible: false });
  function openQMenu(qid: string, index: number) {
    setQMenu({ visible: true, qid, index });
  }
  function closeQMenu() {
    setQMenu({ visible: false });
  }
  function duplicateQuestion(id: string) {
    setQuestions(prev => {
      const idx = prev.findIndex(q => q.id === id);
      if (idx < 0) return prev;
      const clone = JSON.parse(JSON.stringify(prev[idx])) as Question;
      clone.id = uid();
      if (clone.options) clone.options = clone.options.map(o => ({ ...o, id: uid() }));
      return [...prev.slice(0, idx + 1), clone, ...prev.slice(idx + 1)];
    });
  }

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0b1220',
        }}
      >
        <ActivityIndicator />
        <Text style={{ color: '#fff', marginTop: 8 }}>Đang tải…</Text>
      </View>
    );
  }

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={paddingTop + 88}
      style={{ flex: 1, backgroundColor: '#0b1220' }}
    >
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* Header */}
      <View
        style={{
          paddingTop,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
          {editId ? 'Sửa bài học' : 'Tạo bài học'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
        {(['meta', 'questions', 'preview', 'settings'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: tab === t ? '#3b82f6' : 'rgba(255,255,255,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700' }}>
              {t === 'meta' ? 'Thông tin' : t === 'questions' ? 'Câu hỏi' : t === 'preview' ? 'Xem trước' : 'Cài đặt'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab: Thông tin */}
      {tab === 'meta' && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(paddingBottom, kb + 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Field label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="VD: Luyện tập cộng trừ" />

          <FieldPicker
            label="Lớp"
            value={grade}
            display={grade ? `Lớp ${grade}` : ''}
            onPress={() => {
              Keyboard.dismiss();
              setShowGradePicker(true);
            }}
          />

          <Row>
            <Field style={{ flex: 1, marginRight: 8 }} label="Bộ sách" value={bookName} onChangeText={setBookName} />
            <Field style={{ flex: 1, marginLeft: 8 }} label="Ấn bản" value={bookEdition} onChangeText={setBookEdition} />
          </Row>

          <Row>
            <Field style={{ flex: 1, marginRight: 8 }} label="Chương" value={chapter} onChangeText={setChapter} />
            <Field style={{ flex: 1, marginLeft: 8 }} label="Bài/Unit" value={unit} onChangeText={setUnit} />
          </Row>

          <Row>
            <Field style={{ flex: 1, marginRight: 8 }} label="Dạng bài" value={topicType} onChangeText={setTopicType} />
            <FieldPicker
              style={{ flex: 1, marginLeft: 8 }}
              label="Thời lượng"
              value={timeLimitMin}
              display={timeLimitMin ? `${timeLimitMin} phút` : ''}
              onPress={() => {
                Keyboard.dismiss();
                setShowTimePicker(true);
              }}
            />
          </Row>

          <View style={{ marginBottom: 12 }}>
            <Text style={labelStyle}>Độ khó</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {DIFFS.map((d) => (
                <Chip key={d.key} selected={difficulty === d.key} onPress={() => setDifficulty(d.key as Lesson['difficulty'])}>
                  {d.label}
                </Chip>
              ))}
            </View>
          </View>

          <Field label="Mục tiêu bài (phân tách dấu phẩy)" value={objectives} onChangeText={setObjectives} />
          <Field label="Tags (phân tách dấu phẩy)" value={tags} onChangeText={setTags} />
          <Area label="Ghi chú/Nội dung GV" value={content} onChangeText={setContent} />

          <SaveBar onSave={save} saving={saving} />

          {/* Pickers */}
          <WheelPickerModal
            visible={showGradePicker}
            onClose={() => setShowGradePicker(false)}
            selectedValue={grade ? Number(grade) : 1}
            items={gradeItems}
            onChange={(v) => {
              setGrade(String(v));
              setShowGradePicker(false);
            }}
          />
          <WheelPickerModal
            visible={showTimePicker}
            onClose={() => setShowTimePicker(false)}
            selectedValue={timeLimitMin ? Number(timeLimitMin) : 20}
            items={timeItems}
            onChange={(v) => {
              setTimeLimitMin(String(v));
              setShowTimePicker(false);
            }}
          />
        </ScrollView>
      )}

      {/* Tab: Câu hỏi */}
      {tab === 'questions' && (
        <View style={{ flex: 1 }}>
          <View
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            {Q_TYPES.map((q) => (
              <Chip key={q.key} onPress={() => addQuestion(q.key as Question['type'])}>
                {q.label}
              </Chip>
            ))}
            <View style={{ flex: 1 }} />
            <Chip onPress={save}>
              <Ionicons name="save" size={14} color="#fff" /> Lưu
            </Chip>
          </View>

          <FlatList
            data={questions}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: Math.max(paddingBottom, kb + 24),
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            renderItem={({ item, index }) => (
              <View
                style={{
                  marginBottom: 12,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    Câu {index + 1} • {Q_TYPES.find((t) => t.key === item.type)?.label}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Kebab menu */}
                    <IconBtn name="ellipsis-horizontal" onPress={() => openQMenu(item.id, index)} />
                  </View>
                </View>

                <Row>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setQPointsPicker(item.id);
                    }}
                    style={{
                      flex: 1,
                      marginRight: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text style={labelStyle}>Điểm</Text>
                    <Text style={{ color: '#fff' }}>{item.points || 1} điểm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setQLevelPicker(item.id);
                    }}
                    style={{
                      flex: 1,
                      marginLeft: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text style={labelStyle}>Mức</Text>
                    <Text style={{ color: '#fff' }}>Mức {item.level ?? 1}</Text>
                  </TouchableOpacity>
                </Row>

                <Area
                  label="Đề bài (hỗ trợ LaTeX $...$)"
                  value={item.prompt}
                  onChangeText={(v) => updateQuestion(item.id, { prompt: v })}
                  placeholder="VD: Tính $37 + 25$"
                />

                <Row>
                  <TouchableOpacity
                    onPress={() => pickQuestionImage(item.id)}
                    style={{
                      flex: 1,
                      marginRight: 8,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <Text style={labelStyle}>Ảnh minh hoạ</Text>
                    <Text style={{ color: '#94a3b8' }}>
                      {item.image ? 'Đã có ảnh • Nhấn để thay' : 'Chọn/Upload ảnh (tuỳ chọn)'}
                    </Text>
                  </TouchableOpacity>
                  <Field
                    style={{ flex: 1, marginLeft: 8 }}
                    label="Gợi ý (tuỳ chọn)"
                    value={item.hint || ''}
                    onChangeText={(v) => updateQuestion(item.id, { hint: v })}
                    placeholder="VD: Đặt tính rồi tính"
                  />
                </Row>

                {item.type === 'mcq' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={labelStyle}>Phương án</Text>
                    {item.options?.map((op, i) => (
                      <Row key={op.id}>
                        <TouchableOpacity
                          onPress={() => {
                            const opts =
                              item.options?.map((o) => ({ ...o, correct: o.id === op.id })) || [];
                            updateQuestion(item.id, { options: opts });
                          }}
                          style={{
                            width: 44,
                            height: 44,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.2)',
                            backgroundColor: op.correct ? '#22c55e' : 'transparent',
                            marginRight: 8,
                          }}
                        >
                          <Ionicons
                            name={op.correct ? 'checkmark' : 'ellipse-outline'}
                            size={18}
                            color="#fff"
                          />
                        </TouchableOpacity>
                        <Field
                          style={{ flex: 1 }}
                          label={`Phương án ${i + 1}`}
                          value={op.text}
                          onChangeText={(v) => {
                            const opts = (item.options || []).map((o) =>
                              o.id === op.id ? { ...o, text: v } : o,
                            );
                            updateQuestion(item.id, { options: opts });
                          }}
                          placeholder="Nội dung phương án"
                        />
                        <IconBtn
                          name="close"
                          onPress={() => {
                            const opts = (item.options || []).filter((o) => o.id !== op.id);
                            updateQuestion(item.id, { options: opts });
                          }}
                        />
                      </Row>
                    ))}
                    <TouchableOpacity
                      onPress={() => {
                        const opts = [...(item.options || []), { id: uid(), text: '' }];
                        updateQuestion(item.id, { options: opts });
                      }}
                      style={addBtnStyle}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '700' }}>
                        Thêm phương án
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.type === 'short_answer' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={labelStyle}>Đáp án chấp nhận</Text>
                    {item.answers?.map((ans, i) => (
                      <Row key={i}>
                        <Field
                          style={{ flex: 1 }}
                          label={`Đáp án ${i + 1}`}
                          value={ans}
                          onChangeText={(v) => {
                            const arr = (item.answers || []).map((a, idx) =>
                              idx === i ? v : a,
                            );
                            updateQuestion(item.id, { answers: arr });
                          }}
                          placeholder="VD: 62"
                        />
                        <IconBtn
                          name="close"
                          onPress={() => {
                            const arr = (item.answers || []).filter((_, idx) => idx !== i);
                            updateQuestion(item.id, { answers: arr });
                          }}
                        />
                      </Row>
                    ))}
                    <TouchableOpacity
                      onPress={() => {
                        const arr = [...(item.answers || []), ''];
                        updateQuestion(item.id, { answers: arr });
                      }}
                      style={addBtnStyle}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '700' }}>
                        Thêm đáp án
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {item.type === 'multi_step' && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={labelStyle}>Các bước giải</Text>
                    {item.steps?.map((st, i) => (
                      <View key={i} style={{ marginBottom: 8 }}>
                        <Area
                          label={`Bước ${i + 1} – Yêu cầu`}
                          value={st.prompt}
                          onChangeText={(v) => {
                            const steps = (item.steps || []).map((s, idx) =>
                              idx === i ? { ...s, prompt: v } : s,
                            );
                            updateQuestion(item.id, { steps });
                          }}
                          placeholder="Mô tả yêu cầu bước này"
                        />
                        <Field
                          label="Đáp án/điểm mấu chốt (tuỳ chọn)"
                          value={st.answer || ''}
                          onChangeText={(v) => {
                            const steps = (item.steps || []).map((s, idx) =>
                              idx === i ? { ...s, answer: v } : s,
                            );
                            updateQuestion(item.id, { steps });
                          }}
                          placeholder="VD: 37 + 25 = 62"
                        />
                        <IconBtn
                          name="close"
                          onPress={() => {
                            const steps = (item.steps || []).filter((_, idx) => idx !== i);
                            updateQuestion(item.id, { steps });
                          }}
                        />
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={() => {
                        const steps = [...(item.steps || []), { prompt: '', answer: '' }];
                        updateQuestion(item.id, { steps });
                      }}
                      style={addBtnStyle}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                      <Text style={{ color: '#fff', marginLeft: 6, fontWeight: '700' }}>
                        Thêm bước
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Area
                  label="Lời giải/Đáp số"
                  value={item.solution || ''}
                  onChangeText={(v) => updateQuestion(item.id, { solution: v })}
                  placeholder="Trình bày lời giải hoặc đáp số cuối cùng"
                />
              </View>
            )}
          />

          <SaveBar onSave={save} saving={saving} />

          {/* Pickers cho Điểm & Mức */}
          <WheelPickerModal
            visible={!!qPointsPicker}
            onClose={() => setQPointsPicker(undefined)}
            selectedValue={questions.find((q) => q.id === qPointsPicker)?.points || 1}
            items={pointsItems}
            onChange={(v) => {
              if (qPointsPicker) updateQuestion(qPointsPicker, { points: Number(v) });
              setQPointsPicker(undefined);
            }}
          />
          <WheelPickerModal
            visible={!!qLevelPicker}
            onClose={() => setQLevelPicker(undefined)}
            selectedValue={questions.find((q) => q.id === qLevelPicker)?.level || 1}
            items={levelItems}
            onChange={(v) => {
              if (qLevelPicker) updateQuestion(qLevelPicker, { level: v });
              setQLevelPicker(undefined);
            }}
          />
        </View>
      )}

      {/* Tab: Xem trước */}
      {tab === 'preview' && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(paddingBottom, kb + 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 }}>
            {title || '—'}
          </Text>
          <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>
            Lớp {grade || '—'} • {chapter || '—'} → {unit || '—'} • {topicType || '—'}
          </Text>
          <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>
            Bộ sách: {bookName}
            {bookEdition ? ` (${bookEdition})` : ''} • Độ khó:{' '}
            {DIFFS.find((d) => d.key === difficulty)?.label}
          </Text>
          <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>
            Thời lượng: {timeLimitMin ? `${timeLimitMin} phút` : '—'} • Trạng thái:{' '}
            {status === 'draft' ? 'Nháp' : 'Phát hành'}
          </Text>
          {!!objectives && (
            <Text style={{ color: '#cbd5e1', marginBottom: 8 }}>Mục tiêu: {objectives}</Text>
          )}
          {!!tags && <Text style={{ color: '#cbd5e1', marginBottom: 12 }}>Tags: {tags}</Text>}
          {!!content && <Text style={{ color: '#e5e7eb', marginBottom: 16 }}>{content}</Text>}

          <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginBottom: 16 }} />

          {questions.map((q, idx) => (
            <View key={q.id} style={{ marginBottom: 16 }}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>
                Câu {idx + 1} ({Q_TYPES.find((t) => t.key === q.type)?.label}) • {q.points} điểm
              </Text>
              <Text style={{ color: '#e5e7eb', marginTop: 4 }}>{q.prompt}</Text>
              {q.type === 'mcq' &&
                q.options?.map((o) => (
                  <Text key={o.id} style={{ color: '#cbd5e1', marginLeft: 12, marginTop: 2 }}>
                    • {o.text}
                  </Text>
                ))}
              {q.type === 'short_answer' && (
                <Text style={{ color: '#94a3b8', marginTop: 4 }}>
                  Đáp án đúng (mẫu): {q.answers?.filter(Boolean).join(', ')}
                </Text>
              )}
              {q.type === 'multi_step' &&
                q.steps?.map((s, i) => (
                  <Text key={i} style={{ color: '#cbd5e1', marginLeft: 12, marginTop: 2 }}>
                    Bước {i + 1}: {s.prompt} {s.answer ? `→ ${s.answer}` : ''}
                  </Text>
                ))}
              {q.hint ? <Text style={{ color: '#60a5fa', marginTop: 6 }}>Gợi ý: {q.hint}</Text> : null}
              {q.solution ? (
                <Text style={{ color: '#10b981', marginTop: 4 }}>Lời giải: {q.solution}</Text>
              ) : null}
            </View>
          ))}

          <SaveBar onSave={save} saving={saving} />
        </ScrollView>
      )}

      {/* Tab: Cài đặt */}
      {tab === 'settings' && (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: Math.max(paddingBottom, kb + 24) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
        >
          <View style={{ marginBottom: 12 }}>
            <Text style={labelStyle}>Trạng thái</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip selected={status === 'draft'} onPress={() => setStatus('draft')}>
                Nháp
              </Chip>
              <Chip selected={status === 'published'} onPress={() => setStatus('published')}>
                Phát hành
              </Chip>
            </View>
          </View>

          <Row>
            <Field
              style={{ flex: 1, marginRight: 8 }}
              label="Phiên bản"
              value={String(version)}
              onChangeText={(v) => setVersion(Number(v) || 1)}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              onLongPress={() => setCoverImage(null)} // giữ để xoá ảnh bìa
              onPress={async () => {
                const url = await pickImageAndUpload(`lessons/${editId || 'temp'}/cover`);
                if (url) setCoverImage(url);
              }}
              style={{
                flex: 1,
                marginLeft: 8,
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: 12,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#e5e7eb', fontWeight: '700', marginBottom: 6 }}>Ảnh bìa</Text>
              <Text style={{ color: '#94a3b8', textAlign: 'center' }}>
                {coverImage === undefined
                  ? 'Chọn/Upload ảnh bìa'
                  : coverImage === null
                  ? 'Sẽ xoá ảnh bìa khi lưu (giữ để hoàn tác bằng cách chọn ảnh mới)'
                  : 'Đã chọn • Nhấn để thay (giữ để xoá)'}
              </Text>
            </TouchableOpacity>
          </Row>

          <SaveBar onSave={save} saving={saving} />
        </ScrollView>
      )}

      {/* Nút ẩn bàn phím (tuỳ chọn) */}
      {kb > 0 && (
        <TouchableOpacity
          onPress={() => Keyboard.dismiss()}
          style={{
            position: 'absolute',
            right: 16,
            bottom: kb + 12,
            backgroundColor: 'rgba(255,255,255,0.15)',
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.25)',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Ẩn bàn phím</Text>
        </TouchableOpacity>
      )}

      {/* Action Menu cho câu hỏi */}
      <ActionMenu
        visible={qMenu.visible}
        title={`Câu ${(qMenu.index ?? 0) + 1} – thao tác`}
        options={[
          { label: 'Di chuyển lên',    onPress: () => qMenu.qid && moveQuestion(qMenu.qid, -1) },
          { label: 'Di chuyển xuống',  onPress: () => qMenu.qid && moveQuestion(qMenu.qid,  1) },
          { label: 'Nhân bản',         onPress: () => qMenu.qid && duplicateQuestion(qMenu.qid) },
          { label: 'Xoá câu hỏi',      destructive: true, onPress: () => qMenu.qid && removeQuestion(qMenu.qid) },
        ]}
        onClose={closeQMenu}
      />
    </KeyboardAvoidingView>
  );

  /* ---------- Handlers: Questions ---------- */
  function addQuestion(type: Question['type']) {
    const q: Question = {
      id: uid(),
      type,
      prompt: '',
      points: 1,
      level: 1,
      options:
        type === 'mcq'
          ? [
              { id: uid(), text: 'A' },
              { id: uid(), text: 'B' },
              { id: uid(), text: 'C' },
              { id: uid(), text: 'D' },
            ]
          : undefined,
      answers: type === 'short_answer' ? [''] : undefined,
      steps: type === 'multi_step' ? [{ prompt: '', answer: '' }] : undefined,
    };
    setQuestions((prev) => [...prev, q]);
  }

  function updateQuestion(id: string, patch: Partial<Question>) {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }

  function removeQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  }

  function moveQuestion(id: string, dir: -1 | 1) {
    setQuestions((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  async function pickQuestionImage(qid: string) {
    const url = await pickImageAndUpload(`lessons/${editId || 'temp'}/questions`);
    if (url) updateQuestion(qid, { image: url });
  }
}

/* ---------- Reusable UI ---------- */
function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row' }}>{children}</View>;
}

const labelStyle = { color: '#e5e7eb', marginBottom: 6, fontWeight: '700' } as const;

function Field(props: any) {
  const { style, ...rest } = props;
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={labelStyle}>{props.label}</Text>
      <TextInput
        {...rest}
        style={{
          color: '#fff',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
        }}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function Area(props: any) {
  const { style, ...rest } = props;
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={labelStyle}>{props.label}</Text>
      <TextInput
        {...rest}
        multiline
        numberOfLines={6}
        style={{
          color: '#fff',
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: 'top',
          minHeight: 120,
        }}
        placeholderTextColor="#94a3b8"
      />
    </View>
  );
}

function Chip({
  children,
  selected,
  onPress,
}: {
  children: React.ReactNode;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: selected ? '#3b82f6' : 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700' }}>{children}</Text>
    </TouchableOpacity>
  );
}

function IconBtn({
  name,
  onPress,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
      }}
    >
      <Ionicons name={name} size={16} color="#fff" />
    </TouchableOpacity>
  );
}

const addBtnStyle = {
  marginTop: 6,
  flexDirection: 'row',
  alignItems: 'center',
  alignSelf: 'flex-start',
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 10,
} as const;

function SaveBar({ onSave, saving }: { onSave: () => void; saving: boolean }) {
  return (
    <TouchableOpacity
      onPress={onSave}
      disabled={saving}
      style={{
        marginTop: 16,
        backgroundColor: saving ? 'rgba(59,130,246,0.35)' : '#3b82f6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '800' }}>
        {saving ? 'Đang lưu...' : 'Lưu bài học'}
      </Text>
    </TouchableOpacity>
  );
}

function FieldPicker({ label, value, display, onPress, style }: any) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      <Text style={{ color: '#e5e7eb', marginBottom: 6, fontWeight: '700' }}>{label}</Text>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: 'rgba(255,255,255,0.06)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: value == null || value === '' ? '#94a3b8' : '#fff' }}>
          {display || 'Chọn'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function WheelPickerModal({
  visible,
  onClose,
  selectedValue,
  items,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  selectedValue: any;
  items: { label: string; value: any }[];
  onChange: (v: any) => void;
}) {
  const { height } = useWindowDimensions();
  const panelH = Math.min(height * 0.48, 420);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <SafeAreaView
          style={{
            backgroundColor: '#111827',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: 'hidden',
            height: panelH,
          }}
        >
          <View
            style={{
              padding: 12,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: '#60a5fa', fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ color: '#fff', fontWeight: '800' }}>Chọn</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Vạch chọn giữa */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: panelH / 2 - 20,
              height: 40,
              borderTopWidth: 1,
              borderBottomWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
            }}
          />

          <Picker
            selectedValue={selectedValue}
            onValueChange={(v) => onChange(v)}
            itemStyle={{ color: '#fff' }}
            style={{ flex: 1 }}
          >
            {items.map((it) => (
              <Picker.Item key={String(it.value)} label={it.label} value={it.value} />
            ))}
          </Picker>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ActionMenu({
  visible,
  title,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  options: { label: string; onPress: () => void; destructive?: boolean }[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
      >
        <SafeAreaView
          style={{
            backgroundColor: '#111827',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            paddingBottom: 8,
            overflow: 'hidden',
          }}
        >
          {!!title && (
            <Text style={{ color: '#fff', fontWeight: '800', padding: 16, paddingBottom: 8 }}>
              {title}
            </Text>
          )}
          {options.map((opt, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => { opt.onPress(); onClose(); }}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderTopWidth: i === 0 ? 0 : 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <Text
                style={{
                  color: opt.destructive ? '#f87171' : '#e5e7eb',
                  fontWeight: opt.destructive ? '800' : '700',
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onClose} style={{ padding: 16 }}>
            <Text style={{ color: '#60a5fa', fontWeight: '700', textAlign: 'center' }}>Đóng</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </TouchableOpacity>
    </Modal>
  );
}
