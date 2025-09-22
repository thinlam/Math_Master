import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { auth, db } from '@/scripts/firebase';
import { signOut as firebaseSignOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import Card from '@/components/admin/settings/Card';
import Divider from '@/components/admin/settings/Divider';
import RoleBadge from '@/components/admin/settings/RoleBadge';
import Row from '@/components/admin/settings/Row';
import { DangerButton, GhostButton, PrimaryButton } from '@/components/admin/settings/buttons';
import { AdminSettingsStyles as s } from '@/components/style/admin/AdminSettingsStyles';

type UserDoc = { name?: string | null; email?: string | null; role?: 'admin' | 'premium' | 'user' | string };

export default function AdminAccountSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  useEffect(() => {
    (async () => {
      try {
        const u = auth.currentUser;
        if (!u) {
          Alert.alert('Thông báo', 'Phiên hết hạn, vui lòng đăng nhập lại.');
          router.replace('/(auth)/LoginScreen');
          return;
        }
        const snap = await getDoc(doc(db, 'users', u.uid));
        if (snap.exists()) {
          const data = snap.data() as UserDoc;
          setProfile({
            name: data.name ?? u.displayName ?? '',
            email: data.email ?? u.email ?? '',
            role: (data.role as any) ?? 'user',
          });
        } else {
          setProfile({ name: u.displayName ?? '', email: u.email ?? '', role: 'user' });
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message ?? 'Không tải được hồ sơ.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const sendReset = async () => {
    try {
      const mail = auth.currentUser?.email || profile?.email;
      if (!mail) return Alert.alert('Lỗi', 'Tài khoản này chưa có email.');
      await sendPasswordResetEmail(auth, mail);
      Alert.alert('Đã gửi', 'Kiểm tra hộp thư để đặt lại mật khẩu.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.code || e?.message || 'Không gửi được email đặt lại mật khẩu.');
    }
  };

  const signOut = async () => {
    try {
      // await clearSession();
      await firebaseSignOut(auth);
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Đăng xuất thất bại.');
    }
  };

  return (
    <View style={s.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })} />

      {/* Header */}
      <View style={[s.header, { paddingTop }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cài đặt tài khoản</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={[s.scrollContent, { paddingBottom: paddingBottom + 16 }]}>
        {/* Info */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>Thông tin</Text>

          <Row label="Tên">
            <Text style={{ color: '#cbd5e1' }}>{loading ? '...' : profile?.name || '—'}</Text>
          </Row>

          <Divider />

          <Row label="Email">
            <Text style={{ color: '#cbd5e1' }}>{loading ? '...' : profile?.email || '—'}</Text>
          </Row>

          <Divider />

          <Row label="Quyền (role)">
            <RoleBadge role={(profile?.role as any) ?? 'user'} />
          </Row>
        </Card>

        {/* Security */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>Bảo mật</Text>
          <PrimaryButton title="Gửi email đặt lại mật khẩu" icon="mail-outline" onPress={sendReset} />
        </Card>

        {/* System */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>Hệ thống</Text>
          <GhostButton title="Cấu hình hệ thống" icon="settings-outline" onPress={() => router.push('/(admin)/admin-config')} />
        </Card>

        {/* Sign out */}
        <Card>
          <DangerButton title="Đăng xuất" icon="log-out-outline" onPress={signOut} />
        </Card>
      </ScrollView>
    </View>
  );
}
