import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://otp-server21-production.up.railway.app';
const ACCOUNT: 'mathmaster' =
  (process.env.EXPO_PUBLIC_ACCOUNT as any) || 'mathmaster';

// fetch có timeout
async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

export default function ResetPasswordScreen() {
  const { email, account } = useLocalSearchParams<{ email?: string; account?: string }>();
  const accToUse = (account as string) || ACCOUNT;
  const emailSafe = useMemo(() => {
    try {
      return decodeURIComponent(String(email || '')).trim().toLowerCase();
    } catch {
      return String(email || '').trim().toLowerCase();
    }
  }, [email]);

  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleReset = async () => {
    if (!emailSafe) return Alert.alert('Lỗi', 'Không tìm thấy email');
    if (!password || !rePassword) return Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
    if (password.length < 6) return Alert.alert('Lỗi', 'Mật khẩu phải từ 6 ký tự trở lên');
    if (password !== rePassword) return Alert.alert('Lỗi', 'Mật khẩu không trùng khớp');

    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${API_BASE}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Server chỉ dùng email + newPassword; account gửi thêm cũng không sao
        body: JSON.stringify({ email: emailSafe, newPassword: password, account: accToUse }),
      }, 15000);

      const data = await res.json().catch(() => ({} as any));

      if (res.ok && data?.success) {
        Alert.alert('✅ Thành công', data?.message || 'Mật khẩu đã được cập nhật', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      } else {
        // 404 từ server: email không tồn tại
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#f0f4ff' }}
    >
      <Text style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center', color: '#6C63FF', marginBottom: 24 }}>
        🔐 Đặt lại mật khẩu
      </Text>

      <Text style={{ color: '#555', fontSize: 14, marginBottom: 10 }}>
        Email: <Text style={{ fontWeight: 'bold' }}>{emailSafe || '(không có)'}</Text>
      </Text>

      {/* Mật khẩu mới */}
      <View style={{ position: 'relative', marginBottom: 16 }}>
        <TextInput
          placeholder="Nhập mật khẩu mới"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
          editable={!loading}
          style={{
            backgroundColor: '#fff', padding: 14, borderRadius: 10, fontSize: 16,
            shadowColor: '#ccc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
          }}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)} disabled={loading}
          style={{ position: 'absolute', right: 14, top: 14 }}>
          <FontAwesome5 name={showPassword ? 'eye' : 'eye-slash'} size={18} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Nhập lại mật khẩu */}
      <View style={{ position: 'relative', marginBottom: 32 }}>
        <TextInput
          placeholder="Nhập lại mật khẩu"
          secureTextEntry={!showRePassword}
          value={rePassword}
          onChangeText={setRePassword}
          editable={!loading}
          onSubmitEditing={handleReset}
          style={{
            backgroundColor: '#fff', padding: 14, borderRadius: 10, fontSize: 16,
            shadowColor: '#ccc', shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
          }}
        />
        <TouchableOpacity onPress={() => setShowRePassword(!showRePassword)} disabled={loading}
          style={{ position: 'absolute', right: 14, top: 14 }}>
          <FontAwesome5 name={showRePassword ? 'eye' : 'eye-slash'} size={18} color="#888" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={handleReset} disabled={loading}
        style={{
          backgroundColor: '#6C63FF', paddingVertical: 14, borderRadius: 10,
          opacity: loading ? 0.6 : 1,
          shadowColor: '#6C63FF', shadowOpacity: 0.3, shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4, elevation: 4
        }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>
          {loading ? 'ĐANG LƯU...' : '💾 LƯU MẬT KHẨU'}
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}
