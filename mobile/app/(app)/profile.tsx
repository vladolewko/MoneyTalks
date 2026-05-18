import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';

export default function ProfileScreen() {
  const { user, token, signIn } = useAuth();
  const { colors: c, mode, toggle } = useTheme();
  const router = useRouter();
  const topPad = (Constants.statusBarHeight ?? 0) + 8;

  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const saveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Помилка', "Ім'я не може бути порожнім."); return; }
    if (!token) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ id: number; name: string; email: string }>('/profile', {
        method: 'PATCH', token, body: JSON.stringify({ name: trimmed }),
      });
      signIn(token, res);
      Alert.alert('Збережено', "Ім'я успішно оновлено.");
    } catch (e) {
      Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося зберегти');
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name ?? user?.email ?? '?')
    .split(' ')
    .slice(0, 2)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPad + 8, paddingBottom: 48 }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Avatar */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <View style={{
          width: 90, height: 90, borderRadius: 28,
          backgroundColor: c.accentSubtle,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
          borderWidth: 2, borderColor: c.accent,
        }}>
          <Text style={{ fontSize: 32, fontWeight: '800', color: c.accent }}>{initials}</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>{user?.name ?? '—'}</Text>
        <Text style={{ fontSize: 14, color: c.hint, marginTop: 4 }}>{user?.email ?? '—'}</Text>
      </View>

      {/* Form card */}
      <View style={{ backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.cardBorder, padding: 20, marginBottom: 16 }}>
        {/* Theme toggle inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 18, marginBottom: 18, borderBottomWidth: 1, borderBottomColor: c.separator }}>
          <View>
            <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{mode === 'dark' ? 'Темна тема' : 'Світла тема'}</Text>
            <Text style={{ color: c.hint, fontSize: 12, marginTop: 2 }}>Кольорова схема</Text>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ false: c.chipBg, true: c.accentSubtle }}
            thumbColor={mode === 'dark' ? c.accent : c.hint}
          />
        </View>

        {/* Name field */}
        <Text style={{ color: c.hint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Ім'я</Text>
        <TextInput
          style={{
            borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
            paddingHorizontal: 14, paddingVertical: 13, color: c.text,
            backgroundColor: c.inputBg, fontSize: 16, marginBottom: 20,
          }}
          value={name}
          onChangeText={setName}
          placeholder="Ваше ім'я"
          placeholderTextColor={c.hint}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={saveName}
        />

        {/* Email readonly */}
        <Text style={{ color: c.hint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 }}>Email</Text>
        <View style={{
          borderWidth: 1, borderColor: c.cardBorder, borderRadius: 12,
          paddingHorizontal: 14, paddingVertical: 13,
          backgroundColor: c.inputBg,
        }}>
          <Text style={{ fontSize: 16, color: c.subtext }}>{user?.email ?? '—'}</Text>
        </View>
        <Text style={{ color: c.hint, fontSize: 12, marginTop: 6 }}>Email не можна змінити</Text>
      </View>

      <Pressable
        onPress={saveName}
        disabled={saving}
        style={({ pressed }) => ({
          backgroundColor: c.accent,
          borderRadius: 16, paddingVertical: 17,
          alignItems: 'center',
          opacity: saving || pressed ? 0.8 : 1,
        })}
      >
        {saving
          ? <ActivityIndicator color={c.accentText} />
          : <Text style={{ color: c.accentText, fontWeight: '700', fontSize: 16, letterSpacing: -0.2 }}>Зберегти зміни</Text>}
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ color: c.hint, fontWeight: '600', fontSize: 14 }}>← Назад</Text>
      </Pressable>
    </ScrollView>
  );
}
