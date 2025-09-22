import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

export default function QuickAction({
  icon, label, onPress,
}: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 10, paddingHorizontal: 12,
        borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <Ionicons name={icon} size={16} color="#93c5fd" />
      <Text style={{ color: '#e5e7eb', fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}
