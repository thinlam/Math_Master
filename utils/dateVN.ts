import { serverTimestamp } from 'firebase/firestore';
export const VN_TZ = 'Asia/Ho_Chi_Minh';

export function localDayString(tz = VN_TZ, d = new Date()) {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const dd = parts.find(p => p.type === 'day')?.value ?? '01';
  const mm = parts.find(p => p.type === 'month')?.value ?? '01';
  const yyyy = parts.find(p => p.type === 'year')?.value ?? '1970';
  return `${yyyy}-${mm}-${dd}`;
}

export function diffDaysLocal(aYYYYMMDD: string, bYYYYMMDD: string) {
  const [ay, am, ad] = aYYYYMMDD.split('-').map(Number);
  const [by, bm, bd] = bYYYYMMDD.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}

export const nowServer = serverTimestamp;
