// app/(admin)/subscriptions/[id].tsx
import { db } from '@/scripts/firebase';
import { deleteSubscription, getSubscriptionById, Subscription, updateSubscription } from '@/services/subscription';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

/** helper: sau khi sửa/xóa sub, đồng bộ role người dùng */
async function syncUserRole(uid: string) {
  // còn active nào không?
  const q = query(collection(db, 'subscriptions'), where('uid','==',uid), where('status','==','active'));
  const snap = await getDocs(q);
  const userRef = doc(db, 'users', uid);
  if (snap.empty) {
    await updateDoc(userRef, { role: 'user' });
  } else {
    await updateDoc(userRef, { role: 'premium' });
  }
}

export default function EditSub() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<Subscription | null>(null);
  const [planId, setPlanId] = useState('');
  const [status, setStatus] = useState<'active'|'cancelled'|'expired'>('active');
  const [note, setNote] = useState('');

  const load = async () => {
    try {
      const data = await getSubscriptionById(id!);
      if (!data) {
        Alert.alert('Không tìm thấy', 'Sub đã bị xóa?');
        router.back();
        return;
      }
      setItem(data);
      setPlanId(data.planId);
      setStatus(data.status);
      setNote(data.note || '');
    } catch (e:any) {
      Alert.alert('Lỗi', e?.message || 'Không tải được');
    }
  };

  useEffect(() => { load(); }, [id]);

  const onSave = async () => {
    if (!item) return;
    try {
      await updateSubscription(item.id!, { planId: planId as any, status, note });
      await syncUserRole(item.uid);
      Alert.alert('Đã lưu', 'Cập nhật thành công');
      router.back();
    } catch (e:any) {
      Alert.alert('Lỗi', e?.message || 'Không lưu được');
    }
  };

  const onDelete = async () => {
    if (!item) return;
    Alert.alert('Xóa gói?', 'Không thể hoàn tác', [
      { text: 'Hủy' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deleteSubscription(item.id!);
            await syncUserRole(item.uid);
            Alert.alert('Đã xóa', 'Gói đã được xóa');
            router.back();
          } catch (e:any) {
            Alert.alert('Lỗi', e?.message || 'Không xóa được');
          }
        }
      }
    ]);
  };

  if (!item) return (
    <SafeAreaView style={{ flex:1, justifyContent:'center', alignItems:'center' }}>
      <StatusBar barStyle="dark-content" />
      <Text>Loading…</Text>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={S.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={S.title}>Sửa gói #{item.id!.slice(0,6)}…</Text>
      <Text style={S.label}>UID</Text>
      <Text style={S.value}>{item.uid}</Text>

      <Text style={S.label}>PlanId</Text>
      <TextInput style={S.input} value={planId} onChangeText={setPlanId}
                 placeholder="premium1m | premium3m | premium12m" />

      <Text style={S.label}>Status</Text>
      <TextInput style={S.input} value={status} onChangeText={t => setStatus(t as any)}
                 placeholder="active | cancelled | expired" />

      <Text style={S.label}>Ghi chú</Text>
      <TextInput style={[S.input, { height: 80 }]} value={note} onChangeText={setNote} multiline />

      <View style={{ height: 10 }} />
      <TouchableOpacity style={[S.btn, { backgroundColor:'#4F46E5' }]} onPress={onSave}>
        <Text style={S.btnText}>Lưu thay đổi</Text>
      </TouchableOpacity>
      <View style={{ height: 8 }} />
      <TouchableOpacity style={[S.btn, { backgroundColor:'#DC2626' }]} onPress={onDelete}>
        <Text style={S.btnText}>Xóa gói</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const S = StyleSheet.create({
  container: { flex: 1, backgroundColor:'#fff', padding:16 },
  title: { fontSize:18, fontWeight:'700', marginBottom:12 },
  label: { marginTop:10, fontWeight:'600' },
  value: { paddingVertical:8, color:'#374151' },
  input: { borderWidth:1, borderColor:'#ddd', borderRadius:10, paddingHorizontal:12, height:44, marginTop:6 },
  btn: { borderRadius:10, paddingVertical:12, alignItems:'center' },
  btnText: { color:'#fff', fontWeight:'700' },
});
