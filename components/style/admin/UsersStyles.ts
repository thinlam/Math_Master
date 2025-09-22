import { StyleSheet } from 'react-native';

export const UsersStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },

  headerWrap: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: { color: '#fff', flex: 1 },

  roleRow: { flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  rolePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  rolePillText: {
    color: '#e5e7eb',
    textTransform: 'capitalize',
  },

  listContent: { paddingHorizontal: 16 },

  userCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  userName: { color: '#e2e8f0', fontWeight: '800' },
  userEmail: { color: '#94a3b8', marginTop: 2 },
  userDate: { color: '#64748b', marginTop: 2, fontSize: 12 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },

  btnBase: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  btnText: { fontWeight: '700' },

  deleteBtn: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  deleteText: { color: '#ef4444' },

  blockBtnRed: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.4)',
  },
  blockBtnGreen: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
  },

  emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 40 },
});
