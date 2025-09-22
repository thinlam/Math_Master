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

// ✅ styles
import { SignUpStaticStyles as S, themedTokens } from '@/components/style/auth/SignUpStyles';

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
  const T = useMemo(() => themedTokens(darkMode), [darkMode]);

  // logo fallback
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
      router.replace('/');
    } catch (e: any) {
      Alert.alert('Đăng ký lỗi', e?.message ?? 'Không rõ nguyên nhân');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={T.gradient} style={S.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView style={S.kbd} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
          {/* Toggle sáng/tối */}
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={S.toggle}>
            <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={26} color={T.text} />
          </TouchableOpacity>

          {/* Logo + Title */}
          <View style={S.header}>
            {useLogoFallback ? (
              <Image source={{ uri: 'https://i.imgur.com/8wPDJ8K.png' }} style={[S.logo, { opacity: darkMode ? 0.95 : 1 }]} />
            ) : (
              <Image
                // CHÚ Ý: nếu file này nằm trong app/(auth)/ hãy để ../../assets/...
                source={require('../../assets/images/icon_math_resized.png')}
                onError={() => setUseLogoFallback(true)}
                style={[S.logo, { opacity: darkMode ? 0.95 : 1 }]}
              />
            )}

            <Text style={[S.title, { color: T.text }]}>Tạo tài khoản</Text>
            <Text style={[S.subtitle, { color: T.subText }]}>
              {'\t'}Chào mừng đến với bậc thầy toán học!
              {'\n'}Vui lòng điền thông tin bên dưới để đăng ký.
            </Text>
          </View>

          {/* Card */}
          <View style={[S.card, { backgroundColor: T.cardBg, borderColor: T.border }]}>
            {/* Họ tên */}
            <View style={[S.inputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <Ionicons name="person-outline" size={18} color={T.subText} />
              <TextInput
                placeholder="Họ và tên"
                placeholderTextColor={T.subText}
                value={name}
                onChangeText={setName}
                style={[S.input, { color: T.text }]}
              />
            </View>

            {/* Email */}
            <View style={[S.inputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <MaterialCommunityIcons name="email-outline" size={18} color={T.subText} />
              <TextInput
                placeholder="Email"
                placeholderTextColor={T.subText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={[S.input, { color: T.text }]}
              />
            </View>

            {/* Mật khẩu */}
            <View style={[S.inputRow, { backgroundColor: T.inputBg, borderColor: T.border }]}>
              <MaterialCommunityIcons name="lock-outline" size={18} color={T.subText} />
              <TextInput
                placeholder="Mật khẩu (≥ 8 ký tự)"
                placeholderTextColor={T.subText}
                value={pw}
                onChangeText={setPw}
                secureTextEntry={!showPw}
                style={[S.input, { color: T.text }]}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={T.subText} />
              </TouchableOpacity>
            </View>

            {/* Strength bar */}
            <View style={S.strengthWrap}>
              <View style={[S.strengthBar, { backgroundColor: T.barBg }]}>
                <View
                  style={[
                    S.strengthFill,
                    {
                      width: `${(pwScore / 4) * 100}%`,
                      backgroundColor: pwScore <= 1 ? '#ef4444' : pwScore === 2 ? '#f59e0b' : '#22c55e',
                    },
                  ]}
                />
              </View>
              <Text style={[S.strengthLabel, { color: T.subText }]}>Độ mạnh: {pwLabel}</Text>
            </View>

            {/* Terms */}
            <TouchableOpacity onPress={() => setAgree(!agree)} style={S.termsRow}>
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={20} color={agree ? '#60a5fa' : T.subText} />
              <Text style={{ color: T.subText }}>
                Tôi đồng ý với <Text style={{ textDecorationLine: 'underline' }}>Điều khoản</Text> &{' '}
                <Text style={{ textDecorationLine: 'underline' }}>Bảo mật</Text>
              </Text>
            </TouchableOpacity>

            {/* Submit */}
            <TouchableOpacity
              onPress={onSignUp}
              disabled={!canSubmit}
              style={[
                S.submitBtn,
                { backgroundColor: canSubmit ? T.primary : T.primaryDisabled },
              ]}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.submitTxt}>Tạo tài khoản</Text>}
            </TouchableOpacity>

            {/* Divider */}
            <View style={S.dividerRow}>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
              <Text style={[S.dividerTxt, { color: T.subText }]}>hoặc</Text>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={() => Alert.alert('Google', 'Gắn hàm đăng nhập Google tại đây')}
              style={[S.socialBtn, { backgroundColor: T.socialBg, borderColor: T.border }]}
            >
              <Image source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} style={S.googleIcon} />
              <Text style={{ color: T.text, fontWeight: '600' }}>Đăng ký với Google</Text>
            </TouchableOpacity>
          </View>

          {/* footer */}
          <View style={S.footer}>
            <Text style={{ color: T.subText }}>
              Đã có tài khoản?{' '}
              <Text style={[{ color: '#93c5fd' }, S.footerLink]} onPress={() => router.push('/(auth)/login')}>
                Đăng nhập
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
