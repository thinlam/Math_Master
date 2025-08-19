// app/(tabs)/profile/EditProfile.tsx
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Theme */
import { useTheme, type Palette } from '@/theme/ThemeProvider';

/* Firebase (Firestore + Auth) */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, updateProfile, User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

/* ---------- Cloudinary config ---------- */
const CLOUD_NAME = 'djf9vnngm';                  // đổi theo cloud của bạn
const UPLOAD_PRESET = 'upload_avatars_unsigned'; // preset unsigned cho avatar
const CLOUD_FOLDER = 'avatars';                  // thư mục lưu avatar
const USE_FIXED_PUBLIC_ID = false;               // true = dùng 'avatar_<uid>'

/* ---------- UI constants ---------- */
const LEVELS = Array.from({ length: 12 }, (_, i) => `Lớp ${i + 1}`);

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [user, setUser] = useState<User | null>(auth?.currentUser ?? null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState<string>('');
  const [level, setLevel] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string | undefined>(undefined);
  const [localAvatar, setLocalAvatar] = useState<string | null>(null);

  // cache-buster để ép <Image> tải ảnh mới
  const [imgVersion, setImgVersion] = useState(0);

  useFocusEffect(
    useCallback(() => {
      const unsub = onAuthStateChanged(auth, async (u) => {
        setUser(u);
        if (!u) {
          setLoading(false);
          return;
        }
        try {
          setEmail(u.email ?? '');
          const snap = await getDoc(doc(db, 'users', u.uid));
          const data = snap.data() || {};
          setName((data?.name as string) || u.displayName || '');
          setLevel((data?.level as string) || '');
          setPhotoURL((data?.photoURL as string) || u.photoURL || undefined);
        } catch (e) {
          Alert.alert('Lỗi', 'Không tải được dữ liệu hồ sơ.');
        } finally {
          setLoading(false);
        }
      });
      return () => unsub && unsub();
    }, [])
  );

  // Có thay đổi khi: đổi tên / đổi level / chọn ảnh mới
  const hasChanges = useMemo(() => {
    if (!user || loading) return false;
    return name.trim().length > 0 || level.length > 0 || !!localAvatar;
  }, [user, loading, name, level, localAvatar]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Cần quyền', 'Hãy cấp quyền truy cập thư viện ảnh.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });
      if (!result.canceled && result.assets?.length) {
        setLocalAvatar(result.assets[0].uri);
      }
    } catch {
      Alert.alert('Lỗi', 'Không chọn được ảnh.');
    }
  };

  /** Upload ảnh lên Cloudinary, trả về secure_url */
  const uploadAvatarToCloudinary = async (uri: string, publicId?: string): Promise<string> => {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const rnFile: any = { uri, name: `avatar.${ext}`, type: 'image/jpeg' };

    const form = new FormData();
    form.append('file', rnFile as any);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', CLOUD_FOLDER);
    if (publicId) form.append('public_id', publicId);

    const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
    const resp = await fetch(endpoint, { method: 'POST', body: form });

    if (!resp.ok) {
      const text = await resp.text();
      console.log('Cloudinary status:', resp.status);
      console.log('Cloudinary response:', text);
      throw new Error(`Cloudinary upload failed: ${resp.status}`);
    }

    const json = await resp.json();
    return json.secure_url as string;
  };

  const handleSave = async () => {
    if (!user) return;
    const n = name.trim();
    if (!n) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập Họ & Tên.');
      return;
    }

    setSaving(true);
    try {
      let newPhotoURL = photoURL;

      // Nếu có chọn ảnh mới → upload Cloudinary
      if (localAvatar) {
        if (USE_FIXED_PUBLIC_ID) {
          const publicId = `avatar_${user.uid}`;
          newPhotoURL = await uploadAvatarToCloudinary(localAvatar, publicId);
        } else {
          newPhotoURL = await uploadAvatarToCloudinary(localAvatar);
        }
        setPhotoURL(newPhotoURL);
      }

      // Cập nhật Auth profile
      await updateProfile(user, { displayName: n, photoURL: newPhotoURL || null });

      // Reload để đồng bộ currentUser sang giá trị mới
      await auth.currentUser?.reload();
      setUser(auth.currentUser);

      // Lưu Firestore
      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email ?? email,
          name: n,
          level: level || null,
          photoURL: newPhotoURL || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Làm mới cache hiển thị & bỏ local preview
      setImgVersion((v) => v + 1);
      setLocalAvatar(null);

      Alert.alert('Thành công', 'Đã lưu hồ sơ.');
      router.back();
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể lưu hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + 16 }]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <ActivityIndicator size="large" />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Đang tải hồ sơ...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: palette.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          disabled={saving || !hasChanges}
          onPress={handleSave}
          style={[
            styles.saveBtn,
            { backgroundColor: saving || !hasChanges ? `${palette.text}${palette.statIconBgAlpha}` : palette.brandSoft },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={palette.editBtnText} />
          ) : (
            <Text style={{ color: palette.editBtnText, fontWeight: '700' }}>Lưu</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity onPress={pickImage} activeOpacity={0.8} style={{ position: 'relative' }}>
            <Image
              source={
                localAvatar
                  ? { uri: localAvatar }
                  : photoURL
                  ? { uri: `${photoURL}?t=${imgVersion}` } // cache-buster
                  : require('@/assets/images/icon.png')
              }
              style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: palette.cardBorder }}
              resizeMode="cover"
            />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: palette.brandSoft,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: palette.bg,
              }}
            >
              <Ionicons name="camera" size={18} color={palette.editBtnText} />
            </View>
          </TouchableOpacity>
          <Text style={{ color: palette.textMuted, marginTop: 8 }}>Nhấn để đổi ảnh đại diện</Text>
        </View>

        {/* Email (read-only) */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: palette.textMuted, marginBottom: 8 }}>Email</Text>
          <View style={[styles.inputReadonly, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Text style={{ color: palette.textFaint }}>{email || user?.email || '—'}</Text>
          </View>
        </View>

        {/* Họ & Tên */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ color: palette.textMuted, marginBottom: 8 }}>Họ & Tên</Text>
          <View style={[styles.inputWrap, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
            <Ionicons name="person" size={18} color={palette.textMuted} />
            <TextInput
              placeholder="Nhập họ tên"
              placeholderTextColor={palette.textMuted}
              value={name}
              onChangeText={setName}
              style={{ color: palette.text, flex: 1, fontSize: 16 }}
              autoCapitalize="words"
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Chọn Lớp */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: palette.textMuted, marginBottom: 8 }}>Lớp hiện tại</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {LEVELS.map((lv) => {
                const active = level === lv;
                return (
                  <TouchableOpacity
                    key={lv}
                    onPress={() => setLevel(lv)}
                    style={{
                      paddingHorizontal: 14,
                      height: 40,
                      borderRadius: 20,
                      borderWidth: active ? 1 : 1,
                      borderColor: active ? palette.brandSoft : palette.cardBorder,
                      backgroundColor: active ? palette.brandSoft : palette.card,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: active ? palette.editBtnText : palette.textFaint, fontWeight: active ? '700' : '500' }}>
                      {lv}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <Text style={{ color: palette.textMuted, marginTop: 6 }}>
          Chọn đúng lớp để hệ thống gợi ý bài học phù hợp.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/* ---------------- Styles theo theme ---------------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    fill: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg },
    header: {
      paddingBottom: 12,
      paddingHorizontal: 16,
      backgroundColor: p.bg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${p.text}${p.statIconBgAlpha}`,
    },
    headerTitle: { color: p.text, fontSize: 18, fontWeight: '700' },
    saveBtn: {
      paddingHorizontal: 16,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },

    inputReadonly: {
      height: 48,
      borderRadius: 14,
      paddingHorizontal: 14,
      justifyContent: 'center',
      borderWidth: 1,
    },
    inputWrap: {
      height: 52,
      borderRadius: 14,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
    },

    loadingText: { color: p.text },
  });
}
