// app/(admin)/reports/index.tsx
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Platform, RefreshControl, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Report = { id: string; title?: string; reason?: string; status?: 'open' | 'resolved' | string; createdAt?: Timestamp | null };

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [list, setList] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const base = collection(db, 'reports');
      const q =
        filter === 'all'
          ? query(base, orderBy('createdAt', 'desc'), limit(50))
          : query(base, where('status', '==', filter), orderBy('createdAt', 'desc'), limit(50));
      const rs = await getDocs(q);
      setList(rs.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được báo cáo.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const setStatus = async (id: string, status: 'open' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'reports', id), { status, updatedAt: serverTimestamp() });
      setList((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không cập nhật được trạng thái.');
    }
  };

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <StatusBar translucent barStyle="light-content" backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })} />
      
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop, paddingBottom: 8 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Báo cáo</Text>
      </View>

      {/* Bộ lọc */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, paddingHorizontal: 16 }}>
        {(['all', 'open', 'resolved'] as const).map((f) => {
          const active = f === filter;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: active ? 'rgba(59,130,246,0.6)' : 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: '#e5e7eb', fontWeight: '700', textTransform: 'capitalize' }}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Danh sách */}
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: paddingBottom + 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' }}>
            <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>{item.title || `Report #${item.id.slice(0, 6)}`}</Text>
            {!!item.reason && <Text style={{ color: '#94a3b8', marginTop: 2 }}>{item.reason}</Text>}
            {!!item.createdAt && <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <Chip active={item.status === 'open'} text="Open" onPress={() => setStatus(item.id, 'open')} />
              <Chip active={item.status === 'resolved'} text="Resolved" onPress={() => setStatus(item.id, 'resolved')} />
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 40 }}>{loading ? 'Đang tải...' : 'Không có báo cáo.'}</Text>}
      />
    </View>
  );
}

function Chip({ active, text, onPress }: { active?: boolean; text: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: active ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: active ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <Text style={{ color: active ? '#22c55e' : '#e5e7eb', fontWeight: '700' }}>{text}</Text>
    </TouchableOpacity>
  );
}

function formatDate(ts: Timestamp) {
  const d = ts.toDate();
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}
