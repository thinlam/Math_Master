// app/(admin)/subscriptions/[id].tsx
import { db } from '@/scripts/firebase';
import {
  deleteSubscription,
  getSubscriptionById,
  updateSubscription,
  type PlanId,
  type Subscription,
} from '@/services/subscription';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Timestamp,
  collection, doc, getDocs, query, updateDoc, where,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

/* ========= helpers ========= */
function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  if (typeof v === 'object' && typeof v.seconds === 'number') {
    return new Date(v.seconds * 1000);
  }
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function fmt(dt: Date | null) {
  if (!dt) return '—';
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(dt);
  } catch {
    return dt.toISOString().replace('T', ' ').slice(0, 19);
  }
}

/** sau khi sửa/xoá sub, đồng bộ role người dùng */
async function syncUserRole(uid: string) {
  const qy = query(
    collection(db, 'subscriptions'),
    where('uid', '==', uid),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(qy);
  const role = snap.empty ? 'user' : 'premium';
  await updateDoc(doc(db, 'users', uid), { role });
}

/** các gói hỗ trợ (tuỳ chỉnh cho dự án) */
const PLAN_OPTIONS: { id: PlanId; label: string }[] = [
  { id: 'premium1m' as PlanId, label: '1 tháng' },
  { id: 'premium6m' as PlanId, label: '6 tháng' },
  { id: 'premium1y' as PlanId, label: '1 năm' },
];

function planToMonths(p: PlanId) {
  if (p === 'premium1m') return 1;
  if (p === 'premium6m') return 6;
  if (p === 'premium1y') return 12;
  return 1;
}
function addMonths(d: Date, months: number) {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() + months);
  return dt;
}

export default function EditSub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const C = useMemo(() => ({
    bg1: isDark ? '#0B1020' : '#EEF1FF',
    bg2: isDark ? '#0E1530' : '#F6F7FF',
    card: isDark ? '#141A33' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,29,76,0.08)',
    text: isDark ? '#EAF0FF' : '#1B2559',
    sub: isDark ? '#A9B5D9' : '#667085',
    primary: '#6C63FF',
    primary2: '#8D84FF',
    danger: '#DC2626',
    shadow: isDark ? '#000' : '#6C63FF',
    success: '#16A34A',
    warn: '#F59E0B',
    mute: '#6B7280',
  }), [isDark]);

  const [item, setItem] = useState<Subscription | null>(null);
  const [planId, setPlanId] = useState<PlanId>('premium1m' as PlanId);
  const [status, setStatus] = useState<'active' | 'cancelled' | 'expired'>('active');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* load (guard unmount) */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getSubscriptionById(id);
        if (!alive) return;
        if (!data) {
          Alert.alert('Không tìm thấy', 'Gói đã bị xoá hoặc ID không hợp lệ.', [
            { text: 'OK', onPress: () => router.back() },
          ]);
          return;
        }
        setItem(data);
        setPlanId(data.planId as PlanId);
        setStatus(data.status);
        setNote(data.note || '');
      } catch (e: any) {
        if (!alive) return;
        Alert.alert('Lỗi', e?.message || 'Không tải được dữ liệu', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const onSave = async () => {
    if (!item) return;
    try {
      setSaving(true);
      const payload: any = { planId, status, note };

      // Chuyển từ non-active sang active -> tạo kỳ hạn mới từ hiện tại
      if (item.status !== 'active' && status === 'active') {
        const start = new Date();
        payload.startedAt = start;
        payload.expiresAt = addMonths(start, planToMonths(planId));
      }
      // Đang active & đổi plan -> reset hạn theo plan mới tính từ startedAt cũ
      if (item.status === 'active' && status === 'active' && planId !== item.planId) {
        const start = toDateSafe(item.startedAt) ?? new Date();
        payload.startedAt = start;
        payload.expiresAt = addMonths(start, planToMonths(planId));
      }

      await updateSubscription(item.id!, payload);
      await syncUserRole(item.uid);

      Alert.alert('✅ Đã lưu', 'Cập nhật gói thành công.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('❌ Lỗi', e?.message || 'Không lưu được');
    } finally { setSaving(false); }
  };

  /** Xoá */
  const onDelete = () => {
    if (!item || saving || deleting) return;

    const doDelete = async () => {
      try {
        setDeleting(true);
        await deleteSubscription(item.id!);
        await syncUserRole(item.uid);
        Alert.alert('🗑️ Đã xoá', 'Gói đã được xoá.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } catch (e: any) {
        Alert.alert('❌ Lỗi', e?.message || 'Không xoá được');
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        const ok = window.confirm('Xoá gói? Thao tác không thể hoàn tác.');
        if (ok) void doDelete();
      }
    } else {
      Alert.alert('Xoá gói?', 'Thao tác không thể hoàn tác.', [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Xoá', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  if (loading || !item) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg2 }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={C.primary} />
        <Text style={{ color: C.sub, marginTop: 8 }}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const startedAt = toDateSafe(item.startedAt);
  const expiresAt = toDateSafe(item.expiresAt);

  const badgeColor =
    status === 'active' ? C.success :
    status === 'cancelled' ? C.warn : C.mute;

  return (
    <LinearGradient colors={[C.bg1, C.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar translucent barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {/* Header */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>
                Sửa gói <Text style={{ color: C.primary }}>#{item.id!.slice(0, 6)}…</Text>
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Ionicons name="person-circle" size={16} color={C.sub} />
                <Text style={{ color: C.sub, marginLeft: 6 }}>UID:</Text>
                <Text style={{ color: C.text, fontWeight: '700', marginLeft: 6 }} numberOfLines={1}>
                  {item.uid}
                </Text>
                <View style={{
                  marginLeft: 'auto',
                  backgroundColor: badgeColor,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, textTransform: 'lowercase' }}>
                    {status}
                  </Text>
                </View>
              </View>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor: C.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: C.border,
                shadowColor: C.shadow,
                shadowOpacity: isDark ? 0.25 : 0.15,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 8 },
                elevation: 3,
                padding: 14,
              }}
            >
              {/* Plan */}
              <Text style={[S.label, { color: C.sub }]}>Plan</Text>
              <View style={S.chipsRow}>
                {PLAN_OPTIONS.map(p => {
                  const active = planId === p.id;
                  return (
                    <TouchableOpacity
                      key={String(p.id)}
                      onPress={() => setPlanId(p.id)}
                      activeOpacity={0.9}
                      style={[
                        S.chip,
                        {
                          borderColor: active ? C.primary : C.border,
                          backgroundColor: active ? C.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF'),
                        },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '700' }}>{p.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status */}
              <Text style={[S.label, { color: C.sub, marginTop: 12 }]}>Trạng thái</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['active', 'cancelled', 'expired'] as const).map(s => {
                  const active = status === s;
                  const bg = s === 'active' ? C.success : s === 'cancelled' ? C.warn : C.mute;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setStatus(s)}
                      style={[
                        S.segment,
                        { backgroundColor: active ? bg : (isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF'), borderColor: C.border },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '700', textTransform: 'lowercase' }}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Note */}
              <Text style={[S.label, { color: C.sub, marginTop: 12 }]}>Ghi chú</Text>
              <View
                style={[
                  S.inputWrap,
                  {
                    height: undefined,
                    minHeight: 100,
                    alignItems: 'flex-start',
                    borderColor: C.border,
                    backgroundColor: isDark ? '#0F1733' : '#fff',
                  },
                ]}
              >
                <Ionicons name="document-text" size={18} color={C.sub} style={{ marginRight: 8, marginTop: 8 }} />
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Nội bộ: nguồn cấp, lý do, mã hoá đơn…"
                  placeholderTextColor={C.sub}
                  multiline
                  blurOnSubmit={false}
                  style={[S.input, { color: C.text, textAlignVertical: 'top', minHeight: 100 }]}
                />
              </View>

              {/* Meta */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <Ionicons name="time" size={16} color={C.sub} />
                  <Text style={{ color: C.sub, marginLeft: 6 }}>Bắt đầu:</Text>
                  <Text style={{ color: C.text, marginLeft: 4, fontWeight: '600', flexShrink: 1 }}>
                    {fmt(startedAt)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                  <Ionicons name="alarm" size={16} color={C.sub} />
                  <Text style={{ color: C.sub, marginLeft: 6 }}>Hết hạn:</Text>
                  <Text style={{ color: C.text, marginLeft: 4, fontWeight: '600', flexShrink: 1 }}>
                    {fmt(expiresAt)}
                  </Text>
                </View>
              </View>

              {/* Buttons */}
              <TouchableOpacity
                onPress={onSave}
                disabled={saving || deleting}
                activeOpacity={0.9}
                style={{ borderRadius: 12, overflow: 'hidden', marginTop: 16, opacity: (saving || deleting) ? 0.7 : 1 }}
              >
                <LinearGradient colors={[C.primary, C.primary2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.btnGrad}>
                  {saving ? <ActivityIndicator color="#fff" /> : (<>
                    <Ionicons name="save" size={18} color="#fff" />
                    <Text style={S.btnText}>Lưu thay đổi</Text>
                  </>)}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onDelete}
                disabled={saving || deleting}
                activeOpacity={0.9}
                style={[S.btnDanger, { backgroundColor: C.danger, opacity: (saving || deleting) ? 0.7 : 1 }]}
              >
                {deleting ? <ActivityIndicator color="#fff" /> : (<>
                  <Ionicons name="trash" size={18} color="#fff" />
                  <Text style={S.btnText}>Xoá gói</Text>
                </>)}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    // không đặt height cố định để textarea không bị kẹt
  },
  input: { flex: 1, paddingVertical: 8, fontSize: 15 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, minWidth: 92 },
  segment: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  btnGrad: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  btnDanger: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.3 },
});
