// app/(admin)/analytics.tsx
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, getCountFromServer } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [numbers, setNumbers] = useState({ users: 0, lessons: 0, reports: 0 });

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  useEffect(() => {
    (async () => {
      try {
        const [u, l, r] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'lessons')),
          getCountFromServer(collection(db, 'reports')),
        ]);
        setNumbers({
          users: u.data().count,
          lessons: l.data().count,
          reports: r.data().count,
        });
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message ?? 'Không tải được số liệu.');
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({
          android: 'transparent',
          ios: 'transparent',
        })}
      />

      {/* Header */}
      <View
        style={{
          paddingTop,
          paddingHorizontal: 16,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Nút quay lại - đổi "arrow-back" thành "close" nếu muốn dấu X */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: 'rgba(255,255,255,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.12)',
          }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Tiêu đề */}
        <Text
          style={{
            color: '#fff',
            fontSize: 20,
            fontWeight: '800',
            flex: 1,
            textAlign: 'center',
            marginRight: 40, // Để title thật sự ở giữa
          }}
        >
          Phân tích
        </Text>
      </View>

      {/* Nội dung */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: paddingBottom + 16,
        }}
      >
        <Card title="Tổng người dùng" value={numbers.users} />
        <Card title="Tổng bài học" value={numbers.lessons} />
        <Card title="Tổng báo cáo" value={numbers.reports} />
      </ScrollView>
    </View>
  );
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 12,
      }}
    >
      <Text style={{ color: '#cbd5e1' }}>{title}</Text>
      <Text
        style={{
          color: '#fff',
          fontWeight: '800',
          fontSize: 28,
          marginTop: 6,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
