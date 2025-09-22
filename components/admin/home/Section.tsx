import { AdminHomeStyles as s } from '@/components/style/admin/AdminHomeStyles';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

export default function Section({
  title, children, actionLabel, onAction,
}: { title: string; children: React.ReactNode; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitleRow}>
        <Text style={s.sectionTitle}>{title}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction}>
            <Text style={s.sectionAction}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}
