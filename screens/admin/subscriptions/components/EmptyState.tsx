import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export function EmptyState({ C }: { C: any }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
      <Ionicons name="cloud-offline" size={28} color={C.sub} />
      <Text style={{ color: C.sub, marginTop: 8 }}>Không có dữ liệu phù hợp</Text>
    </View>
  );
}
