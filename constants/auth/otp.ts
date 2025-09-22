// constants/auth/otp.ts
export const OTP_LENGTH = 6;
export const COOLDOWN_SECONDS = 60;

export const ACCOUNT = (process.env.EXPO_PUBLIC_ACCOUNT || 'mathmaster').toLowerCase();
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://otp-server21-production.up.railway.app';

export const ENDPOINTS = {
  SEND_OTP: `${API_BASE}/send-otp`,
  VERIFY_OTP: `${API_BASE}/verify-otp`,
};

// helpers chung
export const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s);
export function isAlreadySentMessage(msg?: string) {
  if (!msg) return false;
  const m = msg.toLowerCase();
  return (
    m.includes('otp đã được gửi') ||
    m.includes('already sent') ||
    m.includes('otp already sent')
  );
}

// fetch with timeout (RN không có sẵn)
export async function fetchWithTimeout(
  resource: RequestInfo,
  options: RequestInit = {},
  timeoutMs = 15000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}
