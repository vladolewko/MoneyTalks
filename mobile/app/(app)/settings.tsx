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
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { apiFetch } from '../../src/api';
import { exportTransactionsCSV, importTransactionsCSV } from '../../src/utils/exportCSV';
import type { Paginated, Transaction } from '../../src/types';

// Configure notifications to show even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  } as Notifications.NotificationBehavior),
});

export default function SettingsScreen() {
  const { user, token, signOut } = useAuth();
  const { colors: c, mode, toggle } = useTheme();
  const router = useRouter();
  const topPad = (Constants.statusBarHeight ?? 0) + 8;
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    if (!token) return;
    setExporting(true);
    try {
      const res = await apiFetch<Paginated<Transaction>>('/transactions?per_page=1000', { token });
      if (!res.data.length) {
        Alert.alert('Немає даних', 'Додай першу операцію перед експортом.');
        return;
      }
      await exportTransactionsCSV(res.data);
    } catch (e) {
      Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося експортувати');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!token) return;
    setImporting(true);
    try {
      const result = await importTransactionsCSV();
      if (!result) return; // user cancelled

      if (result.rows.length === 0) {
        Alert.alert(
          'Нічого не імпортовано',
          result.errors.length
            ? `Помилки:\n${result.errors.slice(0, 5).join('\n')}`
            : 'Файл не містить валідних рядків.',
        );
        return;
      }

      // Post each row to the API
      let created = 0;
      let failed = 0;
      for (const row of result.rows) {
        try {
          await apiFetch('/transactions', {
            method: 'POST', token,
            body: JSON.stringify(row),
          });
          created++;
        } catch {
          failed++;
        }
      }

      const summary = [
        `✓ Імпортовано: ${created}`,
        failed > 0 ? `✗ Не вдалося: ${failed}` : null,
        result.skipped > 0 ? `⚠ Пропущено: ${result.skipped}` : null,
      ].filter(Boolean).join('\n');

      Alert.alert('Імпорт завершено', summary);
    } catch (e) {
      Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося імпортувати');
    } finally {
      setImporting(false);
    }
  };

  const testNotification = async () => {
    if (!token) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Доступ заборонено', 'Дозвольте сповіщення в налаштуваннях пристрою.');
      return;
    }
    try {
      const res = await apiFetch<Paginated<Transaction>>('/transactions?per_page=1', { token });
      const tx = res.data[0];
      if (!tx) { Alert.alert('Порожньо', 'Немає транзакцій для показу.'); return; }
      const isIncome = tx.type === 'income';
      const amount = new Intl.NumberFormat('uk-UA', { style: 'currency', currency: tx.currency, maximumFractionDigits: 0 }).format(Number(tx.amount));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isIncome ? '💚 Нове надходження' : '🔴 Нова витрата',
          body: `${isIncome ? '+' : '−'}${amount} · ${tx.category || 'Без категорії'}`,
          sound: true,
        },
        trigger: null,
      });
    } catch (e) {
      Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося завантажити');
    }
  };

  type SettingRow = { icon: string; title: string; sub?: string; onPress?: () => void; right?: 'chevron' };

  const sections: { title: string; rows: SettingRow[] }[] = [
    {
      title: 'Акаунт',
      rows: [
        { icon: '👤', title: 'Профіль', sub: user?.name ?? user?.email ?? '—', onPress: () => router.push('/(app)/profile'), right: 'chevron' },
      ],
    },
    {
      title: 'Дані',
      rows: [
        { icon: '📤', title: 'Експорт у CSV', sub: 'Завантажити всі операції', onPress: handleExport, right: 'chevron' },
        { icon: '📥', title: 'Імпорт з CSV', sub: 'Завантажити операції з файлу', onPress: handleImport, right: 'chevron' },
      ],
    },
    {
      title: 'Сповіщення',
      rows: [
        { icon: '🔔', title: 'Тест сповіщення', sub: 'Показати останню операцію', onPress: testNotification, right: 'chevron' },
      ],
    },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: topPad + 8, paddingBottom: 48 }}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {sections.map(({ title, rows }) => (
        <View key={title} style={{ marginBottom: 24 }}>
          <Text style={{
            color: c.hint, fontSize: 11, fontWeight: '700',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
          }}>{title}</Text>
          <View style={{
            backgroundColor: c.card, borderRadius: 20,
            borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden',
          }}>
            {rows.map((row, i) => {
              const isExportRow = row.title === 'Експорт у CSV';
              const isImportRow = row.title === 'Імпорт з CSV';
              const isLoading = (isExportRow && exporting) || (isImportRow && importing);
              return (
                <Pressable
                  key={i}
                  onPress={isLoading ? undefined : row.onPress}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center',
                    padding: 16, gap: 14,
                    borderBottomWidth: i < rows.length - 1 ? 1 : 0,
                    borderBottomColor: c.separator,
                    backgroundColor: pressed ? c.chipBg : 'transparent',
                    opacity: isLoading ? 0.6 : 1,
                  })}
                >
                  <View style={{
                    width: 38, height: 38, borderRadius: 11,
                    backgroundColor: c.chipBg,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isLoading
                      ? <ActivityIndicator size="small" color={c.accent} />
                      : <Text style={{ fontSize: 18 }}>{row.icon}</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{row.title}</Text>
                    {row.sub && <Text style={{ color: c.hint, fontSize: 12, marginTop: 2 }}>
                      {isLoading
                        ? (isImportRow ? 'Вибір файлу...' : 'Завантаження даних...')
                        : row.sub}
                    </Text>}
                  </View>
                  {row.right === 'chevron' && !isLoading && <Text style={{ color: c.hint, fontSize: 18 }}>›</Text>}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {/* Appearance */}
      <Text style={{ color: c.hint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Вигляд</Text>
      <View style={{ backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, padding: 16, marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: c.chipBg, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 18 }}>{mode === 'dark' ? '🌙' : '☀️'}</Text>
            </View>
            <View>
              <Text style={{ color: c.text, fontWeight: '600', fontSize: 15 }}>{mode === 'dark' ? 'Темна тема' : 'Світла тема'}</Text>
              <Text style={{ color: c.hint, fontSize: 12, marginTop: 2 }}>Кольорова схема</Text>
            </View>
          </View>
          <Switch
            value={mode === 'dark'}
            onValueChange={toggle}
            trackColor={{ false: c.chipBg, true: c.accentSubtle }}
            thumbColor={mode === 'dark' ? c.accent : c.hint}
          />
        </View>
      </View>

      {/* About */}
      <Text style={{ color: c.hint, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Про додаток</Text>
      <View style={{
        backgroundColor: c.card, borderRadius: 20,
        borderWidth: 1, borderColor: c.cardBorder,
        padding: 16, marginBottom: 28,
      }}>
        {[
          { label: 'Версія', value: '1.0.0' },
          { label: 'ID акаунта', value: `#${user?.id ?? '—'}` },
          { label: 'Email', value: user?.email ?? '—' },
        ].map(({ label, value }, i, arr) => (
          <View key={label} style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            paddingVertical: 12,
            borderBottomWidth: i < arr.length - 1 ? 1 : 0,
            borderBottomColor: c.separator,
          }}>
            <Text style={{ color: c.subtext, fontSize: 14 }}>{label}</Text>
            <Text style={{ color: c.hint, fontSize: 14, fontWeight: '500' }}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Logout */}
      <Pressable
        onPress={() => Alert.alert('Вийти з акаунта?', 'Токен буде відкликано.', [
          { text: 'Скасувати', style: 'cancel' },
          { text: 'Вийти', style: 'destructive', onPress: signOut },
        ])}
        style={({ pressed }) => ({
          borderWidth: 1, borderColor: c.danger,
          borderRadius: 16, paddingVertical: 17,
          alignItems: 'center',
          backgroundColor: pressed ? c.dangerSubtle : 'transparent',
        })}
      >
        <Text style={{ color: c.danger, fontWeight: '700', fontSize: 16 }}>Вийти з акаунта</Text>
      </Pressable>

      <Pressable onPress={() => router.back()} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <Text style={{ color: c.hint, fontWeight: '600', fontSize: 14 }}>← Назад</Text>
      </Pressable>
    </ScrollView>
  );
}
