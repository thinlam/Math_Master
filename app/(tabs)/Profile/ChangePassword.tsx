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

import { ForgotStaticStyles as S, themedTokens as TT } from '@/components/style/auth/ForgotStyles';
import {
    ACCOUNT,
    COOLDOWN_SECONDS,
    ENDPOINTS,
    OTP_LENGTH,
    fetchWithTimeout,
    isAlreadySentMessage,
    isEmail
} from '@/constants/auth/otp';

export default function ForgotPasswordScreen() {
  const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [sentOtp, setSentOtp] = useState(false);
  const [loading, setLoading] = useState(false);

  // Dev helper: show OTP nếu server trả (chỉ khi DEV)
  const [devOtp, setDevOtp] = useState<string | null>(null);

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const titleText = useMemo(() => 'Nhập Gmail để nhận mã OTP', []);

  // theme tokens (giữ dark true như UI cũ)
  const T = useMemo(() => TT(true), []);

  // Nhận sẵn email từ param
  useEffect(() => {
    if (typeof emailParam === 'string' && emailParam.trim()) {
      try {
        setEmail(decodeURIComponent(emailParam));
      } catch {
        setEmail(emailParam);
      }
    }
  }, [emailParam]);

  // Cleanup interval
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
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  /* ============== SEND OTP ============== */
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

      if (res.ok && data?.success) {
        setSentOtp(true);
        startCooldown(typeof data?.cooldownRemaining === 'number' ? data.cooldownRemaining : undefined);
        setDevOtp(typeof data?.otp === 'string' ? data.otp : null);
        Alert.alert('Thành công', 'OTP đã được gửi đến Gmail của bạn.');
        return;
      }

      if (res.status === 409 || res.status === 208 || isAlreadySentMessage(data?.message)) {
        setSentOtp(true);
        startCooldown(typeof data?.cooldownRemaining === 'number' ? data.cooldownRemaining : undefined);
        setDevOtp(typeof data?.otp === 'string' ? data.otp : null);
        Alert.alert('Thông báo', 'Bạn đã yêu cầu OTP trước đó và mã vẫn còn hiệu lực. Vui lòng kiểm tra hộp thư và nhập mã OTP.');
        return;
      }

      if (res.status === 429) {
        Alert.alert('Quá nhanh', 'Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.');
        return;
      }

      Alert.alert('Lỗi', data?.message || 'Không gửi được OTP, vui lòng thử lại.');
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      console.error('Lỗi gửi OTP:', err);
      Alert.alert('Lỗi', aborted ? 'Hết thời gian chờ, vui lòng thử lại.' : 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  /* ============== VERIFY OTP ============== */
  const verifyOtp = async () => {
    if (!sentOtp) return Alert.alert('Lỗi', 'Vui lòng gửi mã OTP trước.');
    if (!otp || otp.length < OTP_LENGTH) return Alert.alert('Lỗi', `Vui lòng nhập đủ ${OTP_LENGTH} ký tự OTP.`);

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
        router.push({ pathname: '/(tabs)/Profile/reset-password', params: { email } });
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

  /* ============== UI ============== */
  const canSubmit = !loading;
  const canResend = sentOtp && !loading && cooldown === 0;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[S.root, { backgroundColor: T.bg }]}
    >
      <View style={S.center}>
        <Text style={[S.title, { color: T.text }]}>{titleText}</Text>

        <TextInput
          placeholder="example@gmail.com"
          value={email}
          onChangeText={(t) => setEmail(t.trim())}
          keyboardType="email-address"
          placeholderTextColor={T.subText}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          returnKeyType={sentOtp ? 'next' : 'send'}
          onSubmitEditing={() => !sentOtp && sendOtp()}
          style={[
            S.input,
            {
              backgroundColor: T.inputBg,
              color: T.inputText,
              borderColor: T.inputBorder,
            },
          ]}
        />

        <Text style={[S.hint, { color: T.subText }]}>
          Nhập email đã đăng ký Math Master để nhận mã OTP.
        </Text>

        {sentOtp && (
          <>
            <Text style={[{ fontSize: 16, fontWeight: '600', marginBottom: 8 }, { color: T.text }]}>
              📩 Nhập mã OTP vừa nhận
            </Text>

            <TextInput
              placeholder={`Nhập ${OTP_LENGTH} số OTP`}
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
              keyboardType="number-pad"
              placeholderTextColor={T.subText}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={OTP_LENGTH}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={verifyOtp}
              style={[
                S.otpInput,
                {
                  backgroundColor: T.inputBg,
                  color: T.inputText,
                  borderColor: T.inputBorder,
                },
              ]}
            />

            {devOtp && (
              <Text style={[S.devOtp, { color: T.devOtp }]}>
                (DEV) OTP server: {devOtp}
              </Text>
            )}
          </>
        )}

        <TouchableOpacity
          onPress={sentOtp ? verifyOtp : sendOtp}
          disabled={!canSubmit}
          style={[
            S.primaryBtn,
            { backgroundColor: canSubmit ? T.primary : T.primaryDisabled },
          ]}
        >
          <Text style={S.primaryTxt}>
            {loading
              ? sentOtp
                ? 'ĐANG XÁC NHẬN...'
                : 'ĐANG GỬI...'
              : sentOtp
              ? 'XÁC NHẬN OTP'
              : 'GỬI MÃ (MATH MASTER)'}
          </Text>
        </TouchableOpacity>

        {sentOtp && (
          <TouchableOpacity onPress={sendOtp} disabled={!canResend} style={S.resendBtn}>
            <Text
              style={[
                S.resendTxt,
                { color: canResend ? T.accent : T.accentDisabled },
              ]}
            >
              {cooldown > 0 ? `Gửi lại OTP sau ${cooldown}s` : 'Gửi lại OTP (Math Master)'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.replace('/(tabs)/Profile')}>
          <Text style={[S.backTxt, { color: T.accent }]}>⬅ Quay lại trang cá nhân</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
