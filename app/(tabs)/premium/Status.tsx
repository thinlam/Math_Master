// app/(tabs)/premium/Status.tsx
import { auth, db } from '@/scripts/firebase';
import { getActiveSubscriptionByUid, type Subscription, updateSubscription } from '@/services/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator, Alert, SafeAreaView, StatusBar, StyleSheet,
    Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* --------- helpers ---------- */
function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return null;
}

export default function PremiumStatus() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);

  const uid = auth.currentUser?.uid;

  const load = async () => {
    if (!uid) return;
    setLoading(true);
    try {
      // 1) Gói active hiện tại
      const a = await getActiveSubscriptionByUid(uid);
      setActive(a);

      // 2) Lịch sử: chỉ where theo uid (KHÔNG orderBy) để khỏi cần index, rồi sort ở client
      const qy = query(collection(db, 'subscriptions'), where('uid', '==', uid));
      const snap = await getDocs(qy);
      const arr = snap.docs.map(d => ({ id: d.id, ...(d.data() as Subscription) }));
      arr.sort((A, B) => {
        const aT = toDateSafe(A.startedAt)?.getTime() ?? 0;
        const bT = toDateSafe(B.startedAt)?.getTime() ?? 0;
        return bT - aT; // desc
      });
      setHistory(arr);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được premium');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [uid]);

  const daysLeft = useMemo(() => {
    if (!active) return null;
    const end = toDateSafe(active.expiresAt);
    if (!end) return null;
    const ms = end.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [active]);

  const cancelRenew = async () => {
    if (!active) return;
    try {
      await updateSubscription(active.id!, { status: 'cancelled' });
      Alert.alert('Đã hủy gia hạn', 'Gói sẽ ngừng vào ngày hết hạn hiện tại');
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không hủy được');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[S.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" />
      <Text style={S.title}>Trạng thái Premium của bạn</Text>

      {active ? (
        <View style={S.card}>
          <View style={S.rowBetween}>
            <Text style={S.plan}>{active.planId}</Text>
            <View style={[S.badge, S.badgeActive]}>
              <Ionicons name="star" size={14} color="#fff" />
              <Text style={S.badgeText}>Active</Text>
            </View>
          </View>
          <Text style={S.line}>
            Bắt đầu: {toDateSafe(active.startedAt)?.toLocaleString() ?? '—'}
          </Text>
          <Text style={S.line}>
            Hết hạn: {toDateSafe(active.expiresAt)?.toLocaleString() ?? '—'}
          </Text>
          <Text style={[S.line, { fontWeight: '700' }]}>
            Còn lại: {daysLeft ?? '—'} ngày
          </Text>

          <View style={S.actions}>
            <TouchableOpacity
              style={[S.btn, { backgroundColor: '#4F46E5' }]}
              onPress={() => router.push('/(tabs)/Store')}
            >
              <Text style={S.btnText}>Gia hạn / Nâng cấp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btn, { backgroundColor: '#DC2626' }]}
              onPress={cancelRenew}
            >
              <Text style={S.btnText}>Hủy gia hạn</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={[S.card, { borderColor: '#F59E0B' }]}>
          <Text style={S.line}>Bạn chưa có gói Premium đang hoạt động.</Text>
          <TouchableOpacity
            style={[S.btn, { backgroundColor: '#F59E0B', marginTop: 10 }]}
            onPress={() => router.push('/(tabs)/Store')}
          >
            <Text style={S.btnText}>Mua Premium</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={[S.title, { marginTop: 18 }]}>Lịch sử gói</Text>
      {history.map(h => {
        const st = toDateSafe(h.startedAt);
        const ex = toDateSafe(h.expiresAt);
        return (
          <View key={h.id} style={S.historyItem}>
            <Text style={{ fontWeight: '600' }}>{h.planId}</Text>
            <Text>{h.status}</Text>
            <Text style={{ color: '#4B5563' }}>
              {(st && st.toLocaleDateString()) || '—'} → {(ex && ex.toLocaleDateString()) || '—'}
            </Text>
          </View>
        );
      })}
      {history.length === 0 && <Text>Trống.</Text>}
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#FAFAFA' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  plan: { fontSize: 16, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeActive: { backgroundColor: '#16A34A' },
  badgeText: { color: '#fff', marginLeft: 6, fontWeight: '700' },
  line: { marginTop: 6, color: '#334155' },
  actions: { flexDirection: 'row', marginTop: 12 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '700' },
  historyItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
});
