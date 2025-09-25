import { styles as S } from '@/components/style/admin/subscriptions/styles';
import { type Subscription } from '@/services/subscription';
import { fmt, toDateSafe } from '@/utils/datetime';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export function SubItemCard({ item, C }: { item: Subscription; C: any }) {
  const router = useRouter();
  const start = toDateSafe(item.startedAt);
  const end = toDateSafe(item.expiresAt);

  const badgeBg =
    item.status === 'active' ? C.success :
    item.status === 'cancelled' ? C.warn :
    C.mute;

  return (
    <TouchableOpacity
      style={[S.card, { backgroundColor: C.card, borderColor: C.border, shadowColor: C.isDark ? '#000' : C.primary2 }]}
      onPress={() => router.push(`/(admin)/subscriptions/${item.id}`)}
      activeOpacity={0.9}
    >
      <View style={S.cardHeader}>
        <Text style={[S.plan, { color: C.text }]}>{item.planId}</Text>
        <View style={[S.badge, { backgroundColor: badgeBg }]}>
          <Text style={S.badgeText}>{item.status}</Text>
        </View>
      </View>

      <View style={S.metaRow}>
        <Ionicons name="person-circle" size={16} color={C.sub} />
        <Text style={[S.metaText, { color: C.sub }]}>UID:</Text>
        <Text style={[S.metaValue, { color: C.text }]} numberOfLines={1}>{item.uid}</Text>
      </View>

      <View style={S.metaRow}>
        <Ionicons name="time" size={16} color={C.sub} />
        <Text style={[S.metaText, { color: C.sub }]}>Bắt đầu:</Text>
        <Text style={[S.metaValue, { color: C.text }]}>{fmt(start)}</Text>
      </View>

      <View style={S.metaRow}>
        <Ionicons name="alarm" size={16} color={C.sub} />
        <Text style={[S.metaText, { color: C.sub }]}>Hết hạn:</Text>
        <Text style={[S.metaValue, { color: C.text }]}>{fmt(end)}</Text>
      </View>
    </TouchableOpacity>
  );
}
