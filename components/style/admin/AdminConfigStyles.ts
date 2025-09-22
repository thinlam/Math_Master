import { StyleSheet } from 'react-native';

export const AdminConfigStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },

  headerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerBtn: { padding: 8, marginRight: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },

  content: { paddingHorizontal: 16 },

  // cards
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  cardTitle: { color: '#e5e7eb', fontWeight: '800', marginBottom: 10 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowLabel: { color: '#e5e7eb', fontWeight: '700' },
  rowRight: { marginLeft: 12, flexShrink: 1 },

  rowTopWrap: { paddingVertical: 6 },
  rowTopLabel: { color: '#e5e7eb', fontWeight: '700', marginBottom: 6 },

  hint: { color: '#94a3b8', marginTop: 6, fontSize: 12 },

  chipBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.45)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  chipText: { color: '#93c5fd', fontWeight: '700' },

  inputInline: { color: '#fff', flex: 1, textAlign: 'right' },
  inputMultiline: {
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  saveBtn: {
    marginTop: 4,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: 'rgba(59,130,246,0.35)' },
  saveText: { color: '#fff', fontWeight: '800' },
});
