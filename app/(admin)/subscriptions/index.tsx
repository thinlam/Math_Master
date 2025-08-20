// app/(admin)/subscriptions/index.tsx
import { listSubscriptions, type Subscription } from '@/services/subscription'; // <— path số nhiều
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, RefreshControl,
    SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

export default function AdminSubscriptions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Subscription[]>([]);
  const [status, setStatus] = useState<'all' | Subscription['status']>('all');
  const [uidQuery, setUidQuery] = useState('');
  const debouncedUid = useDebounce(uidQuery, 350);

  const load = async () => {
    try {
      setLoading(true);
      const data = await listSubscriptions({
        uid: debouncedUid || undefined,
        status: status === 'all' ? undefined : status,
        limitN: 100,
      });
      setItems(data);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  };

  // Lần đầu
  useEffect(() => { load();   }, []);

  // Tự reload khi filter/uid thay đổi
  useEffect(() => { load();   }, [status, debouncedUid]);

  const header = useMemo(() => (
    <View style={S.filters}>
      <TextInput
        placeholder="Tìm theo UID người dùng"
        autoCapitalize="none"
        autoCorrect={false}
        value={uidQuery}
        onChangeText={setUidQuery}
        style={S.input}
      />
      <View style={S.row}>
        {(['all','active','cancelled','expired'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[S.chip, status===s && S.chipActive]}
            onPress={() => setStatus(s)}
          >
            <Text style={[S.chipText, status===s && S.chipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={S.reloadBtn} onPress={load}>
          <Ionicons name="refresh" size={18} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={S.createBtn}
        onPress={() => router.push('/(admin)/subscriptions/new')}
      >
        <Ionicons name="add" size={18} />
        <Text style={{ marginLeft: 6, fontWeight: '600' }}>Tạo gói thủ công</Text>
      </TouchableOpacity>
    </View>
  ), [status, uidQuery]);

  return (
    <SafeAreaView style={[S.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" />
      <Text style={S.title}>Quản lý gói Premium</Text>

      {header}

      <FlatList
        data={items}
        keyExtractor={it => it.id!}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        renderItem={({ item }) => {
          const start = toDateSafe(item.startedAt);
          const end = toDateSafe(item.expiresAt);
          return (
            <TouchableOpacity
              style={S.card}
              onPress={() => router.push(`/(admin)/subscriptions/${item.id}`)}
            >
              <View style={S.rowBetween}>
                <Text style={S.cardTitle}>{item.planId}</Text>
                <Text style={[
                  S.badge,
                  item.status==='active' ? S.badgeActive :
                  item.status==='cancelled' ? S.badgeCancelled : S.badgeExpired
                ]}>
                  {item.status}
                </Text>
              </View>
              <Text style={S.cardLine}>UID: {item.uid}</Text>
              <Text style={S.cardLine}>Bắt đầu: {start ? start.toLocaleString() : '—'}</Text>
              <Text style={S.cardLine}>Hết hạn: {end ? end.toLocaleString() : '—'}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!loading ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text>Không có dữ liệu</Text>
          </View>
        ) : <ActivityIndicator style={{ marginTop: 24 }} />}
      />
    </SafeAreaView>
  );
}

/* Debounce nhỏ cho ô UID */
function useDebounce<T>(value: T, delay = 300) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setV(value), delay);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [value, delay]);
  return v;
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  filters: { marginBottom: 10 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, height: 40, marginBottom: 8
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  chipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
  chipText: { color: '#333' },
  chipTextActive: { color: '#3730A3', fontWeight: '600' },
  reloadBtn: { padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  createBtn: { marginTop: 8, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center',
               paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F1F5F9' },
  card: { padding: 12, borderRadius: 12, backgroundColor: '#FAFAFA', marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, color: '#fff', overflow: 'hidden', fontSize: 12 },
  badgeActive: { backgroundColor: '#16A34A' },
  badgeCancelled: { backgroundColor: '#F59E0B' },
  badgeExpired: { backgroundColor: '#6B7280' },
  cardLine: { marginTop: 4, color: '#374151' },
});
