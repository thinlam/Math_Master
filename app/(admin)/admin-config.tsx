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
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { db } from '@/scripts/firebase';
import { getCurrentVersion } from '@/scripts/versioning';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import {
  ChipButton,
  InlineInput,
  MultilineInput,
  PrimaryCTA,
  SettingCard,
  SettingHint,
  SettingRow,
  SettingRowTop,
} from '@/components/admin/common/SettingBlocks';
import { AdminConfigStyles as s } from '@/components/style/admin/AdminConfigStyles';

type AdminConfig = {
  maintenance?: boolean;
  minVersion?: string | null;
  bannerText?: string | null;
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
          maintenance: !!cfg.maintenance,
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
    <View style={s.root}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      {/* Header */}
      <View style={[s.headerWrap, { paddingTop }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Cấu hình hệ thống</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ ...s.content, paddingBottom: paddingBottom + 16 }}
      >
        {/* Version info */}
        <SettingCard title="Thông tin phiên bản">
          <SettingRow label="Phiên bản hiện tại">
            <Text style={{ color: '#fff' }}>{currentVersion}</Text>
          </SettingRow>

          <ChipButton
            title="Dùng phiên bản hiện tại làm tối thiểu"
            onPress={() => setCfg((c) => ({ ...c, minVersion: currentVersion }))}
          />
          <SettingHint text="Đây là phiên bản app đang chạy. Nhấn nút để điền nhanh minVersion." />
        </SettingCard>

        {/* Maintenance */}
        <SettingCard title="Chế độ bảo trì">
          <SettingRow label="Bảo trì (maintenance)">
            <Switch
              value={!!cfg.maintenance}
              onValueChange={(v) => setCfg((c) => ({ ...c, maintenance: v }))}
            />
          </SettingRow>
          <SettingHint text="Khi bật, client có thể chặn user thường vào app (tuỳ logic phía client)." />
        </SettingCard>

        {/* Min version */}
        <SettingCard title="Phiên bản tối thiểu">
          <SettingRow label="Min app version">
            <InlineInput
              value={cfg.minVersion ?? ''}
              onChangeText={(t) => setCfg((c) => ({ ...c, minVersion: t }))}
              placeholder="Ví dụ: 1.0.3"
              autoCapitalize="none"
            />
          </SettingRow>
          <SettingHint text="Client so sánh version hiện tại với minVersion và buộc cập nhật nếu thấp hơn." />
        </SettingCard>

        {/* Banner (optional) */}
        <SettingCard title="Banner thông báo (tuỳ chọn)">
          <SettingRowTop label="Nội dung banner">
            <MultilineInput
              value={cfg.bannerText ?? ''}
              onChangeText={(t) => setCfg((c) => ({ ...c, bannerText: t }))}
              placeholder="Ví dụ: Lịch bảo trì 22:00–23:00 tối nay."
            />
          </SettingRowTop>
          <SettingHint text="Để trống để ẩn banner trong app." />
        </SettingCard>

        <PrimaryCTA title="Lưu cấu hình" onPress={save} disabled={saving || loading} />
      </ScrollView>
    </View>
  );
}
