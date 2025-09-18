// app/(auth)/LoginScreen.tsx
import { auth, db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/** ------------------ Types ------------------ */
type AppRole = 'admin' | 'premium' | 'user' | string;
type FieldErrors = { email?: string; pw?: string; form?: string };

/** ------------------ Helpers ------------------ */
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s.trim());

function routeByRole(
  router: ReturnType<typeof useRouter>,
  role?: AppRole,
  opts?: { startMode?: string | null; level?: number | null }
) {
  const r = role ?? 'user';
  if (r === 'admin') return router.replace('/(admin)/home');
  if (r === 'premium') return router.replace('/(tabs)');
  if (opts?.startMode || opts?.level !== null) return router.replace('/(tabs)');
  return router.replace('/(tabs)');
}

/** Map mã lỗi Firebase Auth -> thông điệp + field gắn lỗi */
function mapAuthErrorToField(code?: string): FieldErrors {
  switch (code) {
    case 'auth/invalid-email':
      return { email: 'Email không hợp lệ.' };
    case 'auth/user-not-found':
      return { email: 'Không tìm thấy tài khoản với email này.' };
    case 'auth/wrong-password':
      return { pw: 'Mật khẩu không đúng.' };
    case 'auth/too-many-requests':
      return { form: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' };
    case 'auth/user-disabled':
      return { form: 'Tài khoản đã bị vô hiệu hoá.' };
    default:
      return { form: 'Đăng nhập thất bại. Vui lòng thử lại.' };
  }
}

export default function LoginScreen() {
  const router = useRouter();

  // form
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // errors
  const [errors, setErrors] = useState<FieldErrors>({});

  // theme
  const [darkMode, setDarkMode] = useState(true);
  const [useLogoFallback, setUseLogoFallback] = useState(false);

  // computed
  const canSubmit = useMemo(() => {
    const noClientErrors = !validateAll({ email, pw }).hasError;
    return email.trim().length > 0 && pw.length > 0 && noClientErrors && !loading;
  }, [email, pw, loading]);

  /** ------------------ Validation ------------------ */
  function validateAll(values: { email: string; pw: string }) {
    const next: FieldErrors = {};
    const e = values.email.trim();
    const p = values.pw;

    if (!e) next.email = 'Vui lòng nhập email.';
    else if (!isEmail(e)) next.email = 'Email không hợp lệ.';

    if (!p) next.pw = 'Vui lòng nhập mật khẩu.';
    else if (p.length < 6) next.pw = 'Mật khẩu tối thiểu 6 ký tự.';

    return { next, hasError: !!(next.email || next.pw) };
  }

  function setField<K extends keyof FieldErrors>(key: K, msg?: string) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

  /** ------------------ Firestore profile ensure ------------------ */
  const ensureUserProfile = async (uid: string, name?: string | null, mail?: string | null) => {
    const uRef = doc(db, 'users', uid);
    const snap = await getDoc(uRef);

    if (!snap.exists()) {
      await setDoc(uRef, {
        uid,
        name: name ?? '',
        email: mail ?? '',
        role: 'user',
        level: null,
        startMode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(uRef, { updatedAt: serverTimestamp() }, { merge: true });
    }
  };

  /** ------------------ Submit ------------------ */
  const onLogin = async () => {
    // clear thông báo tổng quát trước mỗi lần submit
    setField('form', undefined);

    // validate client-side
    const { next, hasError } = validateAll({ email, pw });
    setErrors(next);
    if (hasError) return;

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;

      await ensureUserProfile(user.uid, user.displayName, user.email);

      const uSnap = await getDoc(doc(db, 'users', user.uid));
      if (!uSnap.exists()) {
        setField('form', 'Không tìm thấy dữ liệu người dùng.');
        return;
      }
      const data = uSnap.data() || {};
      const role: AppRole = (data.role as AppRole) || 'user';
      const level = (data.level as number | null) ?? null;
      const startMode = (data.startMode as string | null) ?? null;

      // Xoá lỗi cũ nếu có
      setErrors({});
      Alert.alert('Thành công', 'Đăng nhập thành công!');
      routeByRole(router, role, { level, startMode });
    } catch (e: any) {
      const mapped = mapAuthErrorToField(e?.code);
      setErrors((prev) => ({ ...prev, ...mapped }));
      // tuỳ chọn: vẫn popup nếu muốn
      // Alert.alert('Đăng nhập lỗi', mapped.email || mapped.pw || mapped.form || 'Có lỗi xảy ra.');
    } finally {
      setLoading(false);
    }
  };

  /** ------------------ Forgot ------------------ */
  const onForgot = () => {
    router.push({ pathname: '/(auth)/ForgotPassword', params: { email } });
  };

  /** ------------------ Google (placeholder) ------------------ */
  const onLoginWithGoogle = async () => {
    Alert.alert('Google', 'Gắn logic đăng nhập Google ở đây (expo-auth-session).');
  };

  // theme colors
  const colors = darkMode ? ['#0f172a', '#111827', '#1f2937'] : ['#f3f4f6', '#e5e7eb', '#f3f4f6'];
  const textColor = darkMode ? '#fff' : '#111';
  const subText = darkMode ? '#cbd5e1' : '#374151';
  const cardBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const inputBg = darkMode ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.85)';

  // màu viền khi lỗi
  const errorBorder = darkMode ? 'rgba(239,68,68,0.9)' : 'rgba(220,38,38,0.9)';
  const errorText = darkMode ? '#fca5a5' : '#dc2626';

  return (
    <LinearGradient colors={colors} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          {/* Toggle sáng/tối */}
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}>
            <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={26} color={textColor} />
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            {useLogoFallback ? (
              <Image source={{ uri: 'https://i.imgur.com/8wPDJ8K.png' }} style={{ width: 72, height: 72, borderRadius: 16, opacity: darkMode ? 0.95 : 1 }} />
            ) : (
              <Image
                source={require('../../assets/images/icon_math_resized.png')}
                onError={() => setUseLogoFallback(true)}
                style={{ width: 72, height: 120, borderRadius: 16, opacity: darkMode ? 0.95 : 1 }}
              />
            )}

            <Text style={{ color: textColor, fontSize: 26, fontWeight: '800', marginTop: 12 }}>Đăng nhập</Text>
            <Text style={{ color: subText, marginTop: 4, fontSize: 14 }}>Rất vui được gặp lại bạn 👋</Text>
          </View>

          {/* Card */}
          <View
            style={{
              backgroundColor: cardBg,
              borderWidth: 1,
              borderColor: borderColor,
              borderRadius: 18,
              padding: 16,
              gap: 12,
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            {/* Thông báo tổng quát (nếu có) */}
            {errors.form ? (
              <View
                style={{
                  backgroundColor: darkMode ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                  borderColor: errorBorder,
                  borderWidth: 1,
                  padding: 10,
                  borderRadius: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="alert-circle-outline" size={18} color={errorText} />
                <Text style={{ color: errorText, flex: 1 }}>{errors.form}</Text>
              </View>
            ) : null}

            {/* Email */}
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.email ? errorBorder : borderColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: inputBg,
              }}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color={errors.email ? errorText : subText} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={subText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  // validate khi gõ
                  const trimmed = v.trim();
                  if (!trimmed) setField('email', 'Vui lòng nhập email.');
                  else if (!isEmail(trimmed)) setField('email', 'Email không hợp lệ.');
                  else setField('email', undefined);
                }}
                onBlur={() => {
                  const trimmed = email.trim();
                  if (!trimmed) setField('email', 'Vui lòng nhập email.');
                  else if (!isEmail(trimmed)) setField('email', 'Email không hợp lệ.');
                }}
                style={{ color: textColor, flex: 1, paddingVertical: 10 }}
              />
              {errors.email ? <Ionicons name="alert-circle" size={18} color={errorText} /> : null}
            </View>
            {errors.email ? <Text style={{ color: errorText, fontSize: 12, marginTop: -6 }}>{errors.email}</Text> : null}

            {/* Password */}
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: errors.pw ? errorBorder : borderColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: inputBg,
              }}
            >
              <MaterialCommunityIcons name="lock-outline" size={18} color={errors.pw ? errorText : subText} />
              <TextInput
                placeholder="Mật khẩu"
                placeholderTextColor={subText}
                value={pw}
                onChangeText={(v) => {
                  setPw(v);
                  if (!v) setField('pw', 'Vui lòng nhập mật khẩu.');
                  else if (v.length < 6) setField('pw', 'Mật khẩu tối thiểu 6 ký tự.');
                  else setField('pw', undefined);
                }}
                onBlur={() => {
                  if (!pw) setField('pw', 'Vui lòng nhập mật khẩu.');
                  else if (pw.length < 6) setField('pw', 'Mật khẩu tối thiểu 6 ký tự.');
                }}
                secureTextEntry={!showPw}
                style={{ color: textColor, flex: 1, paddingVertical: 10 }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={errors.pw ? errorText : subText} />
              </TouchableOpacity>
              {errors.pw ? <Ionicons name="alert-circle" size={18} color={errorText} /> : null}
            </View>
            {errors.pw ? <Text style={{ color: errorText, fontSize: 12, marginTop: -6 }}>{errors.pw}</Text> : null}

            {/* Forgot + Submit */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={onForgot}>
                <Text style={{ color: '#93c5fd', fontWeight: '600' }}>Quên mật khẩu?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onLogin}
                disabled={!canSubmit}
                style={{
                  backgroundColor: canSubmit ? '#3b82f6' : 'rgba(59,130,246,0.35)',
                  paddingVertical: 12,
                  paddingHorizontal: 18,
                  borderRadius: 12,
                }}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Đăng nhập</Text>}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.25)' }} />
              <Text style={{ color: subText, fontSize: 12 }}>hoặc</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.25)' }} />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={onLoginWithGoogle}
              style={{
                backgroundColor: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: borderColor,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Image source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} style={{ width: 18, height: 18 }} />
              <Text style={{ color: textColor, fontWeight: '600' }}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>

          {/* footer */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: subText }}>
              Chưa có tài khoản?{' '}
              <Text style={{ color: '#93c5fd', fontWeight: '700' }} onPress={() => router.push('/(auth)/register')}>
                Đăng ký
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
