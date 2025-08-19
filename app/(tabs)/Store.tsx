// app/(tabs)/Store.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

/* (TÙY CHỌN) Dịch vụ thanh toán đa cổng
   Tạo theo kiến trúc đã hướng dẫn:
   - @/services/payments/index.ts (export payWith)
   - @/services/payments/providers/iap.ts, momo.ts, zalopay.ts, vnpay.ts
*/
let payWith: (provider: 'iap' | 'momo' | 'zalopay' | 'vnpay', item: StoreItem, userId?: string) => Promise<{ status: 'opened' | 'completed' | 'cancelled' }>;
try {
   
  payWith = require('@/services/payments').payWith;
} catch {
  // Fallback demo: nếu chưa tạo services/payments
  payWith = async (provider, item) => {
    await new Promise(r => setTimeout(r, 900));
    Alert.alert('Demo', `Gọi thanh toán [${provider}] cho: ${item.title}`);
    return { status: 'opened' };
  };
}

/* Nếu bạn muốn lấy userId thực từ Firebase thì mở comment:
import { auth } from '@/scripts/firebase';
*/

type StoreItem = {
  id: string;
  title: string;
  desc: string;
  price: number;
  icon: keyof typeof Ionicons.glyphMap;
  iapProductId?: string; // id sản phẩm trên App Store/Play nếu dùng IAP
  type?: 'consumable' | 'non_consumable' | 'subscription';
};

const ITEMS: StoreItem[] = [
  { id: 'coins100',  title: '100 xu',            desc: 'Dùng để mở khóa bài học', price: 10000, icon: 'cash-outline',   iapProductId: 'coins_100',  type: 'consumable' },
  { id: 'coins500',  title: '500 xu',            desc: 'Tiết kiệm hơn',           price: 45000, icon: 'wallet-outline', iapProductId: 'coins_500',  type: 'consumable' },
  { id: 'premium1m', title: 'Gói Premium 1 tháng', desc: 'Mở toàn bộ nội dung',   price: 99000, icon: 'star-outline',   iapProductId: 'premium_1m', type: 'subscription' },
];

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // loading theo từng item + provider
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  // Lấy userId nếu cần xác minh server (mở khi đã có Firebase Auth)
  // const userId = auth.currentUser?.uid;

  const canShowWallets = Platform.OS === 'android'; // Ẩn ví trên iOS cho digital goods để tránh vi phạm policy

  const buy = async (item: StoreItem, provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') => {
    const key = `${item.id}:${provider}`;
    try {
      setLoadingKey(key);
      const result = await payWith(provider, item /* , userId */);
      // Trạng thái 'completed' với IAP có thể là đã mua xong; nhưng QUYỀN nên cấp khi backend/receipt verify xong.
      if (result.status === 'completed') {
        Alert.alert('Thành công', 'Đang xác minh giao dịch. Kéo để làm mới số xu/quyền truy cập sau ít giây.');
      } else if (result.status === 'opened') {
        // Với ví/VNPay: IPN mới là quyết định cuối cùng, nên chỉ thông báo đã chuyển qua cổng thanh toán
        // Không làm gì thêm tại đây.
      }
    } catch (e: any) {
      Alert.alert('Thanh toán thất bại', e?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoadingKey(null);
    }
  };

  const confirmBuy = (item: StoreItem, provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') => {
    // Bạn có thể bỏ Alert này nếu muốn bấm là mua luôn
    Alert.alert(
      'Xác nhận',
      `Mua ${item.title} qua ${labelOf(provider)} với giá ${item.price.toLocaleString()}đ?`,
      [
        { text: 'Hủy' },
        { text: 'Đồng ý', onPress: () => buy(item, provider) },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={palette.bg}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🛒 Cửa hàng</Text>

        {/* Gợi ý chính sách ngắn gọn */}
        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
          <Text style={styles.noteText}>
            Nội dung số (xu, premium) trên iOS nên dùng In‑App Purchase. Ví (MoMo/ZaloPay/VNPay) hiển thị trên Android.
          </Text>
        </View>

        {ITEMS.map((item) => {
          const iapKey = `${item.id}:iap`;
          const momoKey = `${item.id}:momo`;
          const zaloKey = `${item.id}:zalopay`;
          const vnpKey = `${item.id}:vnpay`;

          return (
            <View key={item.id} style={[styles.card]}>
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

              {/* Hàng nút thanh toán */}
              <View style={styles.btnRow}>
                <PayBtn
                  label="Thanh toán In‑App"
                  icon="card-outline"
                  onPress={() => confirmBuy(item, 'iap')}
                  loading={loadingKey === iapKey}
                  p={palette}
                />
                {canShowWallets && (
                  <>
                    <PayBtn
                      label="MoMo"
                      icon="logo-usd" // Ionicons không có logo momo, dùng tạm
                      onPress={() => confirmBuy(item, 'momo')}
                      loading={loadingKey === momoKey}
                      p={palette}
                    />
                    <PayBtn
                      label="ZaloPay"
                      icon="cash-outline"
                      onPress={() => confirmBuy(item, 'zalopay')}
                      loading={loadingKey === zaloKey}
                      p={palette}
                    />
                    <PayBtn
                      label="VNPay"
                      icon="pricetag-outline"
                      onPress={() => confirmBuy(item, 'vnpay')}
                      loading={loadingKey === vnpKey}
                      p={palette}
                    />
                  </>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Nút thanh toán nhỏ ---------- */
function PayBtn({
  label,
  icon,
  onPress,
  loading,
  p,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  p: Palette;
}) {
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

/* ---------- Helper ---------- */
function labelOf(provider: 'iap' | 'momo' | 'zalopay' | 'vnpay') {
  switch (provider) {
    case 'iap': return 'In‑App (Store)';
    case 'momo': return 'MoMo';
    case 'zalopay': return 'ZaloPay';
    case 'vnpay': return 'VNPay';
  }
}

/* ---------- Styles theo theme ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    container: { padding: 16 },
    title: { fontSize: 22, fontWeight: '700', color: p.text, marginBottom: 14 },
    noteBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: p.card,
      borderColor: p.cardBorder,
      borderWidth: 1,
      padding: 10,
      borderRadius: 10,
      marginBottom: 12,
    },
    noteText: { color: p.textMuted, fontSize: 12, flex: 1 },
    card: {
      backgroundColor: p.card,
      padding: 14,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    iconCircle: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.brandSoft,
    },
    itemTitle: { fontSize: 16, fontWeight: '700', color: p.text },
    desc: { color: p.textMuted, fontSize: 13, marginTop: 2 },
    price: { fontWeight: '800', color: '#10B981' }, // giữ màu xanh giá để nổi bật
    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  });
}

const stylesBtn = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '700' },
});
