import { AdminSettingsStyles as s } from '@/components/style/admin/AdminSettingsStyles';
import React from 'react';
import { Text, View } from 'react-native';

export default function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowValueWrap}>{children}</View>
    </View>
  );
}
