// app/(tabs)/Challenge.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase (lấy challenge từ Firestore) ---------- */
import { db } from '@/scripts/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';

/* ---------- Types ---------- */
type Challenge = {
  id: string;
  title: string;
  desc: string;
  reward: number;   // số xu hoặc điểm
  type: 'daily' | 'weekly';
};

/* ---------- Component ---------- */
export default function ChallengeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<Challenge[]>([]);

  const fetchChallenges = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'challenges'), orderBy('type'), limit(20));
      const snap = await getDocs(q);
      const data: Challenge[] = snap.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as Omit<Challenge, 'id'>),
      }));
      setChallenges(data);
    } catch (err) {
      console.error('Lỗi fetch challenge:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChallenges();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: Challenge }) => (
    <TouchableOpacity
      style={{
        backgroundColor: '#fff',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
      }}
      /* Đi tới trang chi tiết challenge */
      onPress={() => router.push(`/Challenge/${item.id}`)} // đi tới trang chi tiết
    >
      <Ionicons
        name={item.type === 'daily' ? 'sunny-outline' : 'calendar-outline'}
        size={28}
        color={item.type === 'daily' ? '#F59E0B' : '#3B82F6'}
        style={{ marginRight: 12 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{item.title}</Text>
        <Text style={{ color: '#666', marginTop: 2 }}>{item.desc}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <MaterialCommunityIcons name="star-circle-outline" size={22} color="#EAB308" />
        <Text style={{ marginLeft: 4, fontWeight: '600' }}>{item.reward}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="dark-content" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#4F46E5" />
      ) : (
        <FlatList
          data={challenges}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#666' }}>
              Hiện chưa có thử thách nào
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
