// app/(auth)/LoginScreen.tsx
import { auth, db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LoginStaticStyles as S, themedTokens } from '@/components/style/auth/LoginStyles';

/** Types */
type AppRole = 'admin' | 'premium' | 'user' | string;
type FieldErrors = { email?: string; pw?: string; form?: string };

/** Helpers */
const isEmail = (s: string) => /\S+@\S+\.\S+/.test(s.trim());
const isUsername = (s: string) => /^[a-zA-Z0-9._-]{3,20}$/.test(s.trim());

/** Chuẩn hoá username (sanitize) */
function toUsernameLower(raw?: string | null): string | null {
  if (!raw) return null;
  const base = raw
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu tiếng Việt
    .replace(/[^a-z0-9._-]/g, '') // chỉ giữ a-z0-9._-
    .replace(/(\.){2,}/g, '.')
    .replace(/(_){2,}/g, '_')
    .replace(/(-){2,}/g, '-')
    .replace(/^\.|\.?$/g, '');
  if (!base) return null;
  const clipped = base.slice(0, 20);
  return clipped.length >= 3 ? clipped : null;
}

/** Route by role */
function routeByRole(
  router: ReturnType<typeof useRouter>,
  role?: AppRole,
  opts?: { startMode?: string | null; level?: number | null }
) {
  const r = role ?? 'user';
  if (r === 'admin') return router.replace('/(admin)/home');
  if (r === 'premium') return router.replace('/(tabs)');
  if (opts?.startMode || opts?.level !== null) return router.replace('/(tabs)');
  return router.replace('/(tabs)');
}

/** Map Firebase Auth error code to field */
function mapAuthErrorToField(code?: string): FieldErrors {
  switch (code) {
    case 'auth/invalid-email':
      return { email: 'Email không hợp lệ.' };
    case 'auth/user-mismatch':
      return { form: 'Thông tin đăng nhập không đúng.' };
    case 'auth/user-not-found':
      return { email: 'Không tìm thấy tài khoản với email/username này.' };
    case 'auth/wrong-password':
      return { pw: 'Mật khẩu không đúng.' };
    case 'auth/too-many-requests':
      return { form: 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.' };
    case 'auth/user-disabled':
      return { form: 'Tài khoản đã bị vô hiệu hoá.' };
    default:
      return { form: 'Đăng nhập thất bại. Vui lòng thử lại.' };
  }
}

export default function LoginScreen() {
  const router = useRouter();

  // 1 ô: email hoặc username/name
  const [identifier, setIdentifier] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [darkMode, setDarkMode] = useState(true);
  const [useLogoFallback, setUseLogoFallback] = useState(false);
  const T = useMemo(() => themedTokens(darkMode), [darkMode]);

  /** Validation */
  function validateAll(values: { identifier: string; pw: string }) {
    const next: FieldErrors = {};
    const id = values.identifier.trim();
    const pwVal = values.pw;

    // CASE 1: Có mật khẩu nhưng không có tài khoản
    if (!id && pwVal) {
      next.email = 'Cần nhập tài khoản';
    }
    // CASE 2: Có tài khoản nhưng không có mật khẩu
    else if (id && !pwVal) {
      next.form = 'Không thể đăng nhập, xin vui lòng thử lại';
    }
    // CASE 3: Các trường hợp còn lại dùng validate bình thường
    else {
      if (!id) {
        next.email = 'Vui lòng nhập email hoặc tên đăng nhập.';
      } else if (!(isEmail(id) || isUsername(id))) {
        next.email = 'Nhập email hợp lệ hoặc username/name (3–20 ký tự: a-z, 0-9, . _ -).';
      }

      if (!pwVal) {
        next.pw = 'Vui lòng nhập mật khẩu.';
      } else if (pwVal.length < 6) {
        next.pw = 'Mật khẩu tối thiểu 6 ký tự.';
      }
    }

    return { next, hasError: !!(next.email || next.pw || next.form) };
  }

  const canSubmit = useMemo(() => {
    // Chỉ cần có ít nhất 1 ô được nhập là cho bấm, để show message custom
    const hasAnyInput = identifier.trim().length > 0 || pw.length > 0;
    return hasAnyInput && !loading;
  }, [identifier, pw, loading]);

  function setField<K extends keyof FieldErrors>(key: K, msg?: string) {
    setErrors((prev) => ({ ...prev, [key]: msg }));
  }

  /** Ensure user profile + auto backfill username mapping (và alias theo name) nếu thiếu */
  const ensureUserProfile = async (uid: string, displayName?: string | null, mail?: string | null) => {
    const uRef = doc(db, 'users', uid);
    const uSnap = await getDoc(uRef);

    // Tạo mới nếu thiếu
    if (!uSnap.exists()) {
      await setDoc(uRef, {
        uid,
        name: displayName ?? '',
        email: mail ?? '',
        role: 'user',
        level: null,
        startMode: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(uRef, { updatedAt: serverTimestamp() }, { merge: true });
    }

    const fresh = (await getDoc(uRef)).data() as any;

    // --- Main usernameLower ---
    let usernameLower: string | null =
      fresh?.usernameLower ??
      toUsernameLower(fresh?.name) ??
      toUsernameLower(displayName) ??
      toUsernameLower(mail?.split('@')[0]);

    if (!usernameLower) usernameLower = ('u' + uid.slice(0, 7)).toLowerCase();

    // Đảm bảo không trùng mapping
    let finalUsername = usernameLower;
    for (let i = 0; i < 3; i++) {
      const mapRef = doc(db, 'usernames', finalUsername!);
      const mapSnap = await getDoc(mapRef);
      if (!mapSnap.exists()) {
        await setDoc(mapRef, { uid, email: mail ?? '' });
        break;
      } else {
        const owner = (mapSnap.data() as any)?.uid;
        if (owner === uid) break; // mình đã sở hữu
        const suffix = Math.floor(100 + Math.random() * 899);
        finalUsername = (usernameLower + suffix).slice(0, 20);
      }
    }

    // Lưu vào users
    await setDoc(
      uRef,
      {
        usernameLower: finalUsername,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // --- Alias theo name (để gõ name cũng vào được) ---
    const nameLower = toUsernameLower(fresh?.name) ?? null;
    if (nameLower) {
      const aliasRef = doc(db, 'usernames', nameLower);
      const aliasSnap = await getDoc(aliasRef);
      const owner = aliasSnap.exists() ? (aliasSnap.data() as any)?.uid : null;
      if (!aliasSnap.exists() || owner === uid) {
        await setDoc(aliasRef, { uid, email: mail ?? '' }, { merge: true });
      }
      await setDoc(uRef, { nameLower }, { merge: true });
    }
  };

  /**
   * identifier -> email:
   * - Email: dùng luôn
   * - Username/Name: tra usernames/{usernameLower} -> email
   *   Fallback: users.usernameLower == idLower
   *   Fallback 2: users.name == raw OR users.nameLower == idLower
   */
  const resolveIdentifierToEmail = async (idInput: string): Promise<string> => {
    const id = idInput.trim();
    if (isEmail(id)) return id;

    const idLower = id.toLowerCase();
    const usersCol = collection(db, 'users');

    // 1) mapping nhanh
    const mapRef = doc(db, 'usernames', idLower);
    const mapSnap = await getDoc(mapRef);
    if (mapSnap.exists()) {
      const data = mapSnap.data() as any;
      if (data?.email) return String(data.email);
    }

    // 2) users.usernameLower // fallback
    const qUserLower = query(usersCol, where('usernameLower', '==', idLower), limit(1)); /// eslint-disable-line no-unused-vars
    const rUserLower = await getDocs(qUserLower); /// eslint-disable-line no-unused-vars
    if (!rUserLower.empty) {
      const u = rUserLower.docs[0].data() as any;
      if (u?.email) return String(u.email);
    }

    // 3) users.name (exact)
    const qNameExact = query(usersCol, where('name', '==', id), limit(1));
    const rNameExact = await getDocs(qNameExact);
    if (!rNameExact.empty) {
      const u = rNameExact.docs[0].data() as any;
      if (u?.email) return String(u.email);
    }

    // 4) users.nameLower (nếu đã backfill)
    const qNameLower = query(usersCol, where('nameLower', '==', idLower), limit(1));
    const rNameLower = await getDocs(qNameLower);
    if (!rNameLower.empty) {
      const u = rNameLower.docs[0].data() as any;
      if (u?.email) return String(u.email);
    }

    // Không tìm được
    throw Object.assign(new Error('not-found'), { code: 'auth/user-not-found' });
  };

  /** Submit */
  const onLogin = async () => {
    setField('form', undefined);
    const { next, hasError } = validateAll({ identifier, pw });
    setErrors(next);
    if (hasError) return;

    try {
      setLoading(true);
      const emailResolved = await resolveIdentifierToEmail(identifier);

      const cred = await signInWithEmailAndPassword(auth, emailResolved.trim(), pw);
      const user = cred.user;

      // Tự “sửa DB” nếu thiếu usernameLower / alias theo name
      await ensureUserProfile(user.uid, user.displayName, user.email); // đảm bảo profile tồn tại + backfill mapping nếu thiếu

      const uSnap = await getDoc(doc(db, 'users', user.uid)); // lấy lại profile
      const data = uSnap.data() || {};
      const role: AppRole = (data?.role as AppRole) || 'user';
      const level = (data as any).level ?? null;
      const startMode = (data as any).startMode ?? null;

      setErrors({});
      Alert.alert('Đăng nhập thành công');
      routeByRole(router, role, { level, startMode });
    } catch (e: any) {
      const mapped = mapAuthErrorToField(e?.code); // map error code to field
      setErrors((prev) => ({ ...prev, ...mapped })); // merge errors
    } finally {
      setLoading(false);
    }
  };

  const onForgot = () =>
    router.push({ pathname: '/(auth)/ForgotPassword', params: { email: isEmail(identifier) ? identifier : '' } });
  const onLoginWithGoogle = () => Alert.alert('Google', 'Gắn logic đăng nhập Google ở đây.');

  return (
    <LinearGradient colors={T.gradient} style={S.root} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <KeyboardAvoidingView style={S.kbd} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">
          {/* Toggle */}
          <TouchableOpacity onPress={() => setDarkMode(!darkMode)} style={S.toggle}>
            <Ionicons name={darkMode ? 'sunny-outline' : 'moon-outline'} size={26} color={T.text} />
          </TouchableOpacity>

          {/* Header */}
          <View style={S.header}>
            {useLogoFallback ? (
              <Image
                source={{ uri: 'https://i.imgur.com/8wPDJ8K.png' }}
                style={[S.logo, { opacity: darkMode ? 0.95 : 1 }]}
              />
            ) : (
              <Image
                source={require('../../assets/images/icon_math_resized.png')}
                onError={() => setUseLogoFallback(true)}
                style={[S.logo, { opacity: darkMode ? 0.95 : 1, width: 200, height: 200, borderRadius: 200 }]}
              />
            )}
            <Text style={[S.title, { color: T.text }]}>Đăng nhập</Text>
            <Text style={[S.subtitle, { color: T.subText }]}>Rất vui được gặp lại bạn 👋</Text>
          </View>

          {/* Card */}
          <View style={[S.card, { backgroundColor: T.cardBg, borderColor: T.border }]}>
            {errors.form && (
              <View style={[S.errorBox, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: T.errorBorder }]}>
                <Ionicons name="alert-circle-outline" size={18} color={T.errorText} />
                <Text style={[S.errorTxt, { color: T.errorText }]}>{errors.form}</Text>
              </View>
            )}

            {/* Identifier (Email or Username/Name) */}
            <View
              style={[
                S.inputRow,
                { borderColor: errors.email ? T.errorBorder : T.border, backgroundColor: T.inputBg },
              ]}
            >
              <MaterialCommunityIcons
                name="account-circle-outline"
                size={18}
                color={errors.email ? T.errorText : T.subText}
              />
              <TextInput
                placeholder="Email hoặc Tên đăng nhập"
                placeholderTextColor={T.subText}
                autoCapitalize="none"
                keyboardType="email-address"
                value={identifier}
                onChangeText={(v) => setIdentifier(v)}
                style={[S.input, { color: T.text }]}
              />
              {errors.email && <Ionicons name="alert-circle" size={18} color={T.errorText} />}
            </View>
            {errors.email && <Text style={[S.inputErrorTxt, { color: T.errorText }]}>{errors.email}</Text>}

            {/* Password */}
            <View
              style={[
                S.inputRow,
                { borderColor: errors.pw ? T.errorBorder : T.border, backgroundColor: T.inputBg },
              ]}
            >
              <MaterialCommunityIcons name="lock-outline" size={18} color={errors.pw ? T.errorText : T.subText} />
              <TextInput
                placeholder="Mật khẩu"
                placeholderTextColor={T.subText}
                value={pw}
                onChangeText={(v) => setPw(v)}
                secureTextEntry={!showPw}
                style={[S.input, { color: T.text }]}
              />
              <TouchableOpacity onPress={() => setShowPw(!showPw)}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={errors.pw ? T.errorText : T.subText}
                />
              </TouchableOpacity>
              {errors.pw && <Ionicons name="alert-circle" size={18} color={T.errorText} />}
            </View>
            {errors.pw && <Text style={[S.inputErrorTxt, { color: T.errorText }]}>{errors.pw}</Text>}

            {/* Forgot + Submit */}
            <View style={S.actionRow}>
              <TouchableOpacity onPress={onForgot}>
                <Text style={S.forgot}>Quên mật khẩu?</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onLogin}
                disabled={!canSubmit}
                style={[S.loginBtn, { backgroundColor: canSubmit ? T.primary : T.primaryDisabled }]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={S.loginTxt}>Đăng nhập</Text>}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={S.dividerRow}>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
              <Text style={[S.dividerTxt, { color: T.subText }]}>hoặc</Text>
              <View style={[S.dividerLine, { backgroundColor: 'rgba(148,163,184,0.25)' }]} />
            </View>

            {/* Google */}
            <TouchableOpacity
              onPress={onLoginWithGoogle}
              style={[S.socialBtn, { backgroundColor: T.socialBg, borderColor: T.border }]}
            >
              <Image
                source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }}
                style={S.googleIcon}
              />
              <Text style={{ color: T.text, fontWeight: '600' }}>Đăng nhập với Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={S.footer}>
            <Text style={{ color: T.subText }}>
              Chưa có tài khoản?{' '}
              <Text style={[{ color: '#93c5fd' }, S.footerLink]} onPress={() => router.push('/(auth)/register')}>
                Đăng ký
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
