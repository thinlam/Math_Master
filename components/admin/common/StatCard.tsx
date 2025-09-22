import { AnalyticsStyles as s } from '@/components/style/admin/AnalyticsStyles';
import React from 'react';
import { Text, View } from 'react-native';

export default function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{title}</Text>
      <Text style={s.cardValue}>{value}</Text>
    </View>
  );
}
