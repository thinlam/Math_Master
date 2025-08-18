// app/(admin)/library/add.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
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
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';

/* ---------- Cloudinary config (giống màn danh sách) ---------- */
const CLOUD_NAME = 'djf9vnngm';
const UPLOAD_PRESET = 'upload_pdf_unsigned';
const CLOUD_FOLDER = 'library';

const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export default function AddLibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Form states
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [tags, setTags] = useState('');
  const [url, setUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  /** Chọn & upload PDF lên Cloudinary -> setUrl */
  const pickPdf = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file?.uri) return;

    try {
      setUploading(true);

      const MAX_MB = 10;
      if (file.size && file.size > MAX_MB * 1024 * 1024) {
        Alert.alert('File quá lớn', `Giới hạn ${MAX_MB}MB.`);
        return;
      }

      const rnFile = {
        uri: file.uri,
        name: file.name?.endsWith('.pdf') ? file.name : (file.name || `document-${Date.now()}.pdf`),
        type: file.mimeType || 'application/pdf',
      } as any;

      const form = new FormData();
      form.append('file', rnFile);
      form.append('upload_preset', UPLOAD_PRESET);
      form.append('folder', CLOUD_FOLDER);

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
      const resp = await fetch(endpoint, { method: 'POST', body: form });
      if (!resp.ok) {
        const text = await resp.text();
        console.log('Cloudinary status:', resp.status);
        console.log('Cloudinary response:', text);
        throw new Error(`Cloudinary upload failed: ${resp.status}`);
      }
      const json = await resp.json();
      const secureUrl = json.secure_url as string;

      setUrl(secureUrl);
      Alert.alert('Thành công', 'Đã tải PDF lên Cloudinary.');
    } catch (e: any) {
      console.warn('upload pdf error', e);
      Alert.alert('Lỗi', e?.message ?? 'Tải PDF thất bại.');
    } finally {
      setUploading(false);
    }
  }, []);

  /** Lưu Firestore */
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề.');
      return;
    }
    if (!url) {
      Alert.alert('Thiếu file', 'Vui lòng chọn và tải lên PDF.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        grade: Number(grade) || 1,
        type: 'pdf' as const,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        url,
        updatedAt: serverTimestamp(),
      };
      const newRef = doc(collection(db, 'library'));
      await setDoc(newRef, payload);
      Alert.alert('Thành công', 'Đã thêm tài liệu.');
      router.back(); // quay lại danh sách
    } catch (e) {
      console.warn('save error', e);
      Alert.alert('Lỗi', 'Không thể lưu tài liệu.');
    } finally {
      setSaving(false);
    }
  }, [title, subtitle, grade, tags, url, router]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top, paddingHorizontal: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', marginLeft: 6, color: '#111827' }}>Thêm tài liệu</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
        >
          {/* Title */}
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tiêu đề *</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="VD: Đề ôn giữa kỳ Toán 3"
            style={{
              borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
              paddingHorizontal: 12, height: 44, marginBottom: 12,
            }}
          />

          {/* Subtitle */}
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mô tả ngắn</Text>
          <TextInput
            value={subtitle}
            onChangeText={setSubtitle}
            placeholder="Theo SGK Kết nối tri thức…"
            style={{
              borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
              paddingHorizontal: 12, height: 44, marginBottom: 12,
            }}
          />

          {/* Grade */}
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Lớp *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginBottom: 12 }}>
            {GRADES.map(g => {
              const active = grade === g;
              return (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGrade(g)}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8,
                    backgroundColor: active ? '#4F46E5' : '#EEF2FF',
                  }}
                >
                  <Text style={{ color: active ? '#fff' : '#4F46E5', fontWeight: '700' }}>Lớp {g}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Tags */}
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tags (phân cách dấu phẩy)</Text>
          <TextInput
            value={tags}
            onChangeText={setTags}
            placeholder="ôn tập, giữa kỳ, toán"
            style={{
              borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10,
              paddingHorizontal: 12, height: 44, marginBottom: 12,
            }}
          />

          {/* PDF */}
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>File PDF *</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity
              onPress={pickPdf}
              style={{
                flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827',
                paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
              }}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons name="file-upload-outline" size={18} color="#fff" />
                  <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Chọn & Tải PDF</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text numberOfLines={2} style={{ color: url ? '#065F46' : '#6B7280' }}>
                {url ? 'Đã có URL PDF' : 'Chưa chọn PDF'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: '#E5E7EB', marginRight: 10 }}
              disabled={saving || uploading}
            >
              <Text style={{ fontWeight: '700' }}>Huỷ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#4F46E5' }}
              disabled={saving || uploading}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ fontWeight: '700', color: '#fff' }}>Thêm mới</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
