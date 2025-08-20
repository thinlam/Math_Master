// app/(admin)/subscriptions/new.tsx
import { auth } from '@/scripts/firebase';
import { createSubscription, PlanId } from '@/services/subscription';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';

export default function NewSub() {
  const router = useRouter();
  const [uid, setUid] = useState('');
  const [planId, setPlanId] = useState<PlanId>('premium1m');
  const [note, setNote] = useState('');

  const onCreate = async () => {
    try {
      if (!uid.trim()) throw new Error('Nhập UID user');
      const adminUid = auth.currentUser?.uid;
      await createSubscription({ uid: uid.trim(), planId, createdBy: adminUid, note });
      Alert.alert('Thành công', 'Đã tạo gói');
      router.back();
    } catch (e:any) {
      Alert.alert('Lỗi', e?.message || 'Không tạo được gói');
    }
  };

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={S.title}>Tạo gói Premium</Text>
      <TextInput placeholder="UID người dùng" style={S.input} value={uid} onChangeText={setUid} />
      <TextInput placeholder="PlanId (premium1m | premium3m | premium12m)"
                 style={S.input} value={planId} onChangeText={t => setPlanId(t as PlanId)} />
      <TextInput placeholder="Ghi chú" style={[S.input, { height: 80 }]} value={note} onChangeText={setNote} multiline />
      <TouchableOpacity style={S.btn} onPress={onCreate}>
        <Text style={S.btnText}>Tạo</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:10, height:44, paddingHorizontal:12, marginBottom:10 },
  btn: { backgroundColor:'#4F46E5', padding:12, borderRadius:10, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' },
});
