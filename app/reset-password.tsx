import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://otp-server21-production.up.railway.app';
const ACCOUNT: 'mathmaster' =
  (process.env.EXPO_PUBLIC_ACCOUNT as any) || 'mathmaster';

// fetch có timeout
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default function ResetPasswordScreen() {
  const { email, account } = useLocalSearchParams<{ email?: string; account?: string }>();
  const accToUse = (account as string) || ACCOUNT;
  const emailSafe = useMemo(() => {
    try {
      return decodeURIComponent(String(email || '')).trim().toLowerCase();
    } catch {
      return String(email || '').trim().toLowerCase();
    }
  }, [email]);

  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const scheme = useColorScheme();

  // ===== Palette (đồng bộ dự án) =====
  const isDark = scheme === 'dark';
  const COLORS = {
    bg1: isDark ? '#0B1020' : '#eef1ff',
    bg2: isDark ? '#0E1530' : '#f6f7ff',
    card: isDark ? '#131a33' : '#ffffff',
    text: isDark ? '#EAF0FF' : '#1B2559',
    sub: isDark ? '#A9B5D9' : '#667085',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13, 29, 76, 0.08)',
    shadow: isDark ? '#000' : '#6C63FF',
    primary: '#6C63FF',
    primary2: '#8D84FF',
    accent: '#A993FF',
    danger: '#EF4444',
    success: '#16A34A',
  };

  const handleReset = async () => {
    if (!emailSafe) return Alert.alert('Lỗi', 'Không tìm thấy email');
    if (!password || !rePassword) return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự trở lên');
    if (password !== rePassword) return Alert.alert('Lỗi', 'Mật khẩu không trùng khớp');

    try {
      setLoading(true);
      const res = await fetchWithTimeout(
        `${API_BASE}/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailSafe, newPassword: password, account: accToUse }),
        },
        15000
      );

      const data = await res.json().catch(() => ({} as any));

      if (res.ok && data?.success) {
        Alert.alert('✅ Thành công', data?.message || 'Mật khẩu đã được cập nhật', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      } else {
        const msg =
          data?.message ||
          (res.status === 404
            ? 'Email không tồn tại trong hệ thống. Vui lòng kiểm tra lại hoặc đăng ký mới.'
            : 'Không thể cập nhật mật khẩu');
        Alert.alert('❌ Lỗi', msg);
      }
    } catch (e: any) {
      const aborted = e?.name === 'AbortError';
      Alert.alert('Lỗi', aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.bg1, COLORS.bg2]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar
          translucent
          barStyle={isDark ? 'light-content' : 'dark-content'}
          backgroundColor="transparent"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 18 }}>
            <View
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 999,
                backgroundColor: isDark ? 'rgba(140,130,255,0.12)' : 'rgba(108,99,255,0.12)',
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '600', letterSpacing: 0.2 }}>
                Math Master • Tài khoản
              </Text>
            </View>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                textAlign: 'center',
                color: COLORS.text,
                marginTop: 12,
              }}
            >
              Đặt lại mật khẩu
            </Text>
            <Text style={{ color: COLORS.sub, marginTop: 6, textAlign: 'center' }}>
              Nhập mật khẩu mới cho email của bạn để tiếp tục sử dụng.
            </Text>
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 16,
              padding: 18,
              gap: 14,
              borderWidth: 1,
              borderColor: COLORS.border,
              shadowColor: COLORS.shadow,
              shadowOpacity: isDark ? 0.25 : 0.15,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 8 },
              elevation: 4,
            }}
          >
            {/* Email row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                borderRadius: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.06)',
              }}
            >
              <FontAwesome5 name="envelope" size={14} color={COLORS.primary} />
              <Text style={{ marginLeft: 10, color: COLORS.sub, fontSize: 13 }}>Email</Text>
              <Text
                numberOfLines={1}
                style={{ marginLeft: 6, color: COLORS.text, fontWeight: '700', flex: 1 }}
              >
                {emailSafe || '(không có)'}
              </Text>
            </View>

            {/* Label + input */}
            <View>
              <Text style={{ color: COLORS.sub, marginBottom: 8, fontWeight: '600' }}>
                Mật khẩu mới
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor={isDark ? '#8B95B2' : '#9AA3B2'}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  style={{
                    backgroundColor: isDark ? '#0F1733' : '#fff',
                    color: COLORS.text,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ position: 'absolute', right: 12, top: 12, padding: 6, borderRadius: 999 }}
                >
                  <FontAwesome5
                    name={showPassword ? 'eye' : 'eye-slash'}
                    size={18}
                    color={isDark ? '#BFC7E6' : '#7C8596'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginTop: 6 }}>
              <Text style={{ color: COLORS.sub, marginBottom: 8, fontWeight: '600' }}>
                Nhập lại mật khẩu
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={isDark ? '#8B95B2' : '#9AA3B2'}
                  secureTextEntry={!showRePassword}
                  value={rePassword}
                  onChangeText={setRePassword}
                  editable={!loading}
                  onSubmitEditing={handleReset}
                  style={{
                    backgroundColor: isDark ? '#0F1733' : '#fff',
                    color: COLORS.text,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    fontSize: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowRePassword(!showRePassword)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ position: 'absolute', right: 12, top: 12, padding: 6, borderRadius: 999 }}
                >
                  <FontAwesome5
                    name={showRePassword ? 'eye' : 'eye-slash'}
                    size={18}
                    color={isDark ? '#BFC7E6' : '#7C8596'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hint */}
            <Text style={{ color: COLORS.sub, fontSize: 12, marginTop: -2 }}>
              Mẹo: dùng ≥ 6 ký tự, nên có chữ hoa, số để bảo mật tốt hơn.
            </Text>

            {/* Button */}
            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.9}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                marginTop: 6,
                opacity: loading ? 0.7 : 1,
              }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primary2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  shadowColor: COLORS.shadow,
                  shadowOpacity: 0.25,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 4,
                }}
              >
                <FontAwesome5 name="save" size={16} color="#fff" />
                <Text
                  style={{
                    color: 'white',
                    textAlign: 'center',
                    fontWeight: '800',
                    fontSize: 16,
                    marginLeft: 10,
                    letterSpacing: 0.3,
                    textTransform: 'uppercase',
                  }}
                >
                  {loading ? 'ĐANG LƯU…' : 'LƯU MẬT KHẨU'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Footnote */}
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 12, color: COLORS.sub }}>
                Tài khoản: <Text style={{ fontWeight: '700', color: COLORS.text }}>{accToUse}</Text>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
