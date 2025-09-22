import { UsersStyles as s } from '@/components/style/admin/UsersStyles';
import { auth, db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
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

/* ---------- Types ---------- */
type U = {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'premium' | 'user' | string;
  blocked?: boolean;
  createdAt?: Timestamp | null;
};

const ROLES: ('all' | 'admin' | 'premium' | 'user')[] = ['all', 'admin', 'premium', 'user'];

export default function UsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'premium' | 'user'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<U[]>([]);

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  const ME = auth?.currentUser?.uid || null;

  /* Load users */
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const base = collection(db, 'users');
      const q =
        roleFilter === 'all'
          ? query(base, orderBy('createdAt', 'desc'), limit(100))
          : query(base, where('role', '==', roleFilter), orderBy('createdAt', 'desc'), limit(100));
      const rs = await getDocs(q);
      const data: U[] = rs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setUsers(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) => {
      const name = (u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(s) || email.includes(s) || u.id.includes(s);
    });
  }, [users, search]);

  const toggleBlock = async (u: U) => {
    try {
      const willBlock = !u.blocked;
      await updateDoc(doc(db, 'users', u.id), {
        blocked: willBlock,
        updatedAt: serverTimestamp(),
        ...(willBlock === false ? { forceLogoutAt: serverTimestamp(), forceLogoutReason: 'unlock' } : {}),
      });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, blocked: willBlock } : x)));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không cập nhật được trạng thái.');
    }
  };

  const changeRole = async (u: U, newRole: U['role']) => {
    if (ME && u.id === ME) return Alert.alert('Không thể đổi role', 'Bạn không thể đổi role của chính mình.');
    try {
      await updateDoc(doc(db, 'users', u.id), { role: newRole, updatedAt: serverTimestamp() });
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không đổi được role.');
    }
  };

  const deleteUser = (u: U) => {
    if (ME && u.id === ME) return Alert.alert('Không thể xóa', 'Bạn không thể xóa tài khoản của chính mình.');
    Alert.alert('Xác nhận xóa', `Xóa user "${u.name || u.email || u.id}"?`, [
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

  return (
    <View style={s.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })} />

      {/* Header */}
      <View style={[s.headerWrap, { paddingTop }]}>
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Quản lý user</Text>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={s.searchBox}>
          <Ionicons name="search" size={16} color="#a3b0c2" />
          <TextInput
            placeholder="Tìm theo tên, email, uid…"
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            style={s.searchInput}
            autoCapitalize="none"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Role filters */}
        <View style={s.roleRow}>
          {ROLES.map((r) => {
            const active = r === roleFilter;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => setRoleFilter(r)}
                style={[
                  s.rolePill,
                  { backgroundColor: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: active ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.12)' }
                ]}
              >
                <Text style={[s.rolePillText, { fontWeight: active ? '800' : '600' }]}>{r}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* User list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[s.listContent, { paddingBottom: paddingBottom + 16 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const isSelf = ME && item.id === ME;
          return (
            <View style={s.userCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName} numberOfLines={1}>
                    {item.name || item.email || item.id}{isSelf ? ' (Bạn)' : ''}
                  </Text>
                  {!!item.email && <Text style={s.userEmail}>{item.email}</Text>}
                  {!!item.createdAt && <Text style={s.userDate}>{formatDate(item.createdAt)}</Text>}
                </View>
                <RoleBadge role={(item.role as any) ?? 'user'} />
              </View>

              {/* Actions */}
              <View style={s.actionRow}>
                {/* Delete */}
                <TouchableOpacity disabled={!!isSelf} onPress={() => deleteUser(item)}
                  style={[s.btnBase, s.deleteBtn, isSelf && { opacity: 0.5 }]}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  <Text style={[s.btnText, s.deleteText]}>Delete</Text>
                </TouchableOpacity>

                {/* Block / Unblock */}
                <TouchableOpacity onPress={() => toggleBlock(item)}
                  style={[s.btnBase, item.blocked ? s.blockBtnGreen : s.blockBtnRed]}>
                  <Ionicons
                    name={item.blocked ? 'lock-open-outline' : 'lock-closed-outline'}
                    size={16}
                    color={item.blocked ? '#22c55e' : '#ef4444'}
                  />
                  <Text style={[s.btnText, { color: item.blocked ? '#22c55e' : '#ef4444' }]}>
                    {item.blocked ? 'Unblock' : 'Block'}
                  </Text>
                </TouchableOpacity>

                {/* Role pills */}
                {(['admin', 'premium', 'user'] as const).map((r) => (
                  <TouchableOpacity key={r} disabled={!!isSelf} onPress={() => changeRole(item, r)}
                    style={{
                      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
                      backgroundColor: (item.role ?? 'user') === r ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: (item.role ?? 'user') === r ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.1)',
                      opacity: isSelf ? 0.5 : 1,
                    }}>
                    <Text style={{ color: '#e5e7eb', fontWeight: '700', textTransform: 'capitalize' }}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={s.emptyText}>{loading ? 'Đang tải...' : 'Không có người dùng.'}</Text>}
      />
    </View>
  );
}

/* Sub Components */
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    admin: { label: 'Admin', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: 'shield-checkmark-outline' },
    premium: { label: 'Premium', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', icon: 'star-outline' },
    user: { label: 'User', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', icon: 'person-outline' },
  };
  const style = map[role] ?? map.user;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: style.bg }}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={{ color: style.color, fontWeight: '700', fontSize: 12 }}>{style.label}</Text>
    </View>
  );
}

/* Utils */
function formatDate(ts?: Timestamp | null) {
  if (!ts) return '';
  const d = ts.toDate();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} • ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}
