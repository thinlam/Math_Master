// app/(admin)/lessons/create.tsx

/* ---------- Imports ---------- */
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Main Component ---------- */
export default function CreateLessonScreen() {
    /* ---------- Hooks & Params ---------- */
    const { editId } = useLocalSearchParams<{ editId?: string }>();
    const insets = useSafeAreaInsets();
    const router = useRouter();

    /* ---------- States ---------- */
    const [title, setTitle] = useState('');
    const [grade, setGrade] = useState<string>('');
    const [content, setContent] = useState(''); // Có thể lưu rich text hoặc mảng tùy nhu cầu
    const [saving, setSaving] = useState(false);

    /* ---------- Load Data If Edit Mode ---------- */
    useEffect(() => {
        const load = async () => {
            if (!editId) return;
            const snap = await getDoc(doc(db, 'lessons', String(editId)));
            if (snap.exists()) {
                const d = snap.data() as any;
                setTitle(d.title || '');
                setGrade(String(d.grade ?? ''));
                setContent(d.content || '');
            }
        };
        load();
    }, [editId]);

    /* ---------- Save Lesson ---------- */
    const save = async () => {
        if (!title.trim()) {
            Alert.alert('Thiếu', 'Nhập tiêu đề bài học.');
            return;
        }
        try {
            setSaving(true);
            if (editId) {
                // Cập nhật bài học
                await updateDoc(doc(db, 'lessons', String(editId)), {
                    title: title.trim(),
                    grade: grade || null,
                    content: content || null,
                    updatedAt: serverTimestamp(),
                });
            } else {
                // Tạo mới bài học
                const id = doc(collection(db, 'lessons')).id;
                await setDoc(doc(db, 'lessons', id), {
                    title: title.trim(),
                    grade: grade || null,
                    content: content || null,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
            }
            Alert.alert(
                'Thành công',
                editId ? 'Đã cập nhật bài học.' : 'Đã tạo bài học.'
            );
            router.back();
        } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Lưu bài học thất bại.');
        } finally {
            setSaving(false);
        }
    };

    /* ---------- Safe Area Padding ---------- */
    const paddingTop = Math.max(insets.top - 8, 0);
    const paddingBottom = Math.max(insets.bottom, 16);

    /* ---------- Render ---------- */
    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: '#0b1220' }}
            contentContainerStyle={{ padding: 16, paddingTop, paddingBottom }}
        >
            {/* StatusBar */}
            <StatusBar
                translucent
                barStyle="light-content"
                backgroundColor={Platform.select({
                    android: 'transparent',
                    ios: 'transparent',
                })}
            />

            {/* ---------- Header ---------- */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                }}
            >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>
                    {editId ? 'Sửa bài học' : 'Tạo bài học'}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{ padding: 8 }}
                >
                    <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* ---------- Form Fields ---------- */}
            <Field
                label="Tiêu đề"
                value={title}
                onChangeText={setTitle}
                placeholder="Ví dụ: Từ vựng chủ đề Family"
            />
            <Field
                label="Lớp"
                value={grade}
                onChangeText={setGrade}
                placeholder="Ví dụ: 3"
                keyboardType="number-pad"
            />
            <Area
                label="Nội dung"
                value={content}
                onChangeText={setContent}
                placeholder="Mô tả/ghi chú bài học..."
            />

            {/* ---------- Save Button ---------- */}
            <TouchableOpacity
                onPress={save}
                disabled={saving}
                style={{
                    marginTop: 16,
                    backgroundColor: saving
                        ? 'rgba(59,130,246,0.35)'
                        : '#3b82f6',
                    paddingVertical: 14,
                    borderRadius: 12,
                    alignItems: 'center',
                }}
            >
                <Text style={{ color: '#fff', fontWeight: '800' }}>
                    {saving
                        ? 'Đang lưu...'
                        : editId
                        ? 'Lưu thay đổi'
                        : 'Tạo mới'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

/* ---------- Sub Components ---------- */
function Field(props: any) {
    return (
        <View style={{ marginBottom: 12 }}>
            <Text
                style={{
                    color: '#e5e7eb',
                    marginBottom: 6,
                    fontWeight: '700',
                }}
            >
                {props.label}
            </Text>
            <TextInput
                {...props}
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
    return (
        <View style={{ marginBottom: 12 }}>
            <Text
                style={{
                    color: '#e5e7eb',
                    marginBottom: 6,
                    fontWeight: '700',
                }}
            >
                {props.label}
            </Text>
            <TextInput
                {...props}
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
