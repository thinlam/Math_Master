// app/(auth)/LoginScreen.tsx
import { auth, db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  sendPasswordResetEmail,
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

  const ensureUserProfile = async (uid: string, name?: string | null, mail?: string | null) => {
    const uRef = doc(db, 'users', uid);
    const snap = await getDoc(uRef);
    if (!snap.exists()) {
      await setDoc(uRef, {
        uid,
        name: name ?? '',
        email: mail ?? '',
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // có thể cập nhật updatedAt khi login
      await setDoc(
        uRef,
        { updatedAt: serverTimestamp() },
        { merge: true }
      );
    }
  };

  const onLogin = async () => {
    if (!canSubmit) {
      Alert.alert('Thiếu/Chưa hợp lệ', 'Vui lòng nhập email và mật khẩu hợp lệ.');
      return;
    }
    try {
      setLoading(true);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;
      await ensureUserProfile(user.uid, user.displayName, user.email);
      Alert.alert('Thành công', 'Đăng nhập thành công!');
      router.replace('/(tabs)'); // đổi route home theo app của bạn
    } catch (e: any) {
      Alert.alert('Đăng nhập lỗi', e?.message ?? 'Không rõ nguyên nhân');
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Email chưa hợp lệ', 'Nhập email để nhận liên kết đặt lại mật khẩu.');
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Đã gửi', 'Hãy kiểm tra hộp thư để đặt lại mật khẩu.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không gửi được email đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  // (Tuỳ chọn) nếu sau này bạn gắn Google OAuth với expo-auth-session
  const onLoginWithGoogle = async () => {
    Alert.alert('Google', 'Gắn logic đăng nhập Google ở đây (expo-auth-session).');
    // ví dụ:
    // const { type, params } = await promptAsync();
    // if (type === 'success' && params?.id_token) {
    //   const credential = GoogleAuthProvider.credential(params.id_token);
    //   const cred = await signInWithCredential(auth, credential);
    //   await ensureUserProfile(cred.user.uid, cred.user.displayName, cred.user.email);
    //   router.replace('/');
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
                source={require('../../assets/images/math-logo.png')}
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
