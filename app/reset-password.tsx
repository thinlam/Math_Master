import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, StatusBar,
  Text, TextInput, TouchableOpacity, useColorScheme, View,
} from 'react-native';

import { ResetStaticStyles as S, themedTokens as TT } from '@/components/style/auth/ResetStyles';
import { fetchWithTimeout } from '@/constants/auth/otp'; // đã có sẵn ở màn Forgot
import { ACCOUNT, ENDPOINTS, LOGIN_PATH } from '@/constants/auth/reset';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function ResetPasswordScreen() {
  const { email, account } = useLocalSearchParams<{ email?: string; account?: string }>();
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const T = useMemo(() => TT(isDark), [isDark]);

  const accToUse = (account as string) || ACCOUNT;
  const emailSafe = useMemo(() => {
    try { return decodeURIComponent(String(email || '')).trim().toLowerCase(); }
    catch { return String(email || '').trim().toLowerCase(); }
  }, [email]);

  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // warm-up server tránh cold-start
  useEffect(() => { fetchWithTimeout(ENDPOINTS.HEALTH, {}, 10000).catch(() => {}); }, []);

  const goLogin = () => {
    const href = `${LOGIN_PATH}?reset=1`;
    try { router.replace(href as any); } catch {}
    if (Platform.OS === 'web') setTimeout(() => { window.location.assign(href); }, 50);
  };

  const handleReset = async () => {
    if (!emailSafe) return Alert.alert('Lỗi', 'Không tìm thấy email');
    if (!password || !rePassword) return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự trở lên');
    if (password !== rePassword) return Alert.alert('Lỗi', 'Mật khẩu không trùng khớp');

    try {
      setLoading(true);
      const res = await fetchWithTimeout(
        ENDPOINTS.RESET_PASSWORD,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailSafe, newPassword: password, account: accToUse }),
        },
        45000
      );

      // parse JSON an toàn
      let data: any = {};
      try { data = await res.json(); }
      catch { try { data = { message: await res.text() }; } catch {} }

      if (res.ok && data?.success) {
        if (Platform.OS === 'web') {
          goLogin();
        } else {
          Alert.alert('✅ Thành công', data?.message || 'Mật khẩu đã được cập nhật', [
            { text: 'OK', onPress: goLogin },
          ]);
        }
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
    <LinearGradient colors={[T.grad1, T.grad2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <StatusBar translucent barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="transparent" />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={S.kbd}>
          {/* --- Header --- */}
          <View style={S.headerWrap}>
            <View style={[S.headerBadge, { backgroundColor: T.headerBadgeBg }]}>
              <Text style={{ color: T.primary, fontWeight: '600', letterSpacing: 0.2 }}>
                Math Master • Tài khoản
              </Text>
            </View>

            <Text style={[S.headerTitle, { color: T.txt }]}>Đặt lại mật khẩu</Text>
            <Text style={[S.headerSub, { color: T.sub }]}>
              Nhập mật khẩu mới cho email của bạn để tiếp tục sử dụng.
            </Text>
          </View>

          {/* --- Card --- */}
          <View
            style={[
              S.card,
              {
                backgroundColor: T.card,
                borderColor: T.border,
                shadowColor: T.shadow,
                shadowOpacity: isDark ? 0.25 : 0.15,
              },
            ]}
          >
            {/* Email row */}
            <View
              style={[
                S.emailRow,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(108,99,255,0.06)' },
              ]}
            >
              <FontAwesome5 name="envelope" size={14} color={T.primary} />
              <Text style={[S.emailLabel, { color: T.sub }]}>Email</Text>
              <Text numberOfLines={1} style={[S.emailValue, { color: T.txt }]}>
                {emailSafe || '(không có)'}
              </Text>
            </View>

            {/* New password */}
            <View>
              <Text style={[S.label, { color: T.sub }]}>Mật khẩu mới</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Nhập mật khẩu mới"
                  placeholderTextColor={T.placeholder}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  editable={!loading}
                  style={[
                    S.input,
                    { backgroundColor: T.inputBg, color: T.txt, borderColor: T.border },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={S.eyeBtn}
                >
                  <FontAwesome5 name={showPassword ? 'eye' : 'eye-slash'} size={18} color={T.eye} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Re-enter */}
            <View style={{ marginTop: 6 }}>
              <Text style={[S.label, { color: T.sub }]}>Nhập lại mật khẩu</Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={T.placeholder}
                  secureTextEntry={!showRePassword}
                  value={rePassword}
                  onChangeText={setRePassword}
                  editable={!loading}
                  onSubmitEditing={handleReset}
                  style={[
                    S.input,
                    { backgroundColor: T.inputBg, color: T.txt, borderColor: T.border },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => setShowRePassword(!showRePassword)}
                  disabled={loading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={S.eyeBtn}
                >
                  <FontAwesome5 name={showRePassword ? 'eye' : 'eye-slash'} size={18} color={T.eye} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Hint */}
            <Text style={[S.hint, { color: T.sub }]}>
              Mẹo: dùng ≥ 6 ký tự, nên có chữ hoa, số để bảo mật tốt hơn.
            </Text>

            {/* Button */}
            <TouchableOpacity
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.9}
              style={[S.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
            >
              <LinearGradient
                colors={[T.primary, T.primary2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  S.primaryBtnInner,
                  { shadowColor: T.shadow, shadowOpacity: 0.25 },
                ]}
              >
                <FontAwesome5 name="save" size={16} color="#fff" />
                <Text style={S.primaryTxt}>
                  {loading ? 'ĐANG LƯU…' : 'LƯU MẬT KHẨU'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Footnote */}
            <View style={S.footnoteWrap}>
              <Text style={[S.footnote, { color: T.sub }]}>
                Tài khoản: <Text style={{ fontWeight: '700', color: T.txt }}>{accToUse}</Text>
              </Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
