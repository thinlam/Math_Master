// app/(tabs)/Store.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type StoreItem = {
  id: string;
  title: string;
  desc: string;
  price: number;
  icon: keyof typeof Ionicons.glyphMap;
};

const ITEMS: StoreItem[] = [
  { id: 'coins100', title: '100 xu', desc: 'Dùng để mở khóa bài học', price: 10000, icon: 'cash-outline' },
  { id: 'coins500', title: '500 xu', desc: 'Tiết kiệm hơn', price: 45000, icon: 'wallet-outline' },
  { id: 'premium1m', title: 'Gói Premium 1 tháng', desc: 'Mở toàn bộ nội dung', price: 99000, icon: 'star-outline' },
];

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const handleBuy = (item: StoreItem) => {
    Alert.alert('Thanh toán', `Bạn muốn mua ${item.title} với giá ${item.price.toLocaleString()}đ?`, [
      { text: 'Hủy' },
      { text: 'Đồng ý', onPress: () => {
          setLoading(true);
          setTimeout(() => {
            setLoading(false);
            Alert.alert('Thành công', `Bạn đã mua ${item.title}`);
          }, 1200);
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#fff' }}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>🛒 Cửa hàng</Text>

        {ITEMS.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.card}
            onPress={() => handleBuy(item)}
          >
            <Ionicons name={item.icon} size={32} color="#4F46E5" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
            <Text style={styles.price}>{item.price.toLocaleString()}đ</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  desc: { color: '#6B7280', fontSize: 14 },
  price: { fontWeight: '700', color: '#16A34A' },
});
