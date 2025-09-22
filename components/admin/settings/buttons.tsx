import { AdminSettingsStyles as s } from '@/components/style/admin/AdminSettingsStyles';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

type N = React.ComponentProps<typeof Ionicons>['name'];

export function PrimaryButton({ title, icon, onPress }: { title: string; icon: N; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.btnPrimary}>
      <Ionicons name={icon} size={18} color="#fff" />
      <Text style={s.btnPrimaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function GhostButton({ title, icon, onPress }: { title: string; icon: N; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.btnGhost}>
      <Ionicons name={icon} size={18} color="#e5e7eb" />
      <Text style={s.btnGhostText}>{title}</Text>
    </TouchableOpacity>
  );
}

export function DangerButton({ title, icon, onPress }: { title: string; icon: N; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.btnDanger}>
      <Ionicons name={icon} size={18} color="#ef4444" />
      <Text style={s.btnDangerText}>{title}</Text>
    </TouchableOpacity>
  );
}
