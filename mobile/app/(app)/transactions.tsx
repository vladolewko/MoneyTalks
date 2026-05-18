import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import type { FilterType, Paginated, Transaction } from '../../src/types';

function fmt(v: number, cur = 'UAH') {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' });
}
function txTitle(item: Transaction) {
  return item.category?.trim() || (item.type === 'income' ? 'Надходження' : 'Витрата');
}

const CATEGORY_ICONS: Record<string, string> = {
  'Продукти': '🛒', 'Кафе': '☕', 'Транспорт': '🚌', 'Дім': '🏠',
  'Здоровʼя': '💊', 'Одяг': '👗', 'Розваги': '🎮', 'Зарплата': '💼',
  'Фриланс': '💻', 'Переказ': '🔄', 'Подарунок': '🎁', 'Кешбек': '💰',
  'Інше': '📦',
};
function getCategoryIcon(category: string | null | undefined, type: string) {
  if (!category) return type === 'income' ? '💼' : '💸';
  return CATEGORY_ICONS[category] ?? (type === 'income' ? '💚' : '🔴');
}

export default function TransactionsScreen() {
  const { token } = useAuth();
  const { colors: c, mode } = useTheme();
  const router = useRouter();

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(async () => {
    if (!token) return;
    const res = await apiFetch<Paginated<Transaction>>('/transactions?per_page=200', { token });
    setItems(res.data);
  }, [token]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try { setLoading(true); await load(); }
      catch { /* ignore */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const removeTx = useCallback((row: Transaction) => {
    if (!token) return;
    Alert.alert(
      'Видалити операцію?',
      `${txTitle(row)} · ${fmt(Number(row.amount), row.currency)}`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити', style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/transactions/${row.id}`, { method: 'DELETE', token });
              await load();
            } catch (e) {
              Alert.alert('Помилка', e instanceof Error ? e.message : 'Не вдалося видалити');
            }
          },
        },
      ],
    );
  }, [load, token]);

  const filtered = useMemo(
    () => filter === 'all' ? items : items.filter(i => i.type === filter),
    [filter, items],
  );

  // Group by date
  type GroupedItem = { type: 'header'; date: string } | { type: 'item'; tx: Transaction };
  const grouped = useMemo<GroupedItem[]>(() => {
    const result: GroupedItem[] = [];
    let lastDate = '';
    for (const tx of filtered) {
      const d = new Date(tx.occurred_at).toLocaleDateString('uk-UA', { day: '2-digit', month: 'long', year: 'numeric' });
      if (d !== lastDate) {
        result.push({ type: 'header', date: d });
        lastDate = d;
      }
      result.push({ type: 'item', tx });
    }
    return result;
  }, [filtered]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* Filter row */}
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        gap: 8,
      }}>
        {([
          { key: 'all' as FilterType, label: 'Усі' },
          { key: 'expense' as FilterType, label: 'Витрати' },
          { key: 'income' as FilterType, label: 'Доходи' },
        ]).map(({ key, label }) => (
          <Pressable
            key={key}
            onPress={() => setFilter(key)}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
              backgroundColor: filter === key ? c.accent : c.chipBg,
              borderWidth: 1,
              borderColor: filter === key ? c.accent : c.cardBorder,
            }}
          >
            <Text style={{
              color: filter === key ? c.accentText : c.subtext,
              fontWeight: '600', fontSize: 13,
            }}>
              {label}
            </Text>
          </Pressable>
        ))}
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => router.push('/(app)/new-transaction')}
          style={{
            width: 38, height: 38, borderRadius: 12,
            backgroundColor: c.accent,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ color: c.accentText, fontSize: 22, fontWeight: '300', lineHeight: 26 }}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : `t-${item.tx.id}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 48, marginBottom: 16 }}>✦</Text>
            <Text style={{ color: c.text, fontWeight: '600', fontSize: 17, marginBottom: 8 }}>Список порожній</Text>
            <Text style={{ color: c.hint, fontSize: 14 }}>Немає операцій для відображення</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <Text style={{ color: c.hint, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 }}>
                {item.date}
              </Text>
            );
          }
          const { tx } = item;
          return (
            <Pressable
              onPress={() => router.push({ pathname: '/(app)/new-transaction', params: { id: String(tx.id) } })}
              onLongPress={() => removeTx(tx)}
              style={({ pressed }) => ({
                flexDirection: 'row', gap: 14,
                paddingVertical: 13, paddingHorizontal: 16,
                borderRadius: 18,
                backgroundColor: pressed ? c.chipBg : c.card,
                borderWidth: 1, borderColor: c.cardBorder,
                marginBottom: 8, alignItems: 'center',
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: tx.type === 'income' ? c.greenSubtle : c.orangeSubtle,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{getCategoryIcon(tx.category, tx.type)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: '600', fontSize: 15, marginBottom: 3 }}>{txTitle(tx)}</Text>
                {tx.note ? (
                  <Text style={{ color: c.hint, fontSize: 12 }} numberOfLines={1}>{tx.note}</Text>
                ) : (
                  <Text style={{ color: c.hint, fontSize: 12 }}>{fmtDate(tx.occurred_at)}</Text>
                )}
              </View>
              <Text style={{
                color: tx.type === 'income' ? c.green : c.orange,
                fontWeight: '700', fontSize: 15, letterSpacing: -0.3,
              }}>
                {tx.type === 'income' ? '+' : '−'}{fmt(Number(tx.amount))}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
