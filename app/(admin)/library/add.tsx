import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CreateLibrary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [grade, setGrade] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!title || !content || !grade) {
      Alert.alert('Thiếu dữ liệu', 'Vui lòng nhập đủ tiêu đề, nội dung và lớp.');
      return;
    }

    try {
      setLoading(true);
      const id = Date.now().toString();

      await setDoc(doc(db, 'libraryItems', id), {
        id,
        title,
        subtitle,
        content,
        grade: Number(grade),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Thành công', 'Đã thêm tài liệu.');
      router.back();
    } catch (err) {
      console.error(err);
      Alert.alert('Lỗi', 'Không thể lưu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, paddingTop: insets.top + 10, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16 }}
    >
      <StatusBar barStyle="dark-content" />

      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
        Thêm tài liệu
      </Text>

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

      <TextInput
        placeholder="Nội dung"
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
    </ScrollView>
  );
}
