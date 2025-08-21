// app/(tabs)/premium/Status.tsx
import { auth, db } from '@/scripts/firebase';
import {
  getActiveSubscriptionByUid,
  updateSubscription,
  type Subscription,
} from '@/services/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Theme */
import { useTheme, type Palette } from '@/theme/ThemeProvider';

/* --------- helpers ---------- */
function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Timestamp) return v.toDate();
  if (v instanceof Date) return v;
  return null;
}

function formatDateTime(d?: Date | null) {
  if (!d) return '—';
  // hiển thị gọn gàng: dd/mm/yyyy, HH:mm
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

/* ---------- Component ---------- */
export default function PremiumStatus() {
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Subscription | null>(null);
  const [history, setHistory] = useState<Subscription[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const uid = auth.currentUser?.uid;

  const load = useCallback(async () => {
    if (!uid) {
      setActive(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const a = await getActiveSubscriptionByUid(uid);
      setActive(a);

      const qy = query(collection(db, 'subscriptions'), where('uid', '==', uid));
      const snap = await getDocs(qy);
      const arr = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Subscription) }));
      arr.sort((A, B) => {
        const aT = toDateSafe(A.startedAt)?.getTime() ?? 0;
        const bT = toDateSafe(B.startedAt)?.getTime() ?? 0;
        return bT - aT;
      });
      setHistory(arr);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được premium');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const startedAt = useMemo(() => toDateSafe(active?.startedAt), [active]);
  const expiresAt = useMemo(() => toDateSafe(active?.expiresAt), [active]);

  const daysLeft = useMemo(() => {
    if (!expiresAt) return null;
    const ms = expiresAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [expiresAt]);

  const totalDays = useMemo(() => {
    if (!startedAt || !expiresAt) return null;
    const ms = expiresAt.getTime() - startedAt.getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  }, [startedAt, expiresAt]);

  const progress = useMemo(() => {
    if (!startedAt || !expiresAt) return 0;
    const now = Date.now();
    const span = expiresAt.getTime() - startedAt.getTime();
    const used = now - startedAt.getTime();
    return clamp01(used / (span || 1));
  }, [startedAt, expiresAt]);

  const cancelRenew = useCallback(async () => {
    if (!active) return;
    try {
      await updateSubscription(active.id!, { status: 'cancelled' });
      Alert.alert('Đã hủy gia hạn', 'Gói sẽ ngừng vào ngày hết hạn hiện tại.');
      load();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không hủy được');
    }
  }, [active, load]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.centerWrap}>
          <ActivityIndicator color={palette.brand} />
          <Text style={styles.loadingText}>Đang tải…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!uid) {
    return (
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View style={styles.bannerEmpty}>
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
          <Text style={styles.bannerTitle}>Bạn chưa đăng nhập</Text>
          <Text style={styles.bannerSub}>Đăng nhập để xem và quản lý gói Premium.</Text>
          <TouchableOpacity style={[styles.btn, styles.btnBrand, { marginTop: 12 }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.btnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brand} />}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>Premium</Text>

        {/* Banner Premium / Empty */}
        {active ? (
          <View style={styles.banner}>
            <View style={styles.bannerRow}>
              <View style={styles.badgePremium}>
                <Ionicons name="star" size={14} color="#111827" />
                <Text style={styles.badgePremiumText}>PREMIUM</Text>
              </View>
              <View style={[styles.statusPill, getStatusPillStyle(palette, active.status)]}>
                <View style={styles.pillDot} />
                <Text style={styles.statusPillText}>{active.status || 'active'}</Text>
              </View>
            </View>

            <Text style={styles.bannerTitle}>{active.planId || 'Gói hiện tại'}</Text>
            <Text style={styles.bannerSub}>
              Hết hạn: {formatDateTime(expiresAt)} • Còn lại {daysLeft ?? '—'} ngày
            </Text>

            {/* Progress */}
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${progress * 100}%`, backgroundColor: palette.brand }]} />
              </View>
              <Text style={styles.progressText}>
                {startedAt ? startedAt.toLocaleDateString() : '—'} → {expiresAt ? expiresAt.toLocaleDateString() : '—'} {totalDays ? `(${totalDays} ngày)` : ''}
              </Text>
            </View>

            <View style={styles.bannerActions}>
              <TouchableOpacity style={[styles.btn, styles.btnBrand]} onPress={() => router.push('/(tabs)/Store')}>
                <Ionicons name="swap-vertical" size={16} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Gia hạn / Nâng cấp</Text>
              </TouchableOpacity>

              {/* Chỉ hiện nếu chưa cancelled */}
              {active.status !== 'cancelled' && (
                <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={cancelRenew}>
                  <Ionicons name="close-circle" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnText}>Hủy gia hạn</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.bannerEmpty}>
            <Ionicons name="star-outline" size={28} color="#fff" />
            <Text style={styles.bannerTitle}>Nâng cấp Premium</Text>
            <Text style={styles.bannerSub}>Mở khóa toàn bộ nội dung và tính năng nâng cao.</Text>
            <TouchableOpacity style={[styles.btn, styles.btnBrand, { marginTop: 12 }]} onPress={() => router.push('/(tabs)/Store')}>
              <Text style={styles.btnText}>Mua Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Thông tin chi tiết gói đang hoạt động */}
        {active && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Chi tiết gói</Text>
            <Row label="Gói" value={active.planId} />
            <Row label="Bắt đầu" value={formatDateTime(startedAt)} />
            <Row label="Hết hạn" value={formatDateTime(expiresAt)} />
            <Row label="Trạng thái" value={active.status || 'active'} />
          </View>
        )}

        {/* Lịch sử gói */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lịch sử gói</Text>
          {history.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có lịch sử.</Text>
          ) : (
            history.map((h) => {
              const st = toDateSafe(h.startedAt);
              const ex = toDateSafe(h.expiresAt);
              return (
                <View key={h.id} style={styles.historyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyTitle}>{h.planId}</Text>
                    <Text style={styles.historyTime}>
                      {st ? st.toLocaleDateString() : '—'} → {ex ? ex.toLocaleDateString() : '—'}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, getStatusPillStyle(palette, h.status)]}>
                    <View style={styles.pillDot} />
                    <Text style={styles.statusPillText}>{h.status || 'unknown'}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Sub components ---------- */
function Row({ label, value }: { label: string; value?: string }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }}>
      <Text style={{ color: palette.textMuted }}>{label}</Text>
      <Text style={{ color: palette.text, fontWeight: '600' }}>{value || '—'}</Text>
    </View>
  );
}

function getStatusPillStyle(p: Palette, status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { backgroundColor: '#16A34A20', borderColor: '#16A34A', dot: '#16A34A' };
  if (s === 'cancelled') return { backgroundColor: '#DC262620', borderColor: '#DC2626', dot: '#DC2626' };
  if (s === 'expired') return { backgroundColor: '#9CA3AF20', borderColor: '#9CA3AF', dot: '#9CA3AF' };
  if (s === 'pending') return { backgroundColor: '#F59E0B20', borderColor: '#F59E0B', dot: '#F59E0B' };
  return { backgroundColor: p.cardBorder, borderColor: p.cardBorder, dot: p.textMuted };
}

/* ---------- styles theo theme ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg, paddingHorizontal: 16 },
    centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 8, color: p.textMuted },

    screenTitle: { fontSize: 22, fontWeight: '800', color: p.text, marginBottom: 12 },

    // Banner trạng thái hiện tại
    banner: {
      borderRadius: 16,
      padding: 14,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.cardBorder,
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
    },
    bannerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badgePremium: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: p.brand,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    badgePremiumText: { color: '#111827', fontWeight: '800', letterSpacing: 0.5, fontSize: 12 },
    bannerTitle: { color: p.text, fontSize: 18, fontWeight: '800', marginTop: 10 },
    bannerSub: { color: p.textMuted, marginTop: 4 },

    progressWrap: { marginTop: 12 },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: p.cardBorder,
      overflow: 'hidden',
    },
    progressBar: { height: '100%', borderRadius: 999 },
    progressText: { marginTop: 6, color: p.textMuted, fontSize: 12 },

    bannerActions: { flexDirection: 'row', gap: 10, marginTop: 12 },

    // Banner empty
    bannerEmpty: {
      borderRadius: 16,
      padding: 16,
      backgroundColor: p.brand,
      borderWidth: 0,
      alignItems: 'flex-start',
    },

    // Card chung
    card: {
      borderWidth: 1,
      borderColor: p.cardBorder,
      borderRadius: 16,
      padding: 14,
      backgroundColor: p.card,
      marginTop: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '800', color: p.text, marginBottom: 6 },

    // Buttons
    btn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
      flex: 1,
    },
    btnBrand: { backgroundColor: p.brand },
    btnDanger: { backgroundColor: '#DC2626' },
    btnText: { color: '#fff', fontWeight: '800' },

    // Pill trạng thái
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      gap: 6,
    },
    pillDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: '#16A34A', // sẽ bị override bằng inline style (dot)
    },
    statusPillText: { color: p.text, fontWeight: '700', textTransform: 'capitalize' },

    // History
    historyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: p.cardBorder,
    },
    historyTitle: { fontWeight: '700', color: p.text },
    historyTime: { color: p.textMuted, marginTop: 2 },

    emptyText: { color: p.textMuted, paddingVertical: 4 },
  });
}
