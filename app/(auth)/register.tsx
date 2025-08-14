// app/(auth)/SignUpScreen.tsx
import { auth, db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
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

export default function SignUpScreen() {
  const router = useRouter();

  // form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [loading, setLoading] = useState(false);

  // theme toggle
  const [darkMode, setDarkMode] = useState(true);

  // logo fallback: nếu ảnh local lỗi -> dùng URL online
  const [useLogoFallback, setUseLogoFallback] = useState(false);

  // đánh giá độ mạnh mật khẩu
  const pwScore = useMemo(() => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return Math.min(s, 4); // 0..4
  }, [pw]);
  const pwLabel = ['Rất yếu', 'Yếu', 'Khá', 'Mạnh', 'Rất mạnh'][pwScore];

  const canSubmit =
    name.trim().length >= 2 &&
    /\S+@\S+\.\S+/.test(email) &&
    pw.length >= 8 &&
    agree &&
    !loading;

  const onSignUp = async () => {
    if (!canSubmit) {
      Alert.alert('Thiếu/Chưa hợp lệ', 'Vui lòng kiểm tra lại các trường và đồng ý điều khoản.');
      return;
    }
    try {
      setLoading(true);
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);
      const user = cred.user;

      await updateProfile(user, { displayName: name.trim() });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name.trim(),
        email: user.email,
        role: 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Thành công', 'Tạo tài khoản thành công!');
      router.replace('/'); // đổi về route home của bạn
    } catch (e: any) {
      Alert.alert('Đăng ký lỗi', e?.message ?? 'Không rõ nguyên nhân');
    } finally {
      setLoading(false);
    }
  };

  // màu theo theme
  const colors = darkMode ? ['#0f172a', '#111827', '#1f2937'] : ['#f3f4f6', '#e5e7eb', '#f3f4f6'];
  const textColor = darkMode ? '#fff' : '#111';
  const subText = darkMode ? '#cbd5e1' : '#374151';
  const cardBg = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const borderColor = darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
  const inputBg = darkMode ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.85)';
  const barBg = darkMode ? '#1f2937' : '#d1d5db';

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
                // CHÚ Ý: nếu file này nằm trong app/(auth)/ hãy để ../../assets/...
                source={require('../../assets/images/math-logo.png')}
                onError={() => setUseLogoFallback(true)}
                style={{ width: 72, height: 120, borderRadius: 16, opacity: darkMode ? 0.95 : 1 }}
              />
            )}

            <Text style={{ color: textColor, fontSize: 26, fontWeight: '800', marginTop: 12 }}>
              Tạo tài khoản
            </Text>
            <Text style={{ color: subText, marginTop: 4, fontSize: 14 }}>
              {'\t'}Chào mừng đến với bậc thầy toán học!
              {'\n'}Vui lòng điền thông tin bên dưới để đăng ký.
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
            {/* Họ tên */}
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
              <Ionicons name="person-outline" size={18} color={subText} />
              <TextInput
                placeholder="Họ và tên"
                placeholderTextColor={subText}
                value={name}
                onChangeText={setName}
                style={{ color: textColor, flex: 1, paddingVertical: 10 }}
              />
            </View>

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

            {/* Mật khẩu */}
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
                placeholder="Mật khẩu (≥ 8 ký tự)"
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

            {/* Strength bar */}
            <View style={{ marginTop: 4 }}>
              <View style={{ height: 6, borderRadius: 10, backgroundColor: barBg, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${(pwScore / 4) * 100}%`,
                    height: '100%',
                    backgroundColor: pwScore <= 1 ? '#ef4444' : pwScore === 2 ? '#f59e0b' : '#22c55e',
                  }}
                />
              </View>
              <Text style={{ color: subText, marginTop: 6, fontSize: 12 }}>Độ mạnh: {pwLabel}</Text>
            </View>

            {/* Terms */}
            <TouchableOpacity
              onPress={() => setAgree(!agree)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}
            >
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={20} color={agree ? '#60a5fa' : subText} />
              <Text style={{ color: subText }}>
                Tôi đồng ý với <Text style={{ textDecorationLine: 'underline' }}>Điều khoản</Text> &{' '}
                <Text style={{ textDecorationLine: 'underline' }}>Bảo mật</Text>
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              onPress={onSignUp}
              disabled={!canSubmit}
              style={{
                marginTop: 8,
                backgroundColor: canSubmit ? '#3b82f6' : 'rgba(59,130,246,0.35)',
                paddingVertical: 14,
                borderRadius: 14,
                alignItems: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Tạo tài khoản</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.25)' }} />
              <Text style={{ color: subText, fontSize: 12 }}>hoặc</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(148,163,184,0.25)' }} />
            </View>

            {/* Google (tuỳ chọn: gắn logic đăng nhập Google nếu dùng) */}
            <TouchableOpacity
              onPress={() => Alert.alert('Google', 'Gắn hàm đăng nhập Google tại đây')}
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
              <Text style={{ color: textColor, fontWeight: '600' }}>Đăng ký với Google</Text>
            </TouchableOpacity>
          </View>

          {/* footer */}
          <View style={{ alignItems: 'center', marginTop: 16 }}>
            <Text style={{ color: subText }}>
              Đã có tài khoản?{' '}
              <Text style={{ color: '#93c5fd', fontWeight: '700' }} onPress={() => router.push('/(auth)/login')}>
                Đăng nhập
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
