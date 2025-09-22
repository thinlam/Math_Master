import type { Palette } from '@/theme/ThemeProvider';
import React from 'react';
import { FlatList, Text, TouchableOpacity, View } from 'react-native';

export default function FilterRow({
  label, data, onPress, palette,
}: {
  label: string;
  data: { key: string; label: string; active?: boolean }[];
  onPress: (key: string) => void;
  palette: Palette;
}) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ color: palette.textMuted, paddingHorizontal: 16, marginBottom: 8 }}>{label}</Text>
      <FlatList
        data={data}
        keyExtractor={(it) => it.key}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onPress(item.key)}
            style={{
              backgroundColor: item.active ? palette.brand : palette.pillBg,
              borderColor: palette.pillBorder, borderWidth: 1,
              paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginRight: 8,
            }}
          >
            <Text style={{ color: item.active ? '#FFFFFF' : palette.textFaint, fontWeight: item.active ? '700' : '500' }}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  );
}
