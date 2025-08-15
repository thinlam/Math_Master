// app/(admin)/_layout.tsx
import { auth, db } from '@/scripts/firebase';
import { Stack, useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function AdminLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          router.replace('/(auth)/Login');
          return;
        }
        const snap = await getDoc(doc(db, 'users', u.uid));
        const role = snap.data()?.role;
        if (role !== 'admin') {
          router.replace('/(tabs)');
          return;
        }
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      {/* nơi khác: users, lessons, reports,... */}
    </Stack>
  );
}
