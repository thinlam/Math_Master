// app/(tabs)/Store.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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

/* Firebase */
import { auth } from '@/scripts/firebase';

/* Thanh toán + Cấp quyền */
import { payWith } from '@/services/payments';
import { grantPremium } from '@/services/subscription'; // <— sửa đúng path (số nhiều)

type StoreItem = {
  id: string;
  title: string;
  desc: string;
  price: number; // VND
  icon: keyof typeof Ionicons.glyphMap;
  iapProductId?: string;
  type?: 'consumable' | 'non_consumable' | 'subscription';
};

const ITEMS: StoreItem[] = [
  { id: 'premium1m', title: 'Gói Premium 1 tháng', desc: 'Mở toàn bộ nội dung trong 30 ngày', price: 99000, icon: 'star-outline', iapProductId: 'premium_1m', type: 'subscription' },
  { id: 'premium6m', title: 'Gói Premium 6 tháng', desc: 'Tiết kiệm ~15% so với trả theo tháng', price: 499000, icon: 'star-outline', iapProductId: 'premium_6m', type: 'subscription' },
  { id: 'premium1y', title: 'Gói Premium 1 năm', desc: 'Tiết kiệm ~25% so với trả theo tháng', price: 899000, icon: 'star-outline', iapProductId: 'premium_1y', type: 'subscription' },
];

export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const canShowWallets = Platform.OS === 'android'; // tránh vi phạm policy iOS

  const buy = async (item: StoreItem, provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') => {
    const key = `${item.id}:${provider}`;
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập trước khi mua.');
        return;
      }
      setLoadingKey(key);

      // 1) Mở UI thanh toán (sandbox có bottom sheet thật)
      const result = await payWith(provider, item, userId);

      // 2) Nếu user hoàn tất → cấp premium ngay (auto-extend nếu đã có hạn)
      if (result.status === 'completed') {
        await grantPremium(userId, item.id as any, provider); // truyền provider để log nguồn
        Alert.alert('Thành công', 'Tài khoản đã được nâng cấp Premium. Mở lại trang là thấy hiệu lực ngay!');
      } else if (result.status === 'opened') {
        // Người dùng đang ở màn thanh toán; không làm gì thêm
      } else if (result.status === 'cancelled') {
        // Người dùng hủy
      }
    } catch (e: any) {
      Alert.alert('Thanh toán thất bại', e?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoadingKey(null);
    }
  };

  const confirmBuy = (item: StoreItem, provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') => {
    Alert.alert(
      'Xác nhận',
      `Mua ${item.title} qua ${labelOf(provider)} với giá ${item.price.toLocaleString()}đ?`,
      [{ text: 'Hủy' }, { text: 'Đồng ý', onPress: () => buy(item, provider) }],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header + nút Theo dõi gói */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>⭐ Gói Premium</Text>
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/premium/Status')}
            style={styles.trackBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="reader-outline" size={16} color={palette.editBtnText} />
            <Text style={[styles.trackLabel, { color: palette.editBtnText }]}>Theo dõi gói</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
          <Text style={styles.noteText}>
            Trên iOS, nội dung số nên thanh toán qua In‑App Purchase. Các ví (MoMo/ZaloPay/VNPay) chỉ hiển thị trên Android.
          </Text>
        </View>

        {ITEMS.map((item) => {
          const iapKey = `${item.id}:iap`;
          const momoKey = `${item.id}:momo`;
          const zaloKey = `${item.id}:zalopay`;
          const vnpKey = `${item.id}:vnpay`;

          return (
            <View key={item.id} style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={styles.iconCircle}>
                  <Ionicons name={item.icon} size={22} color={palette.editBtnText} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.desc}>{item.desc}</Text>
                </View>
                <Text style={styles.price}>{item.price.toLocaleString()}đ</Text>
              </View>

              <View style={styles.btnRow}>
                <PayBtn label="Thanh toán In‑App" icon="card-outline" onPress={() => confirmBuy(item, 'iap')} loading={loadingKey === iapKey} p={palette} />
                {canShowWallets && (
                  <>
                    <PayBtn label="MoMo" icon="logo-usd" onPress={() => confirmBuy(item, 'momo')} loading={loadingKey === momoKey} p={palette} />
                    <PayBtn label="ZaloPay" icon="cash-outline" onPress={() => confirmBuy(item, 'zalopay')} loading={loadingKey === zaloKey} p={palette} />
                    <PayBtn label="VNPay" icon="pricetag-outline" onPress={() => confirmBuy(item, 'vnpay')} loading={loadingKey === vnpKey} p={palette} />
                  </>
                )}
              </View>
            </View>
          );
        })}
        {/* Legal & Manage Subscription */}
        <View style={{ gap: 8, marginTop: 8 }}>
          <TouchableOpacity onPress={() => router.push('/(legal)/privacy')}>
            <Text style={{ color: palette.link }}>Chính sách quyền riêng tư</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(legal)/terms')}>
            <Text style={{ color: palette.link }}>Điều khoản sử dụng</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL(
            Platform.OS === 'ios'
              ? 'itms-apps://apps.apple.com/account/subscriptions'
              : 'https://play.google.com/store/account/subscriptions'
          )}>
            <Text style={{ color: palette.link }}>Quản lý đăng ký</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PayBtn({
  label, icon, onPress, loading, p,
}: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; loading?: boolean; p: Palette; }) {
  return (
    <TouchableOpacity
      style={[stylesBtn.btn, { backgroundColor: p.brandSoft, borderColor: p.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={p.editBtnText} />
          <Text style={[stylesBtn.label, { color: p.editBtnText }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function labelOf(provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') {
  switch (provider) {
    case 'iap': return 'In‑App (Store)';
    case 'momo': return 'MoMo';
    case 'zalopay': return 'ZaloPay';
    case 'vnpay': return 'VNPay';
  }
}

function makeStyles(p: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    container: { padding: 16 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    title: { fontSize: 22, fontWeight: '700', color: p.text },
    trackBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: p.brandSoft, borderColor: p.cardBorder, borderWidth: 1,
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    },
    trackLabel: { fontSize: 12, fontWeight: '700' },

    noteBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: p.card, borderColor: p.cardBorder, borderWidth: 1, padding: 10, borderRadius: 10, marginBottom: 12 },
    noteText: { color: p.textMuted, fontSize: 12, flex: 1 },
    card: { backgroundColor: p.card, padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: p.cardBorder },
    iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: p.brandSoft },
    itemTitle: { fontSize: 16, fontWeight: '700', color: p.text },
    desc: { color: p.textMuted, fontSize: 13, marginTop: 2 },
    price: { fontWeight: '800', color: '#10B981' },
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  });
}
const stylesBtn = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  label: { fontSize: 12, fontWeight: '700' },
});
