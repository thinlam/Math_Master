// app/(legal)/privacy.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, Platform, ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = {
  primary: '#6C63FF', // tím thương hiệu
  primaryAlt: '#7A5CFF',
  darkBg: '#0B1220',
  lightBg: '#F8FAFC', // nền sáng nhã
  cardLight: '#FFFFFF',
  cardDark: '#111827',
  textLight: '#111827',
  textMutedLight: '#6B7280',
  textDark: '#F9FAFB',
  textMutedDark: '#9CA3AF',
  dividerLight: '#E5E7EB',
  dividerDark: '#1F2937',
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const scheme = useColorScheme();
  const color = scheme === 'dark' ? BRAND.textDark : BRAND.textLight;
  const divider = scheme === 'dark' ? BRAND.dividerDark : BRAND.dividerLight;
  return (
    <View style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: divider }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color, marginBottom: 8 }}>{title}</Text>
      {children}
    </View>
  );
};

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const scheme = useColorScheme();
  const color = scheme === 'dark' ? BRAND.textDark : BRAND.textLight;
  const muted = scheme === 'dark' ? BRAND.textMutedDark : BRAND.textMutedLight;
  return (
    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
      <Text style={{ color, marginRight: 8 }}>•</Text>
      <Text style={{ color: muted, flex: 1, lineHeight: 20 }}>{children}</Text>
    </View>
  );
};

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();

  const bg = scheme === 'dark' ? BRAND.darkBg : BRAND.lightBg;
  const card = scheme === 'dark' ? BRAND.cardDark : BRAND.cardLight;
  const text = scheme === 'dark' ? BRAND.textDark : BRAND.textLight;
  const muted = scheme === 'dark' ? BRAND.textMutedDark : BRAND.textMutedLight;

  return (
    <SafeAreaView style={{ flex: 1, paddingTop: insets.top, backgroundColor: bg }}>
      {/* Header Gradient */}
      <LinearGradient
        colors={[BRAND.primary, BRAND.primaryAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
      >
        <TouchableOpacity onPress={() => router.push('/(tabs)/Store')} style={{ padding: 8, marginRight: 8 }}>
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>Chính sách Quyền Riêng Tư</Text>
      </LinearGradient>

      {/* Body */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: card,
            borderRadius: 16,
            padding: 18,
            // iOS shadow
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            // Android elevation
            elevation: 2,
          }}
        >
          {/* Intro */}
          <Text style={{ color: text, fontSize: 14, lineHeight: 20, marginBottom: 8, fontWeight: '600' }}>
            Math Master cam kết bảo vệ dữ liệu cá nhân của bạn.
          </Text>
          <Text style={{ color: muted, fontSize: 14, lineHeight: 20 }}>
            Chính sách này giải thích cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ dữ liệu khi bạn dùng ứng dụng.
          </Text>

          {/* Updated at */}
          <Text style={{ color: muted, fontSize: 12, marginTop: 10 }}>
            Cập nhật lần cuối: 17/09/2025
          </Text>

          {/* Sections */}
          <Section title="1. Thông tin chúng tôi thu thập">
            <Bullet>Email và tên hiển thị.</Bullet>
            <Bullet>Lịch sử học tập, tiến độ và tương tác trong ứng dụng.</Bullet>
            <Bullet>
              Giao dịch thanh toán (chúng tôi <Text style={{ fontWeight: '700', color: text }}>không lưu số thẻ</Text>).
            </Bullet>
          </Section>

          <Section title="2. Mục đích sử dụng">
            <Bullet>Xác thực tài khoản và duy trì phiên đăng nhập an toàn.</Bullet>
            <Bullet>Đồng bộ tiến độ học tập giữa các thiết bị.</Bullet>
            <Bullet>Kích hoạt, kiểm tra trạng thái và quyền lợi Premium.</Bullet>
          </Section>

          <Section title="3. Lưu trữ & bảo mật">
            <Text style={{ color: muted, lineHeight: 20 }}>
              Dữ liệu được lưu trên Firebase (Auth, Firestore, Storage) với kiểm soát truy cập, mã hóa truyền tải (TLS) và
              các biện pháp bảo mật theo tiêu chuẩn ngành. Chúng tôi áp dụng nguyên tắc tối thiểu hóa dữ liệu.
            </Text>
          </Section>

          <Section title="4. Chia sẻ thông tin">
            <Text style={{ color: muted, lineHeight: 20, marginBottom: 6 }}>
              Chúng tôi <Text style={{ fontWeight: '700', color: text }}>không chia sẻ</Text> dữ liệu cá nhân cho bên thứ ba,
              ngoại trừ nhà cung cấp thanh toán để xử lý giao dịch theo yêu cầu của bạn hoặc khi pháp luật yêu cầu.
            </Text>
          </Section>

          <Section title="5. Quyền của bạn">
            <Bullet>Yêu cầu truy cập, chỉnh sửa hoặc xóa dữ liệu cá nhân.</Bullet>
            <Bullet>Rút lại sự đồng ý (nếu áp dụng) và khiếu nại về quyền riêng tư.</Bullet>
            <Text style={{ color: muted, lineHeight: 20, marginTop: 6 }}>
              Để thực hiện quyền, vui lòng liên hệ hỗ trợ và chúng tôi sẽ phản hồi trong thời hạn hợp lý.
            </Text>
          </Section>

          <Section title="6. Liên hệ">
            <Text style={{ color: muted, lineHeight: 20, marginBottom: 8 }}>
              Nếu có câu hỏi về quyền riêng tư, hãy liên hệ:
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('mailto:mathmaster396@gmail.com')}>
              <Text style={{ color: BRAND.primary, fontWeight: '700' }}>mathmaster396@gmail.com</Text>
            </TouchableOpacity>
          </Section>

          {/* Optional: liên kết điều khoản */}
          <View style={{ paddingTop: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(legal)/terms')}>
              <Text style={{ color: BRAND.primary, fontSize: 13, fontWeight: '600' }}>Xem Điều khoản sử dụng</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom spacer cho iOS home indicator */}
        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
