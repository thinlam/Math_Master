// app/(legal)/terms.tsx
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Linking,
    Platform,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const BRAND = {
  primary: '#6C63FF',
  primaryAlt: '#7A5CFF',
  darkBg: '#0B1220',
  lightBg: '#F8FAFC',
  cardLight: '#FFFFFF',
  cardDark: '#111827',
  textLight: '#111827',
  textMutedLight: '#6B7280',
  textDark: '#F9FAFB',
  textMutedDark: '#9CA3AF',
  dividerLight: '#E5E7EB',
  dividerDark: '#1F2937',
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const scheme = useColorScheme();
  const color = scheme === 'dark' ? BRAND.textDark : BRAND.textLight;
  const divider = scheme === 'dark' ? BRAND.dividerDark : BRAND.dividerLight;
  return (
    <View
      style={{ paddingVertical: 16, borderTopWidth: 1, borderTopColor: divider }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color,
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
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

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scheme = useColorScheme();

  const bg = scheme === 'dark' ? BRAND.darkBg : BRAND.lightBg;
  const card = scheme === 'dark' ? BRAND.cardDark : BRAND.cardLight;
  const text = scheme === 'dark' ? BRAND.textDark : BRAND.textLight;
  const muted = scheme === 'dark' ? BRAND.textMutedDark : BRAND.textMutedLight;

  return (
    <SafeAreaView
      style={{ flex: 1, paddingTop: insets.top, backgroundColor: bg }}
    >
      {/* Header Gradient */}
      <LinearGradient
        colors={[BRAND.primary, BRAND.primaryAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/Store')}
          style={{ padding: 8, marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '700' }}>
          Điều khoản sử dụng
        </Text>
      </LinearGradient>

      {/* Body */}
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            backgroundColor: card,
            borderRadius: 16,
            padding: 18,
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          {/* Intro */}
          <Text
            style={{
              color: text,
              fontSize: 14,
              lineHeight: 20,
              marginBottom: 8,
              fontWeight: '600',
            }}
          >
            Khi sử dụng ứng dụng Math Master, bạn đồng ý tuân thủ các điều khoản
            dưới đây. Vui lòng đọc kỹ trước khi sử dụng.
          </Text>

          {/* Updated at */}
          <Text style={{ color: muted, fontSize: 12, marginTop: 10 }}>
            Cập nhật lần cuối: 17/09/2025
          </Text>

          {/* Sections */}
          <Section title="1. Tài khoản người dùng">
            <Bullet>
              Tài khoản là cá nhân và không được chia sẻ, bán, cho thuê hoặc sử
              dụng trái phép.
            </Bullet>
            <Bullet>
              Bạn chịu trách nhiệm bảo mật thông tin đăng nhập và mọi hoạt động
              liên quan đến tài khoản của mình.
            </Bullet>
          </Section>

          <Section title="2. Quyền sử dụng nội dung">
            <Bullet>
              Nội dung số trong ứng dụng chỉ dành cho mục đích học tập cá nhân.
            </Bullet>
            <Bullet>
              Nghiêm cấm sao chép, phát hành hoặc sử dụng cho mục đích thương
              mại khi chưa có sự đồng ý bằng văn bản.
            </Bullet>
          </Section>

          <Section title="3. Premium & thanh toán">
            <Bullet>
              Premium được gia hạn tự động theo gói đăng ký của bạn.
            </Bullet>
            <Bullet>
              Việc quản lý hoặc hủy gói Premium được thực hiện trực tiếp trên
              kho ứng dụng (App Store, Google Play) hoặc ví điện tử đã thanh
              toán.
            </Bullet>
          </Section>

          <Section title="4. Giới hạn trách nhiệm">
            <Text style={{ color: muted, lineHeight: 20 }}>
              Dịch vụ được cung cấp trên cơ sở{' '}
              <Text style={{ fontWeight: '700', color: text }}>"as-is"</Text>,
              không có bất kỳ bảo đảm nào. Chúng tôi không chịu trách nhiệm đối
              với thiệt hại gián tiếp, mất dữ liệu hoặc gián đoạn dịch vụ ngoài
              tầm kiểm soát hợp lý.
            </Text>
          </Section>

          <Section title="5. Liên hệ">
            <Text style={{ color: muted, lineHeight: 20, marginBottom: 8 }}>
              Nếu có câu hỏi về điều khoản sử dụng, vui lòng liên hệ:
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:mathmaster396@gmail.com')}
            >
              <Text style={{ color: BRAND.primary, fontWeight: '700' }}>
                mathmaster396@gmail.com
              </Text>
            </TouchableOpacity>
          </Section>

          {/* Optional: link sang Privacy */}
          <View style={{ paddingTop: 8 }}>
            <TouchableOpacity onPress={() => router.push('/(legal)/privacy')}>
              <Text
                style={{ color: BRAND.primary, fontSize: 13, fontWeight: '600' }}
              >
                Xem Chính sách Quyền Riêng Tư
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: Platform.OS === 'ios' ? 24 : 12 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
