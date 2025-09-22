import { AdminSettingsStyles as s } from '@/components/style/admin/AdminSettingsStyles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export default function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
    admin:   { label: 'Admin',   bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: 'shield-checkmark-outline' },
    premium: { label: 'Premium', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', icon: 'star-outline' },
    user:    { label: 'User',    bg: 'rgba(148,163,184,0.15)',color: '#94a3b8', icon: 'person-outline' },
  };
  const style = map[role] ?? map.user;

  return (
    <View style={[s.roleBadge, { backgroundColor: style.bg }]}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={[s.roleText, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}
