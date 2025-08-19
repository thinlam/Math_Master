import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ItemType = 'pdf' | 'video' | 'exercise' | 'note' | 'link';

export default function CreateLibrary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState(''); // với pdf/video có thể dùng như mô tả
  const [grade, setGrade] = useState('');
  const [type, setType] = useState<ItemType>('pdf');
  const [url, setUrl] = useState('');         // link pdf/video
  const [tags, setTags] = useState('');       // nhập dạng "hình học, lớp5"
  const [level, setLevel] = useState<'basic' | 'advanced'>('basic'); // <-- Cơ bản / Nâng cao
  const [loading, setLoading] = useState(false);

  const premium = level === 'advanced';

  const TYPES: ItemType[] = useMemo(() => ['pdf', 'video', 'exercise', 'note', 'link'], []);

  async function handleSave() {
    if (!title || !grade) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng nhập đủ tiêu đề và lớp.');
      return;
    }
    const gradeNum = Number(grade);
    if (Number.isNaN(gradeNum) || gradeNum < 1 || gradeNum > 12) {
      Alert.alert('Sai dữ liệu', 'Trường lớp phải là số từ 1 đến 12.');
      return;
    }

    try {
      setLoading(true);
      const id = Date.now().toString();

      const payload = {
        id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        content: content.trim() || null,
        grade: gradeNum,
        type,
        url: url.trim() || null,
        tags: tags
          ? tags
              .split(',')
              .map(t => t.trim())
              .filter(Boolean)
          : [],
        premium, // <-- quan trọng
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Đồng bộ với list dùng collection "library"
      await setDoc(doc(db, 'library', id), payload);

      Alert.alert('Thành công', premium ? 'Đã thêm tài liệu Nâng cao.' : 'Đã thêm tài liệu Cơ bản.');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể lưu.');
    } finally {
      setLoading(false);
    }
  }

  const Chip = ({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#4F46E5' : '#D1D5DB',
        backgroundColor: active ? '#EEF2FF' : '#FFFFFF',
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text style={{ fontWeight: '700', color: active ? '#4F46E5' : '#374151' }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={{ flex: 1, paddingTop: insets.top + 10, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <StatusBar barStyle="dark-content" />

      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
        Thêm tài liệu
      </Text>

      {/* Level: Cơ bản / Nâng cao */}
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mức độ</Text>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Chip
          active={level === 'basic'}
          label="Cơ bản"
          onPress={() => setLevel('basic')}
        />
        <Chip
          active={level === 'advanced'}
          label="Nâng cao (Premium)"
          onPress={() => setLevel('advanced')}
        />
      </View>

      {/* Title */}
      <TextInput
        placeholder="Tiêu đề"
        value={title}
        onChangeText={setTitle}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      {/* Subtitle */}
      <TextInput
        placeholder="Mô tả ngắn"
        value={subtitle}
        onChangeText={setSubtitle}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      {/* Type */}
      <Text style={{ fontWeight: '700', marginBottom: 6 }}>Loại tài liệu</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
        {TYPES.map(t => (
          <Chip key={t} active={type === t} label={t.toUpperCase()} onPress={() => setType(t)} />
        ))}
      </View>

      {/* URL (nếu có) */}
      <TextInput
        placeholder={type === 'pdf' ? 'URL file PDF' : type === 'video' ? 'URL video' : 'URL (nếu có)'}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      {/* Content / mô tả chi tiết */}
      <TextInput
        placeholder="Nội dung / ghi chú (tuỳ chọn)"
        value={content}
        onChangeText={setContent}
        multiline
        numberOfLines={8}
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          textAlignVertical: 'top',
          marginBottom: 12,
          minHeight: 150,
        }}
      />

      {/* Grade */}
      <TextInput
        placeholder="Lớp (VD: 1, 2, 3...)"
        value={grade}
        onChangeText={setGrade}
        keyboardType="numeric"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 12,
        }}
      />

      {/* Tags */}
      <TextInput
        placeholder="Tags (phân tách bằng dấu phẩy: hình học, đại số, lớp5)"
        value={tags}
        onChangeText={setTags}
        autoCapitalize="none"
        style={{
          borderWidth: 1,
          borderColor: '#ccc',
          borderRadius: 8,
          padding: 10,
          marginBottom: 20,
        }}
      />

      <TouchableOpacity
        disabled={loading}
        onPress={handleSave}
        style={{
          backgroundColor: loading ? '#aaa' : '#4F46E5',
          padding: 14,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="save-outline" size={20} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>
          {loading ? 'Đang lưu...' : 'Lưu'}
        </Text>
      </TouchableOpacity>

      {/* Hint nhỏ */}
      <Text style={{ color: '#6B7280', fontSize: 12, marginTop: 10 }}>
        * “Nâng cao (Premium)” sẽ bị khóa đối với tài khoản chưa nâng cấp. Bạn có thể chỉnh sửa lại mức độ sau khi tạo.
      </Text>
    </ScrollView>
  );
}
