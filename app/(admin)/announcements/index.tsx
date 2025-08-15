// app/(admin)/announcements/index.tsx
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    RefreshControl,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Ann = { id: string; title: string; body?: string; createdAt?: Timestamp | null };

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
      const rs = await getDocs(q);
      setList(rs.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được thông báo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const create = async () => {
    if (!title.trim()) {
      Alert.alert('Thiếu', 'Nhập tiêu đề thông báo.');
      return;
    }
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim() || null,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setBody('');
      await load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tạo được thông báo.');
    }
  };

  const del = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', id));
      setList((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không xoá được thông báo.');
    }
  };

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      <FlatList
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom: 8 }}>
            {/* Tiêu đề + nút X */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Thông báo</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="close" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Tạo nhanh */}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#e5e7eb', fontWeight: '700', marginBottom: 8 }}>Tạo nhanh</Text>
              <TextInput
                placeholder="Tiêu đề"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
                style={{
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  marginBottom: 8,
                }}
              />
              <TextInput
                placeholder="Nội dung (tuỳ chọn)"
                placeholderTextColor="#94a3b8"
                value={body}
                onChangeText={setBody}
                multiline
                numberOfLines={3}
                style={{
                  color: '#fff',
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              />
              <TouchableOpacity
                onPress={create}
                style={{
                  marginTop: 10,
                  backgroundColor: '#3b82f6',
                  paddingVertical: 10,
                  borderRadius: 10,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800' }}>Đăng</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: paddingBottom + 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>{item.title}</Text>
            {!!item.body && <Text style={{ color: '#94a3b8', marginTop: 4 }}>{item.body}</Text>}
            {!!item.createdAt && (
              <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>
                {formatDate(item.createdAt)}
              </Text>
            )}

            <TouchableOpacity
              onPress={() => del(item.id)}
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: 'rgba(239,68,68,0.15)',
                borderWidth: 1,
                borderColor: 'rgba(239,68,68,0.4)',
              }}
            >
              <Text style={{ color: '#ef4444', fontWeight: '700' }}>Xoá</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
            {loading ? 'Đang tải...' : 'Chưa có thông báo.'}
          </Text>
        }
      />
    </View>
  );
}

function formatDate(ts: Timestamp) {
  const d = ts.toDate();
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}
