// app/(tabs)/Library/Item.tsx  ← (nên đặt hoa "Library" cho khớp Tab name)
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

/* docx để xuất Word */
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';

/* Theme */
import { useTheme, type Palette } from '@/theme/ThemeProvider';

/* Firebase */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

type LibraryItem = {
  id?: string;
  title: string;
  subtitle?: string;
  grade: number;
  tags?: string[];
  content: string;      // nội dung văn bản
  updatedAt?: any;
};

/* --- Helper tránh ký tự lạ khi đặt tên file --- */
function safeFilename(name: string, ext: 'docx' | 'txt') {
  const base = (name || 'tailieu')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  return `${base || 'tailieu'}.${ext}`;
}

/* --- Import động expo-sharing để tránh lỗi bundling khi chưa cài --- */
let SharingModule: any | null = null;
async function ensureSharing() {
  if (SharingModule) return SharingModule;
  try {
    SharingModule = await import('expo-sharing');
    return SharingModule;
  } catch {
    return null;
  }
}

export default function LibraryItemScreen() {
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const { id } = useLocalSearchParams<{ id?: string }>();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(auth?.currentUser ?? null);
  const [item, setItem] = useState<LibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fav, setFav] = useState(false);

  /* ----- Auth watcher ----- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setFirebaseUser(u));
    return () => unsub && unsub();
  }, []);

  /* ----- Fetch item ----- */
  const fetchItem = useCallback(async () => {
    if (!id) {
      Alert.alert('Thiếu tham số', 'Không có ID tài liệu.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'library', id));
      if (!snap.exists()) {
        Alert.alert('Không tìm thấy', 'Tài liệu đã bị xoá hoặc không tồn tại.');
        setItem(null);
      } else {
        setItem({ id: snap.id, ...(snap.data() as any) });
      }
    } catch (e) {
      console.warn('fetch item error', e);
      Alert.alert('Lỗi', 'Không tải được tài liệu.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  /* ----- Check favourite ----- */
  const checkFavourite = useCallback(async () => {
    if (!firebaseUser || !id) return setFav(false);
    try {
      const favSnap = await getDoc(doc(db, 'users', firebaseUser.uid, 'favorites', id));
      setFav(favSnap.exists());
    } catch {
      setFav(false);
    }
  }, [firebaseUser, id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  useEffect(() => {
    checkFavourite();
  }, [checkFavourite]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItem();
    await checkFavourite();
    setRefreshing(false);
  }, [fetchItem, checkFavourite]);

  /* ----- Chuẩn hoá đoạn văn cho hiển thị ----- */
  const paragraphs = useMemo(() => {
    const raw = item?.content ?? '';
    return raw.replace(/\r\n/g, '\n').split(/\n{2,}/).map(s => s.trim()).filter(Boolean);
  }, [item?.content]);

  /* ----- Actions ----- */
  const shareItem = useCallback(async () => {
    if (!item) return;
    const snippet = (item.content || '').slice(0, 300);
    try {
      await Share.share({
        title: item.title,
        message: `${item.title}\n${item.subtitle ? item.subtitle + '\n' : ''}${snippet}${snippet.length === 300 ? '…' : ''}`,
      });
    } catch {}
  }, [item]);

  const copyContent = useCallback(async () => {
    if (!item?.content) return;
    await Clipboard.setStringAsync(item.content);
    Alert.alert('Đã sao chép', 'Nội dung đã được sao chép vào clipboard.');
  }, [item?.content]);

  const toggleFavourite = useCallback(async () => {
    if (!firebaseUser) {
      Alert.alert('Cần đăng nhập', 'Hãy đăng nhập để dùng Yêu thích.');
      return;
    }
    if (!id || !item) return;
    const favRef = doc(db, 'users', firebaseUser.uid, 'favorites', id);
    try {
      if (fav) {
        await deleteDoc(favRef);
        setFav(false);
      } else {
        await setDoc(favRef, {
          itemId: id,
          title: item.title,
          subtitle: item.subtitle ?? '',
          grade: item.grade,
          snippet: (item.content || '').slice(0, 140),
          createdAt: serverTimestamp(),
        });
        setFav(true);
      }
    } catch (e) {
      console.warn('fav error', e);
      Alert.alert('Lỗi', 'Không thể cập nhật Yêu thích.');
    }
  }, [firebaseUser, id, item, fav]);

  /* ----- Xuất Word / fallback TXT ----- */
  const downloadWord = useCallback(async () => {
    if (!item) return;

    try {
      const docx = new Document({
        sections: [
          {
            children: [
              new Paragraph({ text: item.title || 'Tài liệu', heading: HeadingLevel.HEADING_1 }),
              ...(item.subtitle ? [new Paragraph({ text: item.subtitle }), new Paragraph({ text: '' })] : []),
              ...((item.content || '')
                .replace(/\r\n/g, '\n')
                .split(/\n{2,}/)
                .map((p) =>
                  new Paragraph({
                    children: [new TextRun({ text: p.trim() })],
                    spacing: { after: 240 },
                  })
                )),
            ],
          },
        ],
      });

      const base64 = await Packer.toBase64String(docx);
      const fileUri = FileSystem.cacheDirectory + safeFilename(item.title, 'docx');
      await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });

      const Sharing = await ensureSharing();
      if (Sharing && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Đã tạo file', `Đường dẫn: ${fileUri}`);
      }
    } catch (e) {
      console.warn('Create DOCX failed, fallback .txt', e);
      try {
        const txtUri = FileSystem.cacheDirectory + safeFilename(item.title, 'txt');
        const content = `${item.title}\n${item.subtitle ?? ''}\n\n${item.content || ''}`;
        await FileSystem.writeAsStringAsync(txtUri, content, { encoding: FileSystem.EncodingType.UTF8 });

        const Sharing = await ensureSharing();
        if (Sharing && (await Sharing.isAvailableAsync())) {
          await Sharing.shareAsync(txtUri);
        } else {
          Alert.alert('Đã tạo file', `Đường dẫn: ${txtUri}`);
        }
      } catch (e2) {
        console.error('TXT fallback failed', e2);
        Alert.alert('Lỗi', 'Không thể tạo file.');
      }
    }
  }, [item]);

  /* ----- UI states ----- */
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe]}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={[styles.muted, { marginTop: 8 }]}>Đang tải tài liệu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <View style={[styles.center, { padding: 16 }]}>
          <MaterialCommunityIcons name="file-alert-outline" size={40} color={palette.danger} />
          <Text style={{ color: palette.danger, marginTop: 10, textAlign: 'center' }}>
            Không tìm thấy tài liệu.
          </Text>
          <TouchableOpacity
            onPress={() => (/* về tab Library; nếu không back được thì push */ (router as any).canGoBack?.() ? router.back() : router.push('/(tabs)/Library'))}
            style={[styles.btnBase, { backgroundColor: palette.brandSoft }]}
          >
            <Text style={{ color: palette.editBtnText, fontWeight: '700' }}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => ((router as any).canGoBack?.() ? router.back() : router.push('/(tabs)/Library'))}
          style={styles.headerIcon}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {item.title}
          </Text>
          <Text numberOfLines={1} style={styles.headerSub}>
            Lớp {item.grade} • Văn bản
          </Text>
        </View>

        <TouchableOpacity onPress={shareItem} style={styles.headerIcon}>
          <Ionicons name="share-social-outline" size={18} color={palette.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleFavourite} style={styles.headerIcon}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? palette.danger : palette.text} />
        </TouchableOpacity>
      </View>

      {/* Body */}
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 24, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />}
      >
        {/* Info Card */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={styles.iconSquare}>
              <MaterialCommunityIcons name="file-document-outline" size={28} color={palette.brandSoft} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{item.title}</Text>
              {!!item.subtitle && <Text style={styles.sub}>{item.subtitle}</Text>}
              <View style={styles.tagRow}>
                <View style={styles.tagPill}>
                  <Text style={styles.tagText}>Lớp {item.grade}</Text>
                </View>
                {!!item.tags?.length &&
                  item.tags.slice(0, 4).map((t, i) => (
                    <View key={i} style={[styles.tagPill, { backgroundColor: palette.bg, borderColor: palette.cardBorder }]}>
                      <Text style={[styles.tagText, { color: palette.link }]}>#{t}</Text>
                    </View>
                  ))}
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
            <TouchableOpacity onPress={copyContent} style={[styles.actionBtn, { backgroundColor: palette.brandSoft }]}>
              <Ionicons name="copy-outline" size={18} color={palette.editBtnText} />
              <Text style={[styles.actionText, { color: palette.editBtnText }]}>Sao chép nội dung</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={downloadWord} style={[styles.actionBtn, { backgroundColor: '#34D399', borderColor: '#34D399' }]}>
              <Ionicons name="download-outline" size={18} color="#111827" />
              <Text style={[styles.actionText, { color: '#111827' }]}>Tải về (Word)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View style={styles.contentCard}>
          {paragraphs.length === 0 ? (
            <Text style={[styles.sub, { fontStyle: 'italic' }]}>— Không có nội dung —</Text>
          ) : (
            paragraphs.map((p, idx) => (
              <Text key={idx} style={styles.contentText}>
                {p}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Styles theo theme ---------------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    header: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: p.bg,
      borderBottomWidth: 1,
      borderBottomColor: p.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${p.text}${p.statIconBgAlpha}`,
    },
    headerTitle: { color: p.text, fontWeight: '800', fontSize: 16 },
    headerSub: { color: p.textMuted, fontSize: 12 },

    btnBase: {
      marginTop: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },

    card: {
      backgroundColor: p.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.cardBorder,
      padding: 14,
      gap: 10,
    },
    iconSquare: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: p.pillBg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { color: p.text, fontWeight: '800', fontSize: 16 },
    sub: { color: p.textMuted, marginTop: 2 },

    tagRow: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    tagPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: p.pillBg,
      borderWidth: 1,
      borderColor: p.pillBorder,
    },
    tagText: { color: p.textFaint, fontSize: 12, fontWeight: '600' },

    actionBtn: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    actionText: { fontWeight: '800' },

    contentCard: {
      backgroundColor: p.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.cardBorder,
      padding: 16,
    },
    contentText: { color: p.text, fontSize: 16, lineHeight: 24, marginBottom: 12 },

    muted: { color: p.textMuted },
  });
}
