// app/(main)/Practice/Quick.tsx
import { db } from '@/scripts/firebase';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Quick = {
  id: string;
  title: string;
  class: number;
  questions?: any[];
};

export default function QuickScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Quick[]>([]);

  // TODO: thay bằng state lớp thực tế của user
  const selectedClass = 1; // ví dụ lớp 1

  useEffect(() => {
    const q = query(
      collection(db, 'quick_practice'),
      where('class', '==', selectedClass)
    );
    const unsub = onSnapshot(q, snap => {
      const arr: Quick[] = [];
      snap.forEach(doc => arr.push({ id: doc.id, ...(doc.data() as Quick) }));
      setItems(arr);
      setLoading(false);
    });
    return () => unsub();
  }, [selectedClass]);

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} />;
  }

  return (
    <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: '#0b1220' }}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              padding: 16,
              margin: 8,
              backgroundColor: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}
            onPress={() => router.push(`/Practice/Quick/${item.id}`)}
          >
            <Text style={{ color: 'white', fontSize: 16 }}>{item.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={{ color: 'gray', textAlign: 'center', marginTop: 20 }}>
            Chưa có Quick Practice cho lớp {selectedClass}
          </Text>
        }
      />
    </View>
  );
}
