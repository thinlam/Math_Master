// app/(admin)/settings.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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

import { auth, db } from '@/scripts/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Nếu bạn có util xoá phiên, import vào (không có thì comment dòng gọi ở dưới)
// import { clearSession } from '@/scripts/secureSession';

type UserDoc = {
  name?: string | null;
  email?: string | null;
  role?: 'admin' | 'premium' | 'user' | string;
};

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
          // ưu tiên email từ auth nếu chưa có trong doc
          setProfile({
            name: data.name ?? u.displayName ?? '',
            email: data.email ?? u.email ?? '',
            role: (data.role as any) ?? 'user',
          });
        } else {
          setProfile({
            name: u.displayName ?? '',
            email: u.email ?? '',
            role: 'user',
          });
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
      if (!mail) {
        Alert.alert('Lỗi', 'Tài khoản này chưa có email.');
        return;
      }
      await sendPasswordResetEmail(auth, mail);
      Alert.alert('Đã gửi', 'Kiểm tra hộp thư để đặt lại mật khẩu.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.code || e?.message || 'Không gửi được email đặt lại mật khẩu.');
    }
  };

  const signOut = async () => {
    try {
      // Xoá phiên app nếu bạn có secure store
      // await clearSession();
      await auth.signOut();
      router.replace('/(auth)/login');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Đăng xuất thất bại.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop,
          paddingBottom: 8,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Cài đặt tài khoản</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: paddingBottom + 16 }}
      >
        {/* Thông tin tài khoản */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Thông tin
          </Text>

          <Row label="Tên">
            <Text style={{ color: '#cbd5e1' }}>
              {loading ? '...' : profile?.name || '—'}
            </Text>
          </Row>

          <Divider />

          <Row label="Email">
            <Text style={{ color: '#cbd5e1' }}>
              {loading ? '...' : profile?.email || '—'}
            </Text>
          </Row>

          <Divider />

          <Row label="Quyền (role)">
            <RoleBadge role={(profile?.role as any) ?? 'user'} />
          </Row>
        </Card>

        {/* Bảo mật */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Bảo mật
          </Text>
          <PrimaryButton title="Gửi email đặt lại mật khẩu" icon="mail-outline" onPress={sendReset} />
        </Card>

        {/* Hệ thống / Điều hành */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Hệ thống
          </Text>
          <GhostButton
            title="Cấu hình hệ thống"
            icon="settings-outline"
            onPress={() => router.push('/(admin)/admin-config')}
          />
        </Card>

        {/* Đăng xuất */}
        <Card>
          <DangerButton title="Đăng xuất" icon="log-out-outline" onPress={signOut} />
        </Card>
      </ScrollView>
    </View>
  );
}

/* ---------- UI Helpers ---------- */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{label}</Text>
      <View style={{ marginLeft: 12 }}>{children}</View>
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 }} />;
}

function PrimaryButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#3b82f6',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={{ color: '#fff', fontWeight: '800' }}>{title}</Text>
    </TouchableOpacity>
  );
}

function GhostButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Ionicons name={icon} size={18} color="#e5e7eb" />
      <Text style={{ color: '#e5e7eb', fontWeight: '700' }}>{title}</Text>
    </TouchableOpacity>
  );
}

function DangerButton({
  title,
  icon,
  onPress,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(239,68,68,0.15)',
        borderColor: 'rgba(239,68,68,0.4)',
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
      }}
    >
      <Ionicons name={icon} size={18} color="#ef4444" />
      <Text style={{ color: '#ef4444', fontWeight: '800' }}>{title}</Text>
    </TouchableOpacity>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<
    string,
    { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
  > = {
    admin: { label: 'Admin', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: 'shield-checkmark-outline' },
    premium: { label: 'Premium', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', icon: 'star-outline' },
    user: { label: 'User', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', icon: 'person-outline' },
  };
  const style = map[role] ?? map.user;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 999,
        backgroundColor: style.bg,
      }}
    >
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={{ color: style.color, fontWeight: '700', fontSize: 12 }}>{style.label}</Text>
    </View>
  );
}
