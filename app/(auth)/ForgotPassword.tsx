import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/* =====================
   1) HẰNG SỐ CẤU HÌNH
   ===================== */

// Độ dài OTP
const OTP_LENGTH = 6;

// Thời gian cooldown gửi lại (giây)
const COOLDOWN_SECONDS = 60;

// App nào đang dùng server OTP
const ACCOUNT = (process.env.EXPO_PUBLIC_ACCOUNT || 'mathmaster').toLowerCase();

// API base (đặt trong .env cho production)
const API_BASE = process.env.EXPO_PUBLIC_API_BASE
  || 'https://otp-server-production-6c26.up.railway.app';

const ENDPOINTS = {
  SEND_OTP: `${API_BASE}/send-otp`,
  VERIFY_OTP: `${API_BASE}/verify-otp`,
};

// Regex email cơ bản
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);

// fetch có timeout (RN không có sẵn)
async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export default function ForgotPasswordScreen() {
  /* =====================
     2) STATE
     ===================== */
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dev helper: nếu server có trả OTP (RETURN_OTP_IN_RESPONSE=true) thì hiện để test
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const titleText = useMemo(() => '🔐 Nhập Gmail để nhận mã OTP (Math Master)', []);

  // Nhận sẵn email từ param (nếu có)
  useEffect(() => {
    if (typeof emailParam === 'string' && emailParam.trim()) {
      try {
        setEmail(decodeURIComponent(emailParam));
      } catch {
        setEmail(emailParam);
      }
    }
  }, [emailParam]);

  // Cleanup interval khi unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(COOLDOWN_SECONDS);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* =====================
     3) GỬI OTP
     ===================== */
  const sendOtp = async () => {
    if (!isEmail(email)) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ.');
      return;
    }
    if (loading || cooldown > 0) return;

    try {
      setLoading(true);

      const res = await fetchWithTimeout(
        ENDPOINTS.SEND_OTP,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, account: ACCOUNT }),
        },
        15000
      );

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setSentOtp(true);
        startCooldown();

        // Nếu server bật flag dev và trả về otp, show để test (đừng dùng cho prod)
        setDevOtp(typeof data.otp === 'string' ? data.otp : null);

        Alert.alert('Thành công', 'OTP đã được gửi đến Gmail của bạn.');
      } else {
        const msg =
          data?.message ||
          (res.status === 429
            ? 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
            : 'Không gửi được OTP, vui lòng thử lại.');
        Alert.alert('Lỗi', msg);
      }
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      console.error('Lỗi gửi OTP:', err);
      Alert.alert('Lỗi', aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     4) XÁC THỰC OTP (gọi /verify-otp)
     ===================== */
  const verifyOtp = async () => {
    if (!sentOtp) return Alert.alert('Lỗi', 'Vui lòng gửi mã OTP trước.');
    if (!otp || otp.length < OTP_LENGTH) return Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} ký tự OTP.`);

    try {
      setLoading(true);

      const res = await fetchWithTimeout(
        ENDPOINTS.VERIFY_OTP,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, account: ACCOUNT }),
        },
        15000
      );

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        // qua màn đặt lại mật khẩu
        router.push({ pathname: '/reset-password', params: { email } });
      } else {
        Alert.alert('Sai mã', data?.message || 'OTP không đúng hoặc đã hết hạn.');
      }
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      console.error('Lỗi verify OTP:', err);
      Alert.alert('Lỗi', aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     5) UI
     ===================== */
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#0b0c10', padding: 24 }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#E5E7EB' }}>
          {titleText}
        </Text>

        <TextInput
          placeholder="example@gmail.com"
          value={email}
          onChangeText={t => setEmail(t.trim())}
          keyboardType="email-address"
          placeholderTextColor={'#9CA3AF'}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          style={{
            backgroundColor: '#111827',
            color: '#F9FAFB',
            padding: 14,
            borderRadius: 10,
            fontSize: 16,
            borderColor: '#374151',
            borderWidth: 1,
            marginBottom: 12,
          }}
        />
        <Text style={{ color: '#9CA3AF', marginBottom: 16, fontSize: 13 }}>
          Nhập email đã đăng ký Math Master để nhận mã OTP.
        </Text>

        {sentOtp && (
          <>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#E5E7EB' }}>
              📩 Nhập mã OTP vừa nhận
            </Text>
            <TextInput
              placeholder={`Nhập ${OTP_LENGTH} số OTP`}
              value={otp}
              onChangeText={t => setOtp(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
              keyboardType="number-pad"
              placeholderTextColor={'#9CA3AF'}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={OTP_LENGTH}
              editable={!loading}
              style={{
                backgroundColor: '#111827',
                color: '#F9FAFB',
                padding: 14,
                borderRadius: 10,
                fontSize: 18,
                letterSpacing: 4,
                borderColor: '#374151',
                borderWidth: 1,
                marginBottom: 12,
                textAlign: 'center',
              }}
            />

            {/* Dev helper: hiển thị OTP nếu server trả về (chỉ dùng khi test) */}
            {devOtp && (
              <Text style={{ color: '#A3E635', marginBottom: 8, textAlign: 'center' }}>
                (DEV) OTP server: {devOtp}
              </Text>
            )}
          </>
        )}

        <TouchableOpacity
          onPress={sentOtp ? verifyOtp : sendOtp}
          disabled={loading}
          style={{
            backgroundColor: '#7C3AED',
            paddingVertical: 14,
            borderRadius: 10,
            opacity: loading ? 0.7 : 1,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
            {loading
              ? sentOtp ? 'ĐANG XÁC NHẬN...' : 'ĐANG GỬI...'
              : sentOtp ? 'XÁC NHẬN OTP' : 'GỬI MÃ (MATH MASTER)'}
          </Text>
        </TouchableOpacity>

        {sentOtp && (
          <TouchableOpacity onPress={sendOtp} disabled={loading || cooldown > 0} style={{ marginBottom: 16 }}>
            <Text
              style={{
                textAlign: 'center',
                color: loading || cooldown > 0 ? '#6B7280' : '#A78BFA',
                fontWeight: '600',
              }}
            >
              {cooldown > 0 ? `Gửi lại OTP sau ${cooldown}s` : 'Gửi lại OTP (Math Master)'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={{ color: '#A78BFA', fontSize: 16, fontWeight: 'bold', textAlign: 'center' }}>
            ⬅ Quay lại trang đăng nhập
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
