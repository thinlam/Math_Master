import { styles as S } from '@/components/style/admin/subscriptions/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export function Header({
  C,
  status, setStatus,
  uidQuery, setUidQuery,
  onReload,
}: {
  C: any;
  status: 'all' | 'active' | 'cancelled' | 'expired';
  setStatus: (s: any) => void;
  uidQuery: string;
  setUidQuery: (s: string) => void;
  onReload: () => void;
}) {
  const router = useRouter();

  return (
    <View style={[S.headerWrap, { backgroundColor: C.bg, borderColor: C.border }]}>
      <Text style={[S.title, { color: C.text }]}>Quản lý gói Premium</Text>

      {/* search */}
      <View style={[S.searchBox, { borderColor: C.border, backgroundColor: C.card }]}>
        <Ionicons name="search" size={18} color={C.sub} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Tìm theo UID người dùng"
          placeholderTextColor={C.sub}
          autoCapitalize="none"
          autoCorrect={false}
          value={uidQuery}
          onChangeText={setUidQuery}
          style={[S.searchInput, { color: C.text }]}
          returnKeyType="search"
        />
        {!!uidQuery && (
          <TouchableOpacity onPress={() => setUidQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={C.sub} />
          </TouchableOpacity>
        )}
      </View>

      {/* filters */}
      <View style={S.segmentWrap}>
        {(['all','active','cancelled','expired'] as const).map(s => {
          const active = status === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setStatus(s)}
              style={[
                S.segmentItem,
                { borderColor: C.border, backgroundColor: active ? C.primary : C.chipBg },
              ]}
            >
              <Text style={[S.segmentText, { color: active ? '#fff' : C.text, opacity: active ? 1 : 0.85 }]}>{s}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity onPress={onReload} style={[S.segmentReload, { borderColor: C.border, backgroundColor: C.card }]}>
          <Ionicons name="reload" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* create top */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/subscriptions/new')}
        style={[S.createTop, { backgroundColor: C.card, borderColor: C.border }]}
      >
        <Ionicons name="add" size={18} color={C.primary} />
        <Text style={{ marginLeft: 8, color: C.text, fontWeight: '600' }}>Tạo gói thủ công</Text>
      </TouchableOpacity>
    </View>
  );
}
