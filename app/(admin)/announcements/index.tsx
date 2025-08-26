// app/(admin)/announcements/index.tsx
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Ann = { id: string; title: string; body?: string | null; createdAt?: Timestamp | null };

const C = {
  bg: '#0b1220',
  card: 'rgba(255,255,255,0.06)',
  line: 'rgba(255,255,255,0.12)',
  white: '#fff',
  text: '#e2e8f0',
  sub: '#94a3b8',
  sub2: '#64748b',
  primary: '#3b82f6',
  dangerBg: 'rgba(239,68,68,0.15)',
  dangerLine: 'rgba(239,68,68,0.4)',
  danger: '#ef4444',
};

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const canPost = title.trim().length > 0 && !posting;

  // ---- realtime subscription ----
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        Alert.alert('Lỗi', err?.message ?? 'Không tải được thông báo.');
      }
    );
    return unsub;
  }, []);

  const onRefresh = useCallback(async () => {
    // realtime đã tự cập nhật; chỉ show hiệu ứng ngắn cho cảm giác phản hồi
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  // ---- actions ----
  const create = async () => {
    if (!canPost) return;
    try {
      setPosting(true);
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        body: body.trim() ? body.trim() : null,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setBody('');
      toast('Đã đăng thông báo');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tạo được thông báo.');
    } finally {
      setPosting(false);
    }
  };

  const confirmDel = (id: string) => {
    Alert.alert('Xoá thông báo?', 'Thao tác này không thể hoàn tác.', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'announcements', id));
            toast('Đã xoá');
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không xoá được thông báo.');
          }
        },
      },
    ]);
  };

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom: 8 }}>
              {/* Header */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: C.white, fontSize: 22, fontWeight: '800' }}>Thông báo</Text>
                <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
                  <Ionicons name="close" size={26} color={C.sub} />
                </TouchableOpacity>
              </View>

              {/* Quick create card */}
              <View
                style={{
                  backgroundColor: C.card,
                  borderRadius: 16,
                  padding: 12,
                  borderWidth: 1,
                  borderColor: C.line,
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: '#e5e7eb', fontWeight: '700', marginBottom: 8 }}>
                  Tạo nhanh
                </Text>

                <TextInput
                  placeholder="Tiêu đề"
                  placeholderTextColor={C.sub}
                  value={title}
                  onChangeText={setTitle}
                  autoCapitalize="sentences"
                  returnKeyType="next"
                  style={inputStyle}
                />

                <TextInput
                  placeholder="Nội dung (tuỳ chọn)"
                  placeholderTextColor={C.sub}
                  value={body}
                  onChangeText={setBody}
                  multiline
                  numberOfLines={3}
                  style={[inputStyle, { textAlignVertical: 'top', height: 96 }]}
                />

                <TouchableOpacity
                  onPress={create}
                  disabled={!canPost}
                  style={[
                    btnStyle,
                    { opacity: canPost ? 1 : 0.5, flexDirection: 'row', gap: 8 },
                  ]}
                >
                  {posting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                  <Text style={{ color: '#fff', fontWeight: '800' }}>
                    {posting ? 'Đang đăng...' : 'Đăng'}
                  </Text>
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
            <View style={cardStyle}>
              <Text style={{ color: C.text, fontWeight: '800' }}>{item.title}</Text>
              {!!item.body && (
                <Text style={{ color: C.sub, marginTop: 4, lineHeight: 20 }}>{item.body}</Text>
              )}

              <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Text style={{ color: C.sub2, fontSize: 12 }}>
                  {formatDateSafe(item.createdAt)}
                </Text>

                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(
                      `${item.title}${item.body ? '\n' + item.body : ''}`
                    );
                    toast('Đã copy');
                  }}
                  hitSlop={6}
                >
                  <Ionicons name="copy-outline" size={16} color={C.sub2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => confirmDel(item.id)} style={delBtnStyle}>
                <Ionicons name="trash-outline" size={16} color={C.danger} />
                <Text style={{ color: C.danger, fontWeight: '700', marginLeft: 6 }}>Xoá</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 48 }}>
              {loading ? (
                <ActivityIndicator color={C.sub} />
              ) : (
                <>
                  <Ionicons name="notifications-off-outline" size={36} color={C.sub} />
                  <Text style={{ color: C.sub, marginTop: 8 }}>Chưa có thông báo.</Text>
                </>
              )}
            </View>
          }
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const inputStyle = {
  color: '#fff',
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
  borderRadius: 10,
  paddingHorizontal: 10,
  paddingVertical: 10,
  marginBottom: 8,
} as const;

const btnStyle = {
  marginTop: 10,
  backgroundColor: '#3b82f6',
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

const cardStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 14,
  padding: 12,
  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.12)',
} as const;

const delBtnStyle = {
  alignSelf: 'flex-start',
  marginTop: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
  backgroundColor: 'rgba(239,68,68,0.12)',
  borderWidth: 1,
  borderColor: 'rgba(239,68,68,0.35)',
  flexDirection: 'row',
  alignItems: 'center',
} as const;

// ===== helpers =====
function formatDateSafe(ts?: Timestamp | null) {
  if (!ts) return 'Đang đồng bộ…';
  const d = ts.toDate?.() ?? new Date();
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(
    2,
    '0'
  )}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}

function toast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
  } else {
    // iOS: nhẹ nhàng, có thể thay bằng lib toast nếu muốn
    console.log(message);
  }
}
