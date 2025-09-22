// constants/tab/store.ts
import { Ionicons } from '@expo/vector-icons';

export type Provider = 'iap' | 'momo' | 'zalopay' | 'vnpay';

export type StoreItem = {
  id: string;
  title: string;
  desc: string;
  price: number; // VND
  icon: keyof typeof Ionicons.glyphMap;
  iapProductId?: string;
  type?: 'consumable' | 'non_consumable' | 'subscription';
};

export const ITEMS: StoreItem[] = [
  { id: 'premium1m', title: 'Gói Premium 1 tháng', desc: 'Mở toàn bộ nội dung trong 30 ngày', price: 99000, icon: 'star-outline', iapProductId: 'premium_1m', type: 'subscription' },
  { id: 'premium6m', title: 'Gói Premium 6 tháng', desc: 'Tiết kiệm ~15% so với trả theo tháng', price: 499000, icon: 'star-outline', iapProductId: 'premium_6m', type: 'subscription' },
  { id: 'premium1y', title: 'Gói Premium 1 năm', desc: 'Tiết kiệm ~25% so với trả theo tháng', price: 899000, icon: 'star-outline', iapProductId: 'premium_1y', type: 'subscription' },
];

export const labelOf = (provider: Provider) => {
  switch (provider) {
    case 'iap': return 'In-App (Store)';
    case 'momo': return 'MoMo';
    case 'zalopay': return 'ZaloPay';
    case 'vnpay': return 'VNPay';
  }
};

export const canShowWallets = Platform.OS === 'android'; // tránh vi phạm policy iOS
