import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import type { EntryType, Transaction } from '../../src/types';

const QUICK_CATEGORIES: Record<EntryType, string[]> = {
  expense: ['Продукти', 'Кафе', 'Транспорт', 'Дім', 'Здоровʼя', 'Одяг', 'Розваги', 'Інше'],
  income: ['Зарплата', 'Фриланс', 'Переказ', 'Подарунок', 'Кешбек', 'Повернення', 'Інше'],
};

function pad(n: number) { return String(n).padStart(2, '0'); }
function toLocal(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function normalizeDate(v: string): string | null {
  const raw = v.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export default function NewTransactionScreen() {
  const { token } = useAuth();
  const { colors: c, mode } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [loadingTx, setLoadingTx] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(toLocal(new Date()));

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      try {
        const res = await apiFetch<TxList>(`/transactions?per_page=200`, { token });
        const tx = (res as any).data?.find((t: Transaction) => String(t.id) === id);
        if (tx) {
          setType(tx.type);
          setAmount(String(Number(tx.amount)));
          setCategory(tx.category ?? '');
          setNote(tx.note ?? '');
          setOccurredAt(toLocal(new Date(tx.occurred_at)));
        }
      } finally {
        setLoadingTx(false);
      }
    })();
  }, [id, token]);

  const submit = useCallback(async () => {
    if (!token) return;
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Перевірте суму', 'Введіть коректну суму більше нуля.');
      return;
    }
    const normDate = normalizeDate(occurredAt);
    if (occurredAt.trim() && !normDate) {
      Alert.alert('Перевірте дату', 'Використайте формат YYYY-MM-DDTHH:MM.');
      return;
    }
    setSaving(true);
    try {
      const body = JSON.stringify({
        type, amount: parsedAmount, currency: 'UAH',
        category: category.trim() || null,
        note: note.trim() || null,
        occurred_at: normDate,
      });
      if (id) {
        await apiFetch(`/transactions/${id}`, { method: 'PUT', token, body });
      } else {
        await apiFetch('/transactions', { method: 'POST', token, body });
        setAmount(''); setCategory(''); setNote(''); setOccurredAt(toLocal(new Date()));
      }
      router.replace('/(app)/transactions');
    } catch (e) {
      Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося зберегти');
    } finally {
      setSaving(false);
    }
  }, [amount, category, id, note, occurredAt, router, token, type]);

  if (loadingTx) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const isExpense = type === 'expense';
  const typeColor = isExpense ? c.orange : c.green;
  const typeBg = isExpense ? c.orangeSubtle : c.greenSubtle;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        {/* Type toggle */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 28 }}>
          {(['expense', 'income'] as EntryType[]).map(t => {
            const active = type === t;
            const color = t === 'expense' ? c.orange : c.green;
            const bg = t === 'expense' ? c.orangeSubtle : c.greenSubtle;
            return (
              <Pressable
                key={t}
                onPress={() => { setType(t); if (!category.trim()) setCategory(QUICK_CATEGORIES[t][0] ?? ''); }}
                style={{
                  flex: 1, paddingVertical: 20, borderRadius: 22,
                  alignItems: 'center', gap: 10,
                  backgroundColor: active ? bg : c.card,
                  borderWidth: 1.5,
                  borderColor: active ? color : c.cardBorder,
                }}
              >
                {/* Arrow badge icon */}
                <View style={{
                  width: 48, height: 48, borderRadius: 16,
                  backgroundColor: active ? color : c.chipBg,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{
                    fontSize: 22,
                    fontWeight: '900',
                    color: active ? '#ffffff' : c.subtext,
                    lineHeight: 26,
                  }}>
                    {t === 'expense' ? '↓' : '↑'}
                  </Text>
                </View>
                <Text style={{
                  color: active ? color : c.subtext,
                  fontWeight: '700', fontSize: 15, letterSpacing: -0.2,
                }}>
                  {t === 'expense' ? 'Витрата' : 'Дохід'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Amount hero */}
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ color: c.hint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Сума · UAH</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={c.hint}
            style={{
              fontSize: 52, fontWeight: '800', letterSpacing: -2,
              color: typeColor, textAlign: 'center',
              width: '100%', paddingVertical: 8,
              backgroundColor: typeBg,
              borderRadius: 20, paddingHorizontal: 16,
            }}
          />
        </View>

        {/* Category */}
        <Text style={{ color: c.hint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Категорія</Text>
        <TextInput
          value={category}
          onChangeText={setCategory}
          placeholder="Наприклад, Продукти"
          placeholderTextColor={c.hint}
          style={{
            borderWidth: 1, borderColor: c.cardBorder, borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 13, color: c.text,
            backgroundColor: c.card, marginBottom: 10, fontSize: 16,
          }}
        />
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 20, paddingTop: 2 }}
        >
          {QUICK_CATEGORIES[type].map(chip => (
            <Pressable
              key={chip}
              onPress={() => setCategory(chip)}
              style={{
                paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
                backgroundColor: category.trim() === chip ? c.accent : c.chipBg,
                borderWidth: 1,
                borderColor: category.trim() === chip ? c.accent : c.cardBorder,
              }}
            >
              <Text style={{
                color: category.trim() === chip ? c.accentText : c.subtext,
                fontWeight: '600', fontSize: 13,
              }}>{chip}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Note */}
        <Text style={{ color: c.hint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Нотатка</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Короткий контекст (необов'язково)"
          placeholderTextColor={c.hint}
          style={{
            borderWidth: 1, borderColor: c.cardBorder, borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 13, color: c.text,
            backgroundColor: c.card, marginBottom: 20, fontSize: 16,
            minHeight: 80, textAlignVertical: 'top',
          }}
          multiline
        />

        {/* Date */}
        <Text style={{ color: c.hint, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>Дата і час</Text>
        <TextInput
          value={occurredAt}
          onChangeText={setOccurredAt}
          placeholder="2026-05-18T12:30"
          placeholderTextColor={c.hint}
          style={{
            borderWidth: 1, borderColor: c.cardBorder, borderRadius: 14,
            paddingHorizontal: 16, paddingVertical: 13, color: c.text,
            backgroundColor: c.card, marginBottom: 10, fontSize: 16,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 32 }}>
          {[
            { label: 'Зараз', fn: () => setOccurredAt(toLocal(new Date())) },
            { label: 'Вчора 18:00', fn: () => { const y = new Date(); y.setDate(y.getDate() - 1); y.setHours(18, 0, 0, 0); setOccurredAt(toLocal(y)); } },
          ].map(({ label, fn }) => (
            <Pressable key={label} onPress={fn} style={{
              paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
              backgroundColor: c.chipBg, borderWidth: 1, borderColor: c.cardBorder,
            }}>
              <Text style={{ color: c.subtext, fontSize: 13, fontWeight: '600' }}>{label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Submit */}
        <Pressable
          onPress={submit}
          disabled={saving}
          style={({ pressed }) => ({
            backgroundColor: c.accent,
            borderRadius: 18, paddingVertical: 18,
            alignItems: 'center',
            opacity: saving || pressed ? 0.8 : 1,
          })}
        >
          {saving
            ? <ActivityIndicator color={c.accentText} />
            : <Text style={{ color: c.accentText, fontWeight: '800', fontSize: 17, letterSpacing: -0.3 }}>
                {isEdit ? 'Оновити операцію' : 'Зберегти операцію'}
              </Text>}
        </Pressable>

        {isEdit && (
          <Pressable onPress={() => router.back()} style={{ marginTop: 16, alignItems: 'center', paddingVertical: 10 }}>
            <Text style={{ color: c.hint, fontWeight: '600', fontSize: 14 }}>Скасувати</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type TxList = { data: Transaction[] };
