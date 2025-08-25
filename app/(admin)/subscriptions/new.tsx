// app/(admin)/subscriptions/new.tsx
import { auth } from '@/scripts/firebase';
import { createSubscription, type PlanId } from '@/services/subscription';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
  useColorScheme,
  View,
} from 'react-native';

/** 🎯 KHAI BÁO CÁC PLAN HỖ TRỢ (đồng bộ service của bạn)
 *  Nếu service chỉ có 1m/3m/12m thì để y như vậy; nếu có 6m/1y thì thêm ở đây.
 */
const PLAN_OPTIONS: { id: PlanId; label: string; hint?: string }[] = [
  { id: 'premium1m' as PlanId, label: '1 tháng', hint: 'Ngắn hạn' },
  // { id: 'premium3m' as PlanId, label: '3 tháng', hint: 'Tiết kiệm 10%' },
  { id: 'premium6m' as PlanId, label: '6 tháng', hint: 'Tiết kiệm 15%' },
  // { id: 'premium12m' as PlanId, label: '12 tháng', hint: 'Tiết kiệm 20%' },
  { id: 'premium1y' as PlanId, label: '1 năm', hint: 'Tiết kiệm 20%' },
];

export default function NewSub() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  /* ===== Theme tokens khớp dự án ===== */
  const C = useMemo(
    () => ({
      bg1: isDark ? '#0B1020' : '#EEF1FF',
      bg2: isDark ? '#0E1530' : '#F6F7FF',
      card: isDark ? '#141A33' : '#FFFFFF',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,29,76,0.08)',
      text: isDark ? '#EAF0FF' : '#1B2559',
      sub: isDark ? '#A9B5D9' : '#667085',
      primary: '#6C63FF',
      primary2: '#8D84FF',
      danger: '#EF4444',
      success: '#16A34A',
      shadow: isDark ? '#000' : '#6C63FF',
    }),
    [isDark]
  );

  /* ===== State ===== */
  const [uid, setUid] = useState('');
  const [planId, setPlanId] = useState<PlanId>('premium1m' as PlanId);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<{ uid?: string; planId?: string }>({});

  // gợi ý: nếu admin đang xem chi tiết user và điều hướng sang đây kèm ?uid=...
  useEffect(() => {
    const url = new URL(typeof window !== 'undefined' ? window.location.href : 'http://x');
    const u = url.searchParams.get('uid');
    if (u) setUid(u);
  }, []);

  const validate = () => {
    const e: typeof err = {};
    if (!uid.trim()) e.uid = 'Nhập UID người dùng';
    if (!planId) e.planId = 'Chọn gói';
    setErr(e);
    return Object.keys(e).length === 0;
  };

  const onCreate = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const adminUid = auth.currentUser?.uid;
      await createSubscription({
        uid: uid.trim(),
        planId,
        createdBy: adminUid,
        note: note.trim() || undefined,
      });
      if (Platform.OS === 'web') {
        // web: báo thành công rồi quay lại
        Alert.alert('✅ Thành công', 'Đã tạo gói Premium cho người dùng.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('✅ Thành công', 'Đã tạo gói Premium cho người dùng.');
        router.back();
      }
    } catch (e: any) {
      Alert.alert('❌ Lỗi', e?.message || 'Không tạo được gói');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[C.bg1, C.bg2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar translucent barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: C.text, fontSize: 20, fontWeight: '800' }}>Tạo gói Premium</Text>
              <Text style={{ color: C.sub, marginTop: 4 }}>
                Điền UID, chọn gói và (tuỳ chọn) ghi chú nội bộ cho giao dịch.
              </Text>
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
              {/* UID */}
              <Text style={[S.label, { color: C.sub }]}>UID người dùng</Text>
              <View style={[S.inputWrap, { borderColor: C.border, backgroundColor: isDark ? '#0F1733' : '#fff' }]}>
                <Ionicons name="person-circle" size={18} color={C.sub} style={{ marginRight: 8 }} />
                <TextInput
                  value={uid}
                  onChangeText={(t) => {
                    setUid(t);
                    if (err.uid) setErr((o) => ({ ...o, uid: undefined }));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Ví dụ: Hg6iXqsyulcRzCXQHlJ1h9Ax6vi1"
                  placeholderTextColor={C.sub}
                  style={[S.input, { color: C.text }]}
                />
              </View>
              {!!err.uid && <Text style={[S.error, { color: C.danger }]}>{err.uid}</Text>}

              {/* Plan chips */}
              <Text style={[S.label, { color: C.sub, marginTop: 12 }]}>Chọn gói</Text>
              <View style={S.chipsRow}>
                {PLAN_OPTIONS.map((p) => {
                  const active = planId === p.id;
                  return (
                    <TouchableOpacity
                      key={String(p.id)}
                      onPress={() => {
                        setPlanId(p.id);
                        if (err.planId) setErr((o) => ({ ...o, planId: undefined }));
                      }}
                      activeOpacity={0.9}
                      style={[
                        S.chip,
                        {
                          borderColor: active ? C.primary : C.border,
                          backgroundColor: active ? C.primary : (isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF'),
                        },
                      ]}
                    >
                      <Text style={{ color: active ? '#fff' : C.text, fontWeight: '700' }}>
                        {p.label}
                      </Text>
                      {!!p.hint && !active && (
                        <Text style={{ color: C.sub, fontSize: 10, marginTop: 2 }}>{p.hint}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {!!err.planId && <Text style={[S.error, { color: C.danger }]}>{err.planId}</Text>}

              {/* Note */}
              <Text style={[S.label, { color: C.sub, marginTop: 12 }]}>Ghi chú</Text>
              <View
                style={[
                  S.inputWrap,
                  {
                    minHeight: 90,
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
                  placeholder="Ví dụ: cộng dồn thời hạn / tặng nội bộ / mã hoá đơn…"
                  placeholderTextColor={C.sub}
                  multiline
                  style={[S.input, { color: C.text, textAlignVertical: 'top', minHeight: 80 }]}
                />
              </View>

              {/* Button */}
              <TouchableOpacity
                onPress={onCreate}
                disabled={loading}
                activeOpacity={0.9}
                style={{ borderRadius: 12, overflow: 'hidden', marginTop: 14, opacity: loading ? 0.7 : 1 }}
              >
                <LinearGradient
                  colors={[C.primary, C.primary2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={S.btnGrad}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="save" size={18} color="#fff" />
                      <Text style={S.btnText}>Tạo gói</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Tip */}
              <Text style={{ color: C.sub, fontSize: 12, marginTop: 8 }}>
                Lưu ý: gói sẽ bắt đầu ngay thời điểm tạo. Hãy chắc UID người dùng đúng.
              </Text>
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
    height: 44,
  },
  input: { flex: 1, paddingVertical: 8, fontSize: 15 },
  error: { marginTop: 6, fontSize: 12 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 92,
  },
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
  btnText: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.3 },
});
