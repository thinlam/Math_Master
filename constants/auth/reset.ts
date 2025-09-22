// constants/auth/reset.ts

// Đường dẫn màn đăng nhập (để redirect sau khi reset xong)
export const LOGIN_PATH =
  process.env.EXPO_PUBLIC_LOGIN_PATH || '/login';

// Tài khoản/brand đang dùng server OTP
export const ACCOUNT =
  (process.env.EXPO_PUBLIC_ACCOUNT as string) || 'mathmaster';

// API base của server OTP
export const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://otp-server21-production.up.railway.app';

export const ENDPOINTS = {
  HEALTH: `${API_BASE}/health`,
  RESET_PASSWORD: `${API_BASE}/reset-password`,
};
