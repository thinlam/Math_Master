import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export default function SubStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    active: { label: 'Active', bg: 'rgba(22,163,74,0.15)', color: '#16a34a', icon: 'checkmark-circle-outline' },
    cancelled: { label: 'Cancelled', bg: 'rgba(234,179,8,0.15)', color: '#eab308', icon: 'pause-circle-outline' },
    expired: { label: 'Expired', bg: 'rgba(107,114,128,0.15)', color: '#6b7280', icon: 'time-outline' },
  };
  const style = map[status] ?? map.active;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: style.bg }}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={{ color: style.color, fontWeight: '700', fontSize: 12 }}>{style.label}</Text>
    </View>
  );
}
