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

import StatCard from '@/components/admin/common/StatCard';
import { AnalyticsStyles as s } from '@/components/style/admin/AnalyticsStyles';

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
    <View style={s.root}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      {/* Header */}
      <View style={[s.headerWrap, { paddingTop }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Phân tích</Text>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ ...s.content, paddingBottom: paddingBottom + 16 }}
      >
        <StatCard title="Tổng người dùng" value={numbers.users} />
        <StatCard title="Tổng bài học" value={numbers.lessons} />
        <StatCard title="Tổng báo cáo" value={numbers.reports} />
      </ScrollView>
    </View>
  );
}
