import { auth, db } from '@/scripts/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useState } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');

  const onLogin = async () => {
    if (!email || !password) {
      Alert.alert('Thiếu thông tin', 'Nhập email và mật khẩu');
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = cred.user;

      // Kiểm tra hồ sơ trong Firestore
      const uRef = doc(db, 'users', user.uid);
      const snap = await getDoc(uRef);
      if (!snap.exists()) {
        // Nếu user trước đây chỉ có Auth mà chưa có profile → tạo tối thiểu
        await setDoc(uRef, {
          uid: user.uid,
          name: user.displayName ?? '',
          email: user.email,
          role: 'user',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      Alert.alert('Thành công', 'Đăng nhập thành công!');
      // router.replace('/(tabs)/Home');
    } catch (e: any) {
      Alert.alert('Đăng nhập lỗi', e?.message ?? 'Không rõ nguyên nhân');
    }
  };

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Đăng nhập</Text>

      <TextInput placeholder="Email" value={email} onChangeText={setEmail}
        autoCapitalize="none" keyboardType="email-address"
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />

      <TextInput placeholder="Mật khẩu" value={password} onChangeText={setPassword}
        secureTextEntry style={{ borderWidth: 1, padding: 12, borderRadius: 8 }} />

      <TouchableOpacity onPress={onLogin}
        style={{ backgroundColor: '#222', padding: 14, borderRadius: 10 }}>
        <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>Đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );
}
