import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
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

// Thời gian cooldown mặc định (giây) nếu server không trả về thời gian còn lại
const COOLDOWN_SECONDS = 60;

// App nào đang dùng server OTP
const ACCOUNT = (process.env.EXPO_PUBLIC_ACCOUNT || 'mathmaster').toLowerCase();

// API base (đặt trong .env cho production)
const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://otp-server21-production.up.railway.app';

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

// Chuẩn hoá thông điệp để nhận biết “đã gửi OTP rồi”
function isAlreadySentMessage(msg?: string) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('otp đã được gửi') ||
    m.includes('already sent') ||
    m.includes('otp already sent')
  );
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

  const titleText = useMemo(
    () => 'Nhập Gmail để nhận mã OTP',
    []
  );

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

  const startCooldown = (seconds?: number) => {
    const total = typeof seconds === 'number' && seconds > 0 ? seconds : COOLDOWN_SECONDS;
    setCooldown(total);
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
          body: JSON.stringify({ email: email.trim(), account: ACCOUNT }),
        },
        15000
      );

      const data: any = await res.json().catch(() => ({}));

      // TH1: Thành công bình thường
      if (res.ok && data?.success) {
        setSentOtp(true);
        startCooldown(
          // backend có thể trả về thời gian cooldown còn lại
          typeof data?.cooldownRemaining === 'number' ? data.cooldownRemaining : undefined
        );
        setDevOtp(typeof data.otp === 'string' ? data.otp : null);
        Alert.alert('Thành công', 'OTP đã được gửi đến Gmail của bạn.');
        return;
      }

      // TH2: Server báo đã gửi trước đó nhưng còn hiệu lực -> coi như thành công
      if (
        res.status === 409 ||
        res.status === 208 ||
        isAlreadySentMessage(data?.message)
      ) {
        setSentOtp(true);
        startCooldown(
          typeof data?.cooldownRemaining === 'number' ? data.cooldownRemaining : undefined
        );
        setDevOtp(typeof data.otp === 'string' ? data.otp : null);

        Alert.alert(
          'Thông báo',
          'Bạn đã yêu cầu OTP trước đó và mã vẫn còn hiệu lực. Vui lòng kiểm tra hộp thư và nhập mã OTP.'
        );
        return;
      }

      // TH3: Rate limit / spam
      if (res.status === 429) {
        Alert.alert(
          'Quá nhanh',
          'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.'
        );
        return;
      }

      // TH4: Lỗi khác
      Alert.alert('Lỗi', data?.message || 'Không gửi được OTP, vui lòng thử lại.');
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      console.error('Lỗi gửi OTP:', err);
      Alert.alert(
        'Lỗi',
        aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     4) XÁC THỰC OTP
     ===================== */
  const verifyOtp = async () => {
    if (!sentOtp) return Alert.alert('Lỗi', 'Vui lòng gửi mã OTP trước.');
    if (!otp || otp.length < OTP_LENGTH)
      return Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} ký tự OTP.`);

    try {
      setLoading(true);
      Keyboard.dismiss();

      const res = await fetchWithTimeout(
        ENDPOINTS.VERIFY_OTP,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), otp, account: ACCOUNT }),
        },
        15000
      );

      const data: any = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        router.push({ pathname: '/reset-password', params: { email } });
      } else {
        Alert.alert('Sai mã', data?.message || 'OTP không đúng hoặc đã hết hạn.');
      }
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      console.error('Lỗi verify OTP:', err);
      Alert.alert(
        'Lỗi',
        aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     5) UI
     ===================== */
  const canSubmit = !loading;
  const canResend = sentOtp && !loading && cooldown === 0;

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
          returnKeyType={sentOtp ? 'next' : 'send'}
          onSubmitEditing={() => {
            if (!sentOtp) sendOtp();
          }}
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
              returnKeyType="done"
              onSubmitEditing={verifyOtp}
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
          disabled={!canSubmit}
          style={{
            backgroundColor: '#7C3AED',
            paddingVertical: 14,
            borderRadius: 10,
            opacity: !canSubmit ? 0.7 : 1,
            marginBottom: 10,
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
            {loading ? (sentOtp ? 'ĐANG XÁC NHẬN...' : 'ĐANG GỬI...') : sentOtp ? 'XÁC NHẬN OTP' : 'GỬI MÃ (MATH MASTER)'}
          </Text>
        </TouchableOpacity>

        {sentOtp && (
          <TouchableOpacity onPress={sendOtp} disabled={!canResend} style={{ marginBottom: 16 }}>
            <Text
              style={{
                textAlign: 'center',
                color: canResend ? '#A78BFA' : '#6B7280',
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
