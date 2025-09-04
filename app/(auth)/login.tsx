// app/(auth)/LoginScreen.tsx
import { auth, db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  signInWithEmailAndPassword
} from 'firebase/auth';
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

/** -------------------------------------------------------
 *  Helper: điều hướng theo role (giống EFB)
 *  -------------------------------------------------------
 */
type AppRole = 'admin' | 'premium' | 'user' | string;

function routeByRole(
  router: ReturnType<typeof useRouter>,
  role?: AppRole,
  opts?: { startMode?: string | null; level?: number | null }
) {
  const r = role ?? 'user';
  if (r === 'admin') return router.replace('/(admin)/home');
  if (r === 'premium') return router.replace('/(tabs)');

  // user: đã setup thì vào tabs, chưa thì vào onboarding
  if (opts?.startMode || opts?.level !== null) {
    return router.replace('/(tabs)');
  }
  return router.replace('/(tabs)');
}

export default function LoginScreen() {
  const router = useRouter();

  // form
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // theme
  const [darkMode, setDarkMode] = useState(true);
  const [useLogoFallback, setUseLogoFallback] = useState(false);

  const canSubmit = useMemo(
    () => /\S+@\S+\.\S+/.test(email) && pw.length >= 1 && !loading,
    [email, pw, loading]
  );

  /** -------------------------------------------------------
   *  Đảm bảo hồ sơ users/{uid} tồn tại
   *  - Mặc định role='user'
   *  - Bạn có thể mở rộng thêm level/startMode nếu muốn
   *  -------------------------------------------------------
   */
  const ensureUserProfile = async (
    uid: string,
    name?: string | null,
    mail?: string | null
  ) => {
    const uRef = doc(db, 'users', uid);
    const snap = await getDoc(uRef);

    if (!snap.exists()) {
      await setDoc(uRef, {
        uid,
        name: name ?? '',
        email: mail ?? '',
        role: 'user',                 // mặc định user
        level: null,                  // tạm null để dẫn qua onboarding lần đầu
        startMode: null,              // tạm null để dẫn qua onboarding lần đầu
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // cập nhật mốc đăng nhập gần nhất
      await setDoc(
        uRef,
        { updatedAt: serverTimestamp() },
        { merge: true }
      );
    }
  };

  /** -------------------------------------------------------
   *  Đăng nhập Email/Password
   *  - Lấy role/level/startMode để điều hướng
   *  -------------------------------------------------------
   */
  const onLogin = async () => {
    if (!canSubmit) {
      Alert.alert('Thiếu/Chưa hợp lệ', 'Vui lòng nhập email và mật khẩu hợp lệ.');
      return;
    }
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;

      // Đảm bảo có hồ sơ & giá trị mặc định
      await ensureUserProfile(user.uid, user.displayName, user.email);

      // Đọc lại hồ sơ để lấy role/level/startMode mới nhất
      const uSnap = await getDoc(doc(db, 'users', user.uid));
      if (!uSnap.exists()) {
        Alert.alert('Lỗi', 'Không tìm thấy dữ liệu người dùng.');
        return;
      }
      const data = uSnap.data() || {};
      const role: AppRole = (data.role as AppRole) || 'user';
      const level = (data.level as number | null) ?? null;
      const startMode = (data.startMode as string | null) ?? null;

      Alert.alert('Thành công', 'Đăng nhập thành công!');
      routeByRole(router, role, { level, startMode });
    } catch (e: any) {
      Alert.alert('Đăng nhập lỗi', e?.code ? mapAuthError(e.code) : (e?.message ?? 'Không rõ nguyên nhân'));
    } finally {
      setLoading(false);
    }
  };

  /** -------------------------------------------------------
   *  Quên mật khẩu
   *  -------------------------------------------------------
   */
  const onForgot = () => {
  // Điều hướng sang trang ForgotPassword, truyền sẵn email nếu đã nhập
  router.push({ pathname: '/(auth)/ForgotPassword', params: { email } });
};

  /** -------------------------------------------------------
   *  (Tuỳ chọn) Đăng nhập Google sau này
   *  - Sau khi lấy được cred, nhớ: ensureUserProfile -> đọc users -> routeByRole
   *  -------------------------------------------------------
   */
  const onLoginWithGoogle = async () => {
    Alert.alert('Google', 'Gắn logic đăng nhập Google ở đây (expo-auth-session).');
    // ví dụ:
    // const { type, params } = await promptAsync();
    // if (type === 'success' && params?.id_token) {
    //   const credential = GoogleAuthProvider.credential(params.id_token);
    //   const cred = await signInWithCredential(auth, credential);
    //   const u = cred.user;
    //   await ensureUserProfile(u.uid, u.displayName, u.email);
    //   const uSnap = await getDoc(doc(db, 'users', u.uid));
    //   const data = uSnap.data() || {};
    //   routeByRole(router, data.role, { level: data.level ?? null, startMode: data.startMode ?? null });
    // }
  };

  // màu theo theme
  const colors = darkMode ? ['#0f172a', '#111827', '#1f2937'] : ['#f3f4f6', '#e5e7eb', '#f3f4f6'];
  const textColor = darkMode ? '#fff' : '#111';
  const subText = darkMode ? '#cbd5e1' : '#374151';
  const cardBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const inputBg = darkMode ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.85)';

  return (
    <LinearGradient colors={colors} style={{ flex: 1 }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 20, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Toggle sáng/tối */}
          <TouchableOpacity
            onPress={() => setDarkMode(!darkMode)}
            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }}
          >
            <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={26} color={textColor} />
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={{ alignItems: 'center', marginBottom: 18 }}>
            {useLogoFallback ? (
              <Image
                source={{ uri: 'https://i.imgur.com/8wPDJ8K.png' }}
                style={{ width: 72, height: 72, borderRadius: 16, opacity: darkMode ? 0.95 : 1 }}
              />
            ) : (
              <Image
                source={require('../../assets/images/icon_math_resized.png')}
                onError={() => setUseLogoFallback(true)}
                style={{ width: 72, height: 120, borderRadius: 16, opacity: darkMode ? 0.95 : 1 }}
              />
            )}

            <Text style={{ color: textColor, fontSize: 26, fontWeight: '800', marginTop: 12 }}>
              Đăng nhập
            </Text>
            <Text style={{ color: subText, marginTop: 4, fontSize: 14 }}>
              Rất vui được gặp lại bạn 👋
            </Text>
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
            {/* Email */}
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: borderColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: inputBg,
              }}
            >
              <MaterialCommunityIcons name="email-outline" size={18} color={subText} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={subText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={{ color: textColor, flex: 1, paddingVertical: 10 }}
              />
            </View>

            {/* Password */}
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: borderColor,
                paddingHorizontal: 12,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                backgroundColor: inputBg,
              }}
            >
              <MaterialCommunityIcons name="lock-outline" size={18} color={subText} />
              <TextInput
                placeholder="Mật khẩu"
                placeholderTextColor={subText}
                value={pw}
                onChangeText={setPw}
                secureTextEntry={!showPw}
                style={{ color: textColor, flex: 1, paddingVertical: 10 }}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={subText} />
              </TouchableOpacity>
            </View>

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
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Đăng nhập</Text>
                )}
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
              <Image
                source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                style={{ width: 18, height: 18 }}
              />
              <Text style={{ color: textColor, fontWeight: '600' }}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>

          {/* footer */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: subText }}>
              Chưa có tài khoản?{' '}
              <Text
                style={{ color: '#93c5fd', fontWeight: '700' }}
                onPress={() => router.push('/(auth)/register')}
              >
                Đăng ký
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

/** Map mã lỗi Firebase Auth -> thông điệp tiếng Việt gọn gàng */
function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Email không hợp lệ.';
    case 'auth/user-not-found':
      return 'Tài khoản không tồn tại.';
    case 'auth/wrong-password':
      return 'Sai mật khẩu.';
    case 'auth/too-many-requests':
      return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
    case 'auth/user-disabled':
      return 'Tài khoản đã bị vô hiệu hoá.';
    default:
      return 'Đăng nhập thất bại.';
  }
}
