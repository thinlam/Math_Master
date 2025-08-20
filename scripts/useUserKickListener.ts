// scripts/useUserKickListener.ts
import { auth, db } from '@/scripts/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useEffect } from 'react';
import { Alert } from 'react-native';

const LAST_FORCE_KEY = 'lastForceLogoutAt';

function tsToMs(ts?: Timestamp | null) {
  try {
    return ts?.toMillis?.() ?? 0;
  } catch {
    return 0;
  }
}

export function useUserKickListener() {
  useEffect(() => {
    // Theo dõi người dùng hiện tại
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // Không có user -> không cần nghe Firestore
      if (!user) return;

      const ref = doc(db, 'users', user.uid);

      // Lắng nghe thay đổi doc người dùng
      const unsubSnap = onSnapshot(ref, async (snap) => {
        const data = snap.data() as any | undefined;
        if (!data) return;

        // 1) Nếu user bị chặn: đăng xuất ngay với thông báo
        if (data.blocked) {
          Alert.alert('Thông báo', 'Tài khoản của bạn đang bị khóa. Vui lòng liên hệ hỗ trợ.');
          await signOut(auth);
          return;
        }

        // 2) Nếu có forceLogoutAt mới: đăng xuất + thông báo
        const forceAt = tsToMs(data.forceLogoutAt);
        if (forceAt > 0) {
          const last = Number(await AsyncStorage.getItem(LAST_FORCE_KEY) || '0');
          if (forceAt !== last) {
            await AsyncStorage.setItem(LAST_FORCE_KEY, String(forceAt));

            const reason = data.forceLogoutReason || '';
            const msg =
              reason === 'unlock'
                ? 'Tài khoản của bạn vừa được mở khóa. Vui lòng đăng nhập lại.'
                : 'Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.';

            Alert.alert('Thông báo', msg);
            await signOut(auth);
          }
        }
      });

      // Dọn dẹp khi user đổi
      return () => unsubSnap();
    });

    return () => unsubAuth();
  }, []);
}
