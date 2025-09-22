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

import { LoginStaticStyles as S, themedTokens } from '@/components/style/auth/LoginStyles';

/** Types */
type AppRole = 'admin' | 'premium' | 'user' | string;
type FieldErrors = { email?: string; pw?: string; form?: string };

/** Helpers */
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

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [darkMode, setDarkMode] = useState(true);
  const [useLogoFallback, setUseLogoFallback] = useState(false);
  const T = useMemo(() => themedTokens(darkMode), [darkMode]);

  const canSubmit = useMemo(() => {
    const noClientErrors = !validateAll({ email, pw }).hasError;
    return email.trim().length > 0 && pw.length > 0 && noClientErrors && !loading;
  }, [email, pw, loading]);

  /** Validation */
  function validateAll(values: { email: string; pw: string }) {
    const next: FieldErrors = {};
    if (!values.email.trim()) next.email = 'Vui lòng nhập email.';
    else if (!isEmail(values.email.trim())) next.email = 'Email không hợp lệ.';
    if (!values.pw) next.pw = 'Vui lòng nhập mật khẩu.';
    else if (values.pw.length < 6) next.pw = 'Mật khẩu tối thiểu 6 ký tự.';
    return { next, hasError: !!(next.email || next.pw) };
  }

  function setField<K extends keyof FieldErrors>(key: K, msg?: string) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

  /** Firestore ensure */
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

  /** Submit */
  const onLogin = async () => {
    setField('form', undefined);
    const { next, hasError } = validateAll({ email, pw });
    setErrors(next);
    if (hasError) return;

    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;
      await ensureUserProfile(user.uid, user.displayName, user.email);

      const uSnap = await getDoc(doc(db, 'users', user.uid));
      const data = uSnap.data() || {};
      const role: AppRole = (data?.role as AppRole) || 'user';
      const level = (data.level as number | null) ?? null;
      const startMode = (data.startMode as string | null) ?? null;

      setErrors({});
      Alert.alert('Thành công', 'Đăng nhập thành công!');
      routeByRole(router, role, { level, startMode });
    } catch (e: any) {
      const mapped = mapAuthErrorToField(e?.code);
      setErrors((prev) => ({ ...prev, ...mapped }));
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () => router.push({ pathname: '/(auth)/ForgotPassword', params: { email } });
  const onLoginWithGoogle = () => Alert.alert('Google', 'Gắn logic đăng nhập Google ở đây.');

  return (
    <LinearGradient colors={T.gradient} style={S.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView style={S.kbd} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
          {/* Toggle */}
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={S.toggle}>
            <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={26} color={T.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={S.header}>
            {useLogoFallback ? (
              <Image source={{ uri: 'https://i.imgur.com/8wPDJ8K.png' }} style={[S.logo, { opacity: darkMode ? 0.95 : 1 }]} />
            ) : (
              <Image
                source={require('../../assets/images/icon_math_resized.png')}
                onError={() => setUseLogoFallback(true)}
                style={[S.logo, { opacity: darkMode ? 0.95 : 1 }]}
              />
            )}
            <Text style={[S.title, { color: T.text }]}>Đăng nhập</Text>
            <Text style={[S.subtitle, { color: T.subText }]}>Rất vui được gặp lại bạn 👋</Text>
          </View>

          {/* Card */}
          <View style={[S.card, { backgroundColor: T.cardBg, borderColor: T.border }]}>
            {errors.form && (
              <View style={[S.errorBox, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: T.errorBorder }]}>
                <Ionicons name="alert-circle-outline" size={18} color={T.errorText} />
                <Text style={[S.errorTxt, { color: T.errorText }]}>{errors.form}</Text>
              </View>
            )}

            {/* Email */}
            <View style={[S.inputRow, { borderColor: errors.email ? T.errorBorder : T.border, backgroundColor: T.inputBg }]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={errors.email ? T.errorText : T.subText} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={T.subText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(v) => setEmail(v)}
                style={[S.input, { color: T.text }]}
              />
              {errors.email && <Ionicons name="alert-circle" size={18} color={T.errorText} />}
            </View>
            {errors.email && <Text style={[S.inputErrorTxt, { color: T.errorText }]}>{errors.email}</Text>}

            {/* Password */}
            <View style={[S.inputRow, { borderColor: errors.pw ? T.errorBorder : T.border, backgroundColor: T.inputBg }]}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={errors.pw ? T.errorText : T.subText} />
              <TextInput
                placeholder="Mật khẩu"
                placeholderTextColor={T.subText}
                value={pw}
                onChangeText={(v) => setPw(v)}
                secureTextEntry={!showPw}
                style={[S.input, { color: T.text }]}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={errors.pw ? T.errorText : T.subText} />
              </TouchableOpacity>
              {errors.pw && <Ionicons name="alert-circle" size={18} color={T.errorText} />}
            </View>
            {errors.pw && <Text style={[S.inputErrorTxt, { color: T.errorText }]}>{errors.pw}</Text>}

            {/* Forgot + Submit */}
            <View style={S.actionRow}>
              <TouchableOpacity onPress={onForgot}>
                <Text style={S.forgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onLogin}
                disabled={!canSubmit}
                style={[S.loginBtn, { backgroundColor: canSubmit ? T.primary : T.primaryDisabled }]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.loginTxt}>Đăng nhập</Text>}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={S.dividerRow}>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
              <Text style={[S.dividerTxt, { color: T.subText }]}>hoặc</Text>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
            </View>

            {/* Google */}
            <TouchableOpacity onPress={onLoginWithGoogle} style={[S.socialBtn, { backgroundColor: T.socialBg, borderColor: T.border }]}>
              <Image source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} style={S.googleIcon} />
              <Text style={{ color: T.text, fontWeight: '600' }}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={S.footer}>
            <Text style={{ color: T.subText }}>
              Chưa có tài khoản?{' '}
              <Text style={[{ color: '#93c5fd' }, S.footerLink]} onPress={() => router.push('/(auth)/register')}>
                Đăng ký
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
