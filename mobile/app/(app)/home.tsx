import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { apiFetch } from '../../src/api';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import type { Paginated, Stats, Transaction } from '../../src/types';

function fmt(v: number, cur = 'UAH') {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: cur, maximumFractionDigits: 0 }).format(v);
}
function fmtDate(v: string) {
  return new Date(v).toLocaleDateString('uk-UA', { day: '2-digit', month: 'short' });
}
function txTitle(item: Transaction) {
  return item.category?.trim() || (item.type === 'income' ? 'Надходження' : 'Витрата');
}

// Category emoji map
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

export default function HomeScreen() {
  const { token, user } = useAuth();
  const { colors: c, mode } = useTheme();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    const [statsRes, txRes] = await Promise.all([
      apiFetch<Stats>('/stats/summary', { token }),
      apiFetch<Paginated<Transaction>>('/transactions?per_page=6', { token }),
    ]);
    setStats(statsRes);
    setRecent(txRes.data.slice(0, 6));
  }, [token]);

  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Помилка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    try { await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Помилка'); }
    finally { setRefreshing(false); }
  };

  const net = (stats?.totals.income ?? 0) - (stats?.totals.expense ?? 0);
  const income = stats?.totals.income ?? 0;
  const expense = stats?.totals.expense ?? 0;

  const firstName = user?.name?.split(' ')[0] ?? 'друже';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {error && (
        <View style={{ margin: 16, padding: 14, borderRadius: 14, backgroundColor: c.alertBg }}>
          <Text style={{ color: c.alertText, fontSize: 13 }}>{error}</Text>
        </View>
      )}

      {/* Hero balance card */}
      <View style={{
        margin: 16,
        padding: 28,
        borderRadius: 28,
        backgroundColor: mode === 'dark' ? '#0c1822' : c.accent,
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <View style={{
          position: 'absolute', right: -30, top: -30,
          width: 160, height: 160, borderRadius: 80,
          backgroundColor: mode === 'dark' ? 'rgba(52,211,153,0.06)' : 'rgba(255,255,255,0.15)',
        }} />
        <View style={{
          position: 'absolute', right: 40, top: 60,
          width: 80, height: 80, borderRadius: 40,
          backgroundColor: mode === 'dark' ? 'rgba(52,211,153,0.04)' : 'rgba(255,255,255,0.1)',
        }} />

        <Text style={{
          color: mode === 'dark' ? c.hint : 'rgba(255,255,255,0.75)',
          fontSize: 13, fontWeight: '500', marginBottom: 4,
        }}>Привіт, {firstName} 👋</Text>

        <Text style={{
          color: mode === 'dark' ? c.subtext : 'rgba(255,255,255,0.85)',
          fontSize: 13, marginBottom: 12,
        }}>Загальний баланс</Text>

        <Text style={{
          fontSize: 44, fontWeight: '800', letterSpacing: -1.5,
          color: mode === 'dark' ? c.accent : '#fff',
          lineHeight: 52,
        }}>
          {fmt(net)}
        </Text>

        {/* Mini income/expense row */}
        <View style={{ flexDirection: 'row', marginTop: 20, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: mode === 'dark' ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 12 }}>↑</Text>
            </View>
            <View>
              <Text style={{ color: mode === 'dark' ? c.hint : 'rgba(255,255,255,0.7)', fontSize: 11 }}>Дохід</Text>
              <Text style={{ color: mode === 'dark' ? c.green : '#fff', fontWeight: '700', fontSize: 14 }}>{fmt(income)}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{
              width: 28, height: 28, borderRadius: 8,
              backgroundColor: mode === 'dark' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.2)',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Text style={{ fontSize: 12 }}>↓</Text>
            </View>
            <View>
              <Text style={{ color: mode === 'dark' ? c.hint : 'rgba(255,255,255,0.7)', fontSize: 11 }}>Витрати</Text>
              <Text style={{ color: mode === 'dark' ? c.orange : '#fff', fontWeight: '700', fontSize: 14 }}>{fmt(expense)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Quick action — full width add button */}
      <Pressable
        onPress={() => router.push('/(app)/new-transaction')}
        style={({ pressed }) => ({
          marginHorizontal: 16, marginBottom: 24,
          backgroundColor: pressed ? c.accentSubtle : c.chipBg,
          borderRadius: 18, padding: 18,
          flexDirection: 'row', alignItems: 'center', gap: 14,
          borderWidth: 1, borderColor: pressed ? c.accent : c.cardBorder,
        })}
      >
        <View style={{
          width: 42, height: 42, borderRadius: 13,
          backgroundColor: c.accentSubtle,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ color: c.accent, fontSize: 22, fontWeight: '300', lineHeight: 26 }}>+</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: c.text, fontWeight: '700', fontSize: 15, marginBottom: 2 }}>Нова операція</Text>
          <Text style={{ color: c.hint, fontSize: 12 }}>Записати дохід або витрату</Text>
        </View>
        <Text style={{ color: c.accent, fontSize: 18, fontWeight: '300' }}>›</Text>
      </Pressable>

      {/* Recent transactions */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: c.text, fontSize: 18, fontWeight: '700', letterSpacing: -0.3 }}>Останні операції</Text>
          <Pressable onPress={() => router.push('/(app)/transactions')}>
            <Text style={{ color: c.accent, fontWeight: '600', fontSize: 13 }}>Усі →</Text>
          </Pressable>
        </View>

        {recent.length === 0 ? (
          <View style={{
            padding: 40, borderRadius: 20, backgroundColor: c.card,
            borderWidth: 1, borderColor: c.cardBorder, alignItems: 'center',
          }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>✦</Text>
            <Text style={{ color: c.text, fontWeight: '600', marginBottom: 6 }}>Поки що порожньо</Text>
            <Text style={{ color: c.hint, textAlign: 'center', fontSize: 13 }}>Додай першу операцію, щоб почати відстежувати фінанси</Text>
          </View>
        ) : (
          recent.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() => router.push({ pathname: '/(app)/new-transaction', params: { id: String(item.id) } })}
              style={({ pressed }) => ({
                flexDirection: 'row', gap: 14, paddingVertical: 14,
                paddingHorizontal: 4,
                borderBottomWidth: index < recent.length - 1 ? 1 : 0,
                borderBottomColor: c.separator,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: item.type === 'income' ? c.greenSubtle : c.orangeSubtle,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 20 }}>{getCategoryIcon(item.category, item.type)}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ color: c.text, fontWeight: '600', fontSize: 15, marginBottom: 3 }}>{txTitle(item)}</Text>
                <Text style={{ color: c.hint, fontSize: 12 }}>{fmtDate(item.occurred_at)}</Text>
              </View>
              <View style={{ justifyContent: 'center', alignItems: 'flex-end' }}>
                <Text style={{
                  color: item.type === 'income' ? c.green : c.orange,
                  fontWeight: '700', fontSize: 15, letterSpacing: -0.3,
                }}>
                  {item.type === 'income' ? '+' : '−'}{fmt(Number(item.amount))}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}
