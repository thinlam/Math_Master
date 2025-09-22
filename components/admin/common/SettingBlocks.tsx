import { AdminConfigStyles as s } from '@/components/style/admin/AdminConfigStyles';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

export const SettingCard = ({ children, title }: { children: React.ReactNode; title?: string }) => (
  <View style={s.card}>
    {title ? <Text style={s.cardTitle}>{title}</Text> : null}
    {children}
  </View>
);

export const SettingRow = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={s.row}>
    <Text style={s.rowLabel}>{label}</Text>
    <View style={s.rowRight}>{children}</View>
  </View>
);

export const SettingRowTop = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={s.rowTopWrap}>
    <Text style={s.rowTopLabel}>{label}</Text>
    {children}
  </View>
);

export const SettingHint = ({ text }: { text: string }) => (
  <Text style={s.hint}>{text}</Text>
);

export const InlineInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput {...props} style={[s.inputInline, props.style]} placeholderTextColor="#94a3b8" />
);

export const MultilineInput = (props: React.ComponentProps<typeof TextInput>) => (
  <TextInput
    {...props}
    style={[s.inputMultiline, props.style]}
    placeholderTextColor="#94a3b8"
    multiline
  />
);

export const ChipButton = ({ title, onPress }: { title: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} style={s.chipBtn}>
    <Text style={s.chipText}>{title}</Text>
  </TouchableOpacity>
);

export const PrimaryCTA = ({
  title,
  disabled,
  onPress,
}: {
  title: string;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={[s.saveBtn, disabled && s.saveBtnDisabled]}
  >
    <Text style={s.saveText}>{disabled ? 'Đang lưu...' : title}</Text>
  </TouchableOpacity>
);
