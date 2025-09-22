import { TONE, TONE_BG } from '@/constants/tab/practice';
import type { Palette } from '@/theme/ThemeProvider';
import React from 'react';
import { Text, View } from 'react-native';

export default function Tag({
  text, tone, palette,
}: { text: string; tone?: 'green' | 'amber' | 'red'; palette: Palette }) {
  const bg = tone ? TONE_BG[tone] : palette.pillBg;
  const color = tone ? TONE[tone] : palette.text;
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: palette.cardBorder }}>
      <Text style={{ color, fontSize: 12 }}>{text}</Text>
    </View>
  );
}
