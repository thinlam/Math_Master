import { AdminSettingsStyles as s } from '@/components/style/admin/AdminSettingsStyles';
import React from 'react';
import { View } from 'react-native';

export default function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}
