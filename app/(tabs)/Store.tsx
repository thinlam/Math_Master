import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert, Linking, Platform, SafeAreaView, ScrollView,
  StatusBar, Text, TouchableOpacity, View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Theme */
import { useTheme } from '@/theme/ThemeProvider';

/* Firebase */
import { auth } from '@/scripts/firebase';

/* Payments */
import { payWith } from '@/services/payments';
import { grantPremium } from '@/services/subscription';

/* Local */
import { StoreStyles } from '@/components/style/tab/StoreStyles';
import PayBtn from '@/components/tab/store/PayBtn';
import { ITEMS, labelOf, type Provider, type StoreItem } from '@/constants/tab/store';

export default function StoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => StoreStyles(palette), [palette]);

  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const canShowWallets = Platform.OS === 'android'; // iOS policy

  const buy = async (item: StoreItem, provider: Provider) => {
    const key = `${item.id}:${provider}`;
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        Alert.alert('Cần đăng nhập', 'Vui lòng đăng nhập trước khi mua.');
        return;
      }
      setLoadingKey(key);

      // 1) Mở UI thanh toán (provider tuỳ platform)
      const result = await payWith(provider, item, userId);

      // 2) Cấp quyền nếu thanh toán xong
      if (result.status === 'completed') {
        await grantPremium(userId, item.id as any, provider);
        Alert.alert('Thành công', 'Tài khoản đã được nâng cấp Premium. Mở lại trang là thấy hiệu lực ngay!');
      }
      // opened / cancelled -> không alert thêm
    } catch (e: any) {
      Alert.alert('Thanh toán thất bại', e?.message ?? 'Vui lòng thử lại.');
    } finally {
      setLoadingKey(null);
    }
  };

  const confirmBuy = (item: StoreItem, provider: Provider) => {
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
          <TouchableOpacity onPress={() => router.push('/(tabs)/premium/Status')} style={styles.trackBtn} activeOpacity={0.85}>
            <Ionicons name="reader-outline" size={16} color={palette.editBtnText} />
            <Text style={[styles.trackLabel, { color: palette.editBtnText }]}>Theo dõi gói</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color={palette.textMuted} />
          <Text style={styles.noteText}>
            Trên iOS, nội dung số nên thanh toán qua In-App Purchase. Các ví (MoMo/ZaloPay/VNPay) chỉ hiển thị trên Android.
          </Text>
        </View>

        {ITEMS.map((item) => {
          const iapKey  = `${item.id}:iap`;
          const momoKey = `${item.id}:momo`;
          const zaloKey = `${item.id}:zalopay`;
          const vnpKey  = `${item.id}:vnpay`;

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
                <PayBtn
                  label="Thanh toán In-App" icon="card-outline"
                  onPress={() => confirmBuy(item, 'iap')}
                  loading={loadingKey === iapKey} p={palette}
                />
                {canShowWallets && (
                  <>
                    <PayBtn label="MoMo"    icon="logo-usd"        onPress={() => confirmBuy(item, 'momo')}    loading={loadingKey === momoKey} p={palette} />
                    <PayBtn label="ZaloPay" icon="cash-outline"    onPress={() => confirmBuy(item, 'zalopay')} loading={loadingKey === zaloKey} p={palette} />
                    <PayBtn label="VNPay"   icon="pricetag-outline" onPress={() => confirmBuy(item, 'vnpay')}   loading={loadingKey === vnpKey}  p={palette} />
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
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                Platform.OS === 'ios'
                  ? 'itms-apps://apps.apple.com/account/subscriptions'
                  : 'https://play.google.com/store/account/subscriptions'
              )
            }
          >
            <Text style={{ color: palette.link }}>Quản lý đăng ký</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
