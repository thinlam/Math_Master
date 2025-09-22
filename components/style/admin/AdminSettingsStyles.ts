import { StyleSheet } from 'react-native';

export const AdminSettingsStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },

  scrollContent: { paddingHorizontal: 16 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 10,
  },
  rowLabel: { color: '#e5e7eb', fontWeight: '700' },
  rowValueWrap: { marginLeft: 12 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 6 },

  btnPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  btnGhost: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.12)', borderWidth: 1,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  btnDanger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: 'rgba(239,68,68,0.4)', borderWidth: 1,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '800' },
  btnGhostText: { color: '#e5e7eb', fontWeight: '700' },
  btnDangerText: { color: '#ef4444', fontWeight: '800' },

  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999,
  },
  roleText: { fontWeight: '700', fontSize: 12 },
});
