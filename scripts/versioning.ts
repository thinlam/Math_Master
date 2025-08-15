// scripts/versioning.ts
import * as Application from 'expo-application';

/** Lấy version hiện tại: ưu tiên nativeApplicationVersion (production safe) */
export function getCurrentVersion(): string {
  const v = Application.nativeApplicationVersion ?? Application.applicationVersion ?? '0.0.0';
  return String(v);
}

/** So sánh "1.2.3"  → -1,0,1 */
export function compareVersions(v1?: string | null, v2?: string | null): -1 | 0 | 1 {
  if (!v1 && !v2) return 0;
  if (!v1) return -1;
  if (!v2) return 1;
  const a = v1.split('.').map((n) => parseInt(n || '0', 10));
  const b = v2.split('.').map((n) => parseInt(n || '0', 10));
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}
