// components/tab/store/PayBtn.tsx
import { StoreBtnStyles as styles } from '@/components/style/tab/StoreStyles';
import type { Palette } from '@/theme/ThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

export default function PayBtn({
  label, icon, onPress, loading, p,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  p: Palette;
}) {
  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: p.brandSoft, borderColor: p.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          <Ionicons name={icon} size={16} color={p.editBtnText} />
          <Text style={[styles.label, { color: p.editBtnText }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
