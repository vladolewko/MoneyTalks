import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function MenuButton() {
  const [open, setOpen] = useState(false);
  const { colors, mode, toggle } = useTheme();
  const router = useRouter();
  const c = colors;

  const items = [
    {
      label: 'Профіль',
      sub: 'Ім\'я та налаштування',
      emoji: '👤',
      onPress: () => { setOpen(false); router.push('/(app)/profile'); },
    },
    {
      label: 'Налаштування',
      sub: 'Сповіщення та акаунт',
      emoji: '⚙️',
      onPress: () => { setOpen(false); router.push('/(app)/settings'); },
    },
    {
      label: mode === 'dark' ? 'Світла тема' : 'Темна тема',
      sub: mode === 'dark' ? 'Перемкнути на світлу' : 'Перемкнути на темну',
      emoji: mode === 'dark' ? '☀️' : '🌙',
      onPress: () => { toggle(); setOpen(false); },
    },
  ];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={12}
        style={[s.trigger, { backgroundColor: c.chipBg, borderColor: c.cardBorder }]}
      >
        <View style={s.dotsContainer}>
          {[0, 1, 2].map(i => (
            <View key={i} style={[s.dot, { backgroundColor: c.subtext }]} />
          ))}
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[s.menu, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => {}}>
            <View style={[s.menuHeader, { borderBottomColor: c.separator }]}>
              <Text style={[s.menuTitle, { color: c.text }]}>Меню</Text>
            </View>
            {items.map((item, i) => (
              <Pressable
                key={i}
                onPress={item.onPress}
                style={({ pressed }) => [
                  s.item,
                  i < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.separator },
                  { backgroundColor: pressed ? c.chipBg : 'transparent' },
                ]}
              >
                <View style={[s.iconBox, { backgroundColor: c.chipBg }]}>
                  <Text style={s.emoji}>{item.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.label, { color: c.text }]}>{item.label}</Text>
                  <Text style={[s.sub, { color: c.hint }]}>{item.sub}</Text>
                </View>
                <Text style={[s.chevron, { color: c.hint }]}>›</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    gap: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 3.5,
    height: 3.5,
    borderRadius: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 12,
  },
  menu: {
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 240,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 16,
  },
  menuHeader: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 18 },
  label: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 1 },
  chevron: { fontSize: 18 },
});
