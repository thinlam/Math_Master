// app/(admin)/announcements/index.tsx
import { auth, db } from '@/scripts/firebase';
import { useRouter } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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
  danger: '#ef4444',
};

// true = dùng custom claims; false = dùng users/{uid}.role
const USE_CLAIMS = false;

async function checkIsAdmin(u: User | null): Promise<boolean> {
  if (!u) return false;
  try {
    if (USE_CLAIMS) {
      await u.getIdToken(true);
      const res = await u.getIdTokenResult();
      return !!(res?.claims as any)?.admin;
    } else {
      const usnap = await getDoc(doc(db, 'users', u.uid));
      return usnap.exists() && usnap.data()?.role === 'admin';
    }
  } catch (e) {
    console.log('[ANN][checkIsAdmin] error:', e);
    return false;
  }
}

export default function AnnouncementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [list, setList] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const canPost = title.trim().length > 0 && !posting && isAdmin;

  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  // auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        Alert.alert('Yêu cầu đăng nhập', 'Bạn cần đăng nhập để thao tác.', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
        return;
      }
      setCheckingAdmin(true);
      const ok = await checkIsAdmin(u);
      setIsAdmin(ok);
      setCheckingAdmin(false);
    });
    return unsub;
  }, [router]);

  // realtime sub
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

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
      Alert.alert('Lỗi', `${e?.code || 'unknown'}\n${e?.message || ''}`);
    } finally {
      setPosting(false);
    }
  };

  const delAnn = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const ref = doc(db, 'announcements', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('not-found');
      await deleteDoc(ref);
      toast('Đã xoá');
    } catch (e: any) {
      console.log('[ANN][DEL] error:', e);
      Alert.alert('Lỗi xoá', `${e?.code || 'unknown'}\n${e?.message || e}`);
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // FIXED confirmDel: web dùng window.confirm
  const confirmDel = (id: string) => {
    if (Platform.OS === 'web') {
      const ok = window.confirm('Xoá thông báo? Thao tác này không thể hoàn tác.');
      if (ok) delAnn(id);
    } else {
      Alert.alert('Xoá thông báo?', 'Thao tác này không thể hoàn tác.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', style: 'destructive', onPress: () => delAnn(id) },
      ]);
    }
  };

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom: 8 }}>
              <Text style={{ color: C.white, fontSize: 22, fontWeight: '800', marginBottom: 12 }}>
                Thông báo
              </Text>
              {checkingAdmin ? (
                <ActivityIndicator color={C.sub} />
              ) : isAdmin ? (
                <View style={{ backgroundColor: C.card, borderRadius: 16, padding: 12 }}>
                  <TextInput
                    placeholder="Tiêu đề"
                    placeholderTextColor={C.sub}
                    value={title}
                    onChangeText={setTitle}
                    style={inputStyle}
                  />
                  <TextInput
                    placeholder="Nội dung (tuỳ chọn)"
                    placeholderTextColor={C.sub}
                    value={body}
                    onChangeText={setBody}
                    multiline
                    style={[inputStyle, { height: 96, textAlignVertical: 'top' }]}
                  />
                  <TouchableOpacity
                    onPress={create}
                    disabled={!canPost}
                    style={[btnStyle, { opacity: canPost ? 1 : 0.5 }]}
                  >
                    {posting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={{ color: '#fff', fontWeight: '800' }}>Đăng</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={{ color: C.sub }}>Bạn không có quyền tạo/xoá thông báo.</Text>
              )}
            </View>
          }
          data={list}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: paddingBottom + 16 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
          renderItem={({ item }) => {
            const isDeleting = deletingIds.has(item.id);
            return (
              <View style={cardStyle}>
                <Text style={{ color: C.text, fontWeight: '800' }}>{item.title}</Text>
                {!!item.body && <Text style={{ color: C.sub }}>{item.body}</Text>}
                <Text style={{ color: C.sub2, fontSize: 12 }}>
                  {formatDateSafe(item.createdAt)}
                </Text>
                {isAdmin && (
                  <TouchableOpacity
                    onPress={() => !isDeleting && confirmDel(item.id)}
                    disabled={isDeleting}
                    style={delBtnStyle}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color={C.danger} />
                    ) : (
                      <Text style={{ color: C.danger, fontWeight: '700' }}>Xoá</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
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
  padding: 10,
  marginBottom: 8,
} as const;

const btnStyle = {
  marginTop: 10,
  backgroundColor: '#3b82f6',
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
} as const;

const cardStyle = {
  backgroundColor: 'rgba(255,255,255,0.06)',
  borderRadius: 14,
  padding: 12,
  marginBottom: 10,
} as const;

const delBtnStyle = {
  marginTop: 8,
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: 'rgba(239,68,68,0.35)',
} as const;

function formatDateSafe(ts?: Timestamp | null) {
  if (!ts) return '';
  const d = (ts as any).toDate?.() ? (ts as any).toDate() : new Date();
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')} • ${d.getDate()}/${
    d.getMonth() + 1
  }/${d.getFullYear()}`;
}

function toast(message: string) {
  if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
  else console.log(message);
}
