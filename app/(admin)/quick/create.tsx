// app/(admin)/quick/create.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Firebase */
import { db } from '@/scripts/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

type Option = { id: string; text: string; correct?: boolean };
type Question = { id: string; text: string; options: Option[] };

const C = {
  bg: '#0b1220',
  card: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.12)',
  text: 'white',
  sub: 'rgba(255,255,255,0.7)',
  good: '#21d07a',
  bad: '#ff5a5f',
};

function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export default function AdminQuickCreate() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [klass, setKlass] = useState<number>(1);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: uid('q'),
      text: '',
      options: [
        { id: uid('o'), text: '', correct: true },
        { id: uid('o'), text: '' },
        { id: uid('o'), text: '' },
      ],
    },
  ]);

  const canSave = useMemo(() => title.trim().length > 0 && klass >= 1, [title, klass]);

  function addQuestion() {
    setQuestions(prev => [
      ...prev,
      {
        id: uid('q'),
        text: '',
        options: [
          { id: uid('o'), text: '', correct: true },
          { id: uid('o'), text: '' },
          { id: uid('o'), text: '' },
        ],
      },
    ]);
  }

  function removeQuestion(qid: string) {
    setQuestions(prev => prev.filter(q => q.id !== qid));
  }

  function updateQuestion(qid: string, patch: Partial<Question>) {
    setQuestions(prev => prev.map(q => (q.id === qid ? { ...q, ...patch } : q)));
  }

  function addOption(qid: string) {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== qid) return q;
        return { ...q, options: [...q.options, { id: uid('o'), text: '' }] };
      }),
    );
  }

  function removeOption(qid: string, oid: string) {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== qid) return q;
        const next = q.options.filter(o => o.id !== oid);
        if (!next.some(o => o.correct) && next.length > 0) next[0].correct = true; // giữ đúng 1 đáp án đúng
        return { ...q, options: next };
      }),
    );
  }

  function setCorrect(qid: string, oid: string) {
    setQuestions(prev =>
      prev.map(q => {
        if (q.id !== qid) return q;
        return {
          ...q,
          options: q.options.map(o => ({ ...o, correct: o.id === oid })),
        };
      }),
    );
  }

  function validate(): string | null {
    if (!title.trim()) return 'Vui lòng nhập tiêu đề.';
    if (!klass || klass < 1) return 'Chọn lớp hợp lệ.';
    if (questions.length === 0) return 'Cần ít nhất 1 câu hỏi.';
    for (const [i, q] of questions.entries()) {
      if (!q.text.trim()) return `Câu ${i + 1}: chưa có nội dung.`;
      if (q.options.length < 2) return `Câu ${i + 1}: cần ít nhất 2 đáp án.`;
      const correctCount = q.options.filter(o => o.correct).length;
      if (correctCount !== 1) return `Câu ${i + 1}: phải có đúng 1 đáp án đúng.`;
      for (const [j, o] of q.options.entries()) {
        if (!o.text.trim()) return `Câu ${i + 1}, đáp án ${j + 1}: trống.`;
      }
    }
    return null;
  }

  async function onSave() {
    const err = validate();
    if (err) {
      Alert.alert('Thiếu thông tin', err);
      return;
    }
    if (saving) return; // chặn bấm nhiều lần

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        titleSearch: title.trim().toLowerCase(),
        class: klass,
        questions: questions.map(q => ({
          id: q.id,
          text: q.text.trim(),
          options: q.options.map(o => ({
            id: o.id,
            text: o.text.trim(),
            correct: !!o.correct,
          })),
        })),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'quick_practice'), payload);

      // Điều hướng ngay về danh sách Quick
      router.replace('/(admin)/quick');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e?.message || 'Không thể tạo Quick.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: C.line,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" color={C.text} size={22} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: '800', marginLeft: 8, flex: 1 }}>
          Tạo Quick
        </Text>
        <TouchableOpacity
          onPress={onSave}
          disabled={!canSave || saving}
          style={{ opacity: !canSave || saving ? 0.5 : 1 }}
        >
          <Text style={{ color: C.good, fontWeight: '800' }}>
            {saving ? 'Đang lưu…' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {/* Title */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: C.sub, fontSize: 12, marginBottom: 6 }}>Tiêu đề</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="VD: Quick cộng trừ lớp 1"
            placeholderTextColor={C.sub}
            style={{ color: C.text, fontSize: 16 }}
          />
        </View>

        {/* Class */}
        <View
          style={{
            backgroundColor: C.card,
            borderRadius: 14,
            padding: 12,
            borderWidth: 1,
            borderColor: C.line,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: C.sub, fontSize: 12, marginBottom: 6 }}>Lớp</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => {
              const active = klass === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setKlass(v)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: active ? 'rgba(33,208,122,0.25)' : C.card,
                    borderWidth: 1,
                    borderColor: active ? C.good : C.line,
                  }}
                >
                  <Text style={{ color: C.text, fontWeight: active ? '800' : '600' }}>
                    Lớp {v}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Questions */}
        <Text style={{ color: C.text, fontWeight: '800', marginBottom: 8 }}>Câu hỏi</Text>
        {questions.map((q, idx) => (
          <View
            key={q.id}
            style={{
              backgroundColor: C.card,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: C.line,
              marginBottom: 12,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: C.text, fontWeight: '800', fontSize: 16, flex: 1 }}>
                Câu {idx + 1}
              </Text>
              <TouchableOpacity onPress={() => removeQuestion(q.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={C.bad} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={q.text}
              onChangeText={t => updateQuestion(q.id, { text: t })}
              placeholder="Nhập nội dung câu hỏi"
              placeholderTextColor={C.sub}
              style={{ color: C.text, fontSize: 15, marginBottom: 8 }}
            />

            {/* Options */}
            {q.options.map((op, j) => (
              <View
                key={op.id}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}
              >
                <TouchableOpacity onPress={() => setCorrect(q.id, op.id)} style={{ padding: 6 }}>
                  <Ionicons
                    name={op.correct ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={op.correct ? C.good : C.sub}
                  />
                </TouchableOpacity>
                <TextInput
                  value={op.text}
                  onChangeText={t => {
                    const opts = q.options.map(o => (o.id === op.id ? { ...o, text: t } : o));
                    updateQuestion(q.id, { options: opts });
                  }}
                  placeholder={`Đáp án ${j + 1}`}
                  placeholderTextColor={C.sub}
                  style={{
                    color: C.text,
                    flex: 1,
                    borderBottomWidth: 1,
                    borderColor: C.line,
                    paddingVertical: 6,
                  }}
                />
                <TouchableOpacity onPress={() => removeOption(q.id, op.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={C.sub} />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              onPress={() => addOption(q.id)}
              style={{ alignSelf: 'flex-start', marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}
            >
              <Ionicons name="add-circle-outline" color={C.text} size={18} />
              <Text style={{ color: C.text, fontWeight: '700' }}>Thêm đáp án</Text>
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity
          onPress={addQuestion}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="add" color={C.text} size={18} />
          <Text style={{ color: C.text, fontWeight: '800' }}>Thêm câu hỏi</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
