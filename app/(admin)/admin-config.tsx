// app/(admin)/admin-config.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StatusBar,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/scripts/firebase';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

// >>> Thêm: helper lấy version hiện tại
import { getCurrentVersion } from '@/scripts/versioning';

type AdminConfig = {
  maintenance?: boolean;
  minVersion?: string | null;
  bannerText?: string | null; // tuỳ chọn: hiển thị thông báo chung trong app
  updatedAt?: any;
};

export default function AdminConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [cfg, setCfg] = useState<AdminConfig>({
    maintenance: false,
    minVersion: null,
    bannerText: null,
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // >>> Lấy version hiện tại để hiển thị & điền nhanh
  const currentVersion = getCurrentVersion();

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'adminConfig', 'app'));
        if (snap.exists()) {
          const data = snap.data() as AdminConfig;
          setCfg({
            maintenance: !!data.maintenance,
            minVersion: data.minVersion ?? null,
            bannerText: data.bannerText ?? null,
          });
        }
      } catch (e: any) {
        Alert.alert('Lỗi', e?.message ?? 'Không tải được cấu hình hệ thống.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await setDoc(
        doc(db, 'adminConfig', 'app'),
        {
          ...cfg,
          // chuẩn hoá field rỗng về null
          minVersion: (cfg.minVersion?.trim() || null) as string | null,
          bannerText: (cfg.bannerText?.trim() || null) as string | null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      Alert.alert('Đã lưu', 'Cấu hình hệ thống đã được cập nhật.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không lưu được cấu hình.');
    } finally {
      setSaving(false);
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
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>Cấu hình hệ thống</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: paddingBottom + 16 }}
      >
        {/* Thông tin phiên bản hiện tại */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Thông tin phiên bản
          </Text>
          <Row label="Phiên bản hiện tại">
            <Text style={{ color: '#fff' }}>{currentVersion}</Text>
          </Row>

          <TouchableOpacity
            onPress={() => setCfg((c) => ({ ...c, minVersion: currentVersion }))}
            style={{
              marginTop: 10,
              alignSelf: 'flex-start',
              backgroundColor: 'rgba(59,130,246,0.15)',
              borderWidth: 1,
              borderColor: 'rgba(59,130,246,0.45)',
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#93c5fd', fontWeight: '700' }}>
              Dùng phiên bản hiện tại làm tối thiểu
            </Text>
          </TouchableOpacity>

          <Hint text="Đây là phiên bản app đang chạy trên thiết bị. Nhấn nút để điền nhanh minVersion." />
        </Card>

        {/* Maintenance */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Chế độ bảo trì
          </Text>
          <Row label="Bảo trì (maintenance)">
            <Switch
              value={!!cfg.maintenance}
              onValueChange={(v) => setCfg((c) => ({ ...c, maintenance: v }))}
            />
          </Row>
          <Hint text="Khi bật, app có thể chặn người dùng thường vào app (tuỳ bạn xử lý ở client)." />
        </Card>

        {/* Phiên bản tối thiểu */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Phiên bản tối thiểu
          </Text>
          <Row label="Min app version">
            <TextInput
              value={cfg.minVersion ?? ''}
              onChangeText={(t) => setCfg((c) => ({ ...c, minVersion: t }))}
              placeholder="Ví dụ: 1.0.3"
              placeholderTextColor="#94a3b8"
              style={{ color: '#fff', flex: 1, textAlign: 'right' }}
              autoCapitalize="none"
            />
          </Row>
          <Hint text="Client sẽ so sánh version hiện tại với minVersion và buộc update nếu thấp hơn." />
        </Card>

        {/* Banner thông báo (tuỳ chọn) */}
        <Card>
          <Text style={{ color: '#e5e7eb', fontWeight: '800', marginBottom: 10 }}>
            Banner thông báo (tuỳ chọn)
          </Text>
          <RowTop label="Nội dung banner">
            <TextInput
              value={cfg.bannerText ?? ''}
              onChangeText={(t) => setCfg((c) => ({ ...c, bannerText: t }))}
              placeholder="Ví dụ: Lịch bảo trì 22:00–23:00 tối nay."
              placeholderTextColor="#94a3b8"
              style={{
                color: '#fff',
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 8,
              }}
              multiline
            />
          </RowTop>
          <Hint text="Nếu để trống, app sẽ ẩn banner." />
        </Card>

        {/* Save */}
        <TouchableOpacity
          onPress={save}
          disabled={saving || loading}
          style={{
            marginTop: 4,
            backgroundColor: saving || loading ? 'rgba(59,130,246,0.35)' : '#3b82f6',
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </Text>
        </TouchableOpacity>
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
      <View style={{ marginLeft: 12, flexShrink: 1 }}>{children}</View>
    </View>
  );
}

function RowTop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingVertical: 6 }}>
      <Text style={{ color: '#e5e7eb', fontWeight: '700', marginBottom: 6 }}>{label}</Text>
      {children}
    </View>
  );
}

function Hint({ text }: { text: string }) {
  return <Text style={{ color: '#94a3b8', marginTop: 6, fontSize: 12 }}>{text}</Text>;
}
