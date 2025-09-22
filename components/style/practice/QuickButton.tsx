import type { Ion } from '@/constants/tab/practice';
import type { Palette } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

export default function QuickButton({
  icon, label, onPress, palette,
}: { icon: Ion; label: string; onPress: () => void; palette: Palette }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1, backgroundColor: palette.card, borderColor: palette.cardBorder,
        borderWidth: 1, borderRadius: 16, padding: 12, alignItems: 'center', justifyContent: 'center',
      }}
      activeOpacity={0.85}
    >
      <Ionicons name={icon} size={20} color={palette.text} />
      <Text style={{ color: palette.text, marginTop: 6, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}
