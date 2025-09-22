// constants/tab/library.ts
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type LibraryType = 'pdf' | 'video' | 'exercise' | 'note' | 'link';

export const PAGE_SIZE = 12;
export const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
export const TYPES: LibraryType[] = ['pdf', 'video', 'exercise', 'note', 'link'];

export const TYPE_ICON: Record<LibraryType, ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  pdf: 'file-pdf-box',
  video: 'play-circle',
  exercise: 'atom-variant',
  note: 'note-text-outline',
  link: 'link-variant',
};

export const RADIUS = { lg: 16, md: 12, pill: 999 };
