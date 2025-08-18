// app/(admin)/users/index.tsx

/* ---------- Imports ---------- */
import { auth, db } from '@/scripts/firebase'; // <-- thêm auth
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc, // <-- quan trọng
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

/* ---------- Types & Constants ---------- */
type U = {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'premium' | 'user' | string;
  blocked?: boolean;
  createdAt?: Timestamp | null;
};

const ROLES: ('all' | 'admin' | 'premium' | 'user')[] = ['all', 'admin', 'premium', 'user'];

/* ---------- Main Component ---------- */
export default function UsersScreen() {
  /* ---------- Hooks & States ---------- */
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'premium' | 'user'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<U[]>([]);

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  // uid người đang đăng nhập
  const ME = auth?.currentUser?.uid || null;

  /* ---------- Load Users ---------- */
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const base = collection(db, 'users');
      const q =
        roleFilter === 'all'
          ? query(base, orderBy('createdAt', 'desc'), limit(100))
          : query(base, where('role', '==', roleFilter), orderBy('createdAt', 'desc'), limit(100));
      const rs = await getDocs(q);
      const data: U[] = rs.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));
      setUsers(data);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Lỗi', e?.message ?? 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* ---------- Refresh List ---------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  /* ---------- Search Filter ---------- */
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(s) || email.includes(s) || u.id.includes(s);
    });
  }, [users, search]);

  /* ---------- Toggle Block User ---------- */
  const toggleBlock = async (u: U) => {
    try {
      await updateDoc(doc(db, 'users', u.id), {
        blocked: !u.blocked,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, blocked: !u.blocked } : x)));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không cập nhật được trạng thái.');
    }
  };

  /* ---------- Change User Role (cấm đổi role chính mình) ---------- */
  const changeRole = async (u: U, newRole: U['role']) => {
    if (ME && u.id === ME) {
      return Alert.alert('Không thể đổi role', 'Bạn không thể thay đổi role của chính mình.');
    }
    try {
      await updateDoc(doc(db, 'users', u.id), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không đổi được role.');
    }
  };

  /* ---------- Delete User (cấm xóa chính mình) ---------- */
  const deleteUser = (u: U) => {
    if (ME && u.id === ME) {
      return Alert.alert('Không thể xóa', 'Bạn không thể xóa tài khoản của chính mình.');
    }
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa user "${u.name || u.email || u.id}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', u.id));
            setUsers((prev) => prev.filter((x) => x.id !== u.id));
          } catch (e: any) {
            Alert.alert('Lỗi', e?.message ?? 'Không xóa được user.');
          }
        },
      },
    ]);
  };

  /* ---------- Render ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      {/* StatusBar */}
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({
          android: 'transparent',
          ios: 'transparent',
        })}
      />

      {/* ---------- Header + Search + Filters ---------- */}
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
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Quản lý user</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginBottom: 10,
          }}
        >
          <Ionicons name="search" size={16} color="#a3b0c2" />
          <TextInput
            placeholder="Tìm theo tên, email, uid…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={{ color: '#fff', flex: 1 }}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Role filter pills */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {ROLES.map((r) => {
            const active = r === roleFilter;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: active ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text
                  style={{
                    color: '#e5e7eb',
                    fontWeight: active ? '800' : '600',
                    textTransform: 'capitalize',
                  }}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ---------- User List ---------- */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: paddingBottom + 16,
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isSelf = ME && item.id === ME;
          return (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              {/* User Info */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#e2e8f0', fontWeight: '800' }} numberOfLines={1}>
                    {item.name || item.email || item.id}
                    {isSelf ? ' (Bạn)' : ''}
                  </Text>
                  {!!item.email && <Text style={{ color: '#94a3b8', marginTop: 2 }}>{item.email}</Text>}
                  {!!item.createdAt && (
                    <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>
                      {formatDate(item.createdAt)}
                    </Text>
                  )}
                </View>

                {/* Role badge */}
                <RoleBadge role={(item.role as any) ?? 'user'} />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {/* Delete (disabled nếu là chính mình) */}
                <TouchableOpacity
                  disabled={!!isSelf}
                  onPress={() => deleteUser(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.4)',
                    opacity: isSelf ? 0.5 : 1,
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Delete</Text>
                </TouchableOpacity>

                {/* Block / Unblock (vẫn cho phép tự khóa/mở nếu bạn muốn; nếu không thì disable tương tự isSelf) */}
                <TouchableOpacity
                  onPress={() => toggleBlock(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: item.blocked ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                    borderWidth: 1,
                    borderColor: item.blocked ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)',
                  }}
                >
                  <Ionicons
                    name={item.blocked ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={16}
                    color={item.blocked ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={{ color: item.blocked ? '#22c55e' : '#ef4444', fontWeight: '700' }}>
                    {item.blocked ? 'Unblock' : 'Block'}
                  </Text>
                </TouchableOpacity>

                {/* Change role (disabled nếu là chính mình) */}
                {(['admin', 'premium', 'user'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    disabled={!!isSelf}
                    onPress={() => changeRole(item, r)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      backgroundColor:
                        (item.role ?? 'user') === r ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor:
                        (item.role ?? 'user') === r ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)',
                      opacity: isSelf ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#e5e7eb', fontWeight: '700', textTransform: 'capitalize' }}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>
            {loading ? 'Đang tải...' : 'Không có người dùng.'}
          </Text>
        }
      />
    </View>
  );
}

/* ---------- Sub Components ---------- */
function RoleBadge({ role }: { role: string }) {
  const map: Record<
    string,
    {
      label: string;
      bg: string;
      color: string;
      icon: React.ComponentProps<typeof Ionicons>['name'];
    }
  > = {
    admin: { label: 'Admin', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: 'shield-checkmark-outline' },
    premium: { label: 'Premium', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', icon: 'star-outline' },
    user: { label: 'User', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', icon: 'person-outline' },
  };
  const style = map[role] ?? map.user;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: style.bg,
      }}
    >
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={{ color: style.color, fontWeight: '700', fontSize: 12 }}>{style.label}</Text>
    </View>
  );
}

/* ---------- Utils ---------- */
function formatDate(ts?: Timestamp | null) {
  if (!ts) return '';
  const d = ts.toDate();
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}
