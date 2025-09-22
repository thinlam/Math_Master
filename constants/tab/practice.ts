// constants/tab/practice.ts
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type TopicKey = 'add_sub' | 'mul_div' | 'geometry' | 'algebra' | 'numberSense';
export type DifficultyKey = 'easy' | 'medium' | 'hard';
export type Difficulty = DifficultyKey;

export const PAGE_SIZE = 12;
export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

export const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'add_sub',     label: 'Cộng trừ' },
  { key: 'mul_div',     label: 'Nhân chia' },
  { key: 'geometry',    label: 'Hình học' },
  { key: 'algebra',     label: 'Đại số' },
  { key: 'numberSense', label: 'Số học' },
];

export const DIFFS: { key: DifficultyKey; label: string }[] = [
  { key: 'easy',   label: 'Dễ' },
  { key: 'medium', label: 'Vừa' },
  { key: 'hard',   label: 'Khó' },
];

export const TONE = { green: '#22C55E', amber: '#F59E0B', red: '#EF4444' } as const;
export const TONE_BG = { green: '#0F2B1A', amber: '#2A2108', red: '#2B0F13' } as const;

export type Ion = ComponentProps<typeof Ionicons>['name'];
export type Mci = ComponentProps<typeof MaterialCommunityIcons>['name'];
