import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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

function fmt(v: number) {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', maximumFractionDigits: 0 }).format(v);
}
function fmtMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString('uk-UA', { month: 'short' });
}

type CategoryStat = { name: string; amount: number; count: number; pct: number; color: string };

const CHART_COLORS = [
  '#34d399', '#f59e0b', '#60a5fa', '#f472b6',
  '#a78bfa', '#34d399', '#fb923c', '#4ade80',
  '#38bdf8', '#c084fc',
];

function buildCategoryStats(txs: Transaction[], txType: 'expense' | 'income'): CategoryStat[] {
  const map: Record<string, { amount: number; count: number }> = {};
  const filtered = txs.filter(t => t.type === txType);
  const total = filtered.reduce((s, t) => s + Number(t.amount), 0);
  for (const t of filtered) {
    const key = t.category?.trim() || 'Інше';
    if (!map[key]) map[key] = { amount: 0, count: 0 };
    map[key].amount += Number(t.amount);
    map[key].count += 1;
  }
  return Object.entries(map)
    .sort((a, b) => b[1].amount - a[1].amount)
    .map(([name, { amount, count }], index) => ({
      name, amount, count,
      pct: total > 0 ? (amount / total) * 100 : 0,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
}

export default function StatisticsScreen() {
  const { token } = useAuth();
  const { colors: c, mode } = useTheme();

  const [stats, setStats] = useState<Stats | null>(null);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [catType, setCatType] = useState<'expense' | 'income'>('expense');

  const load = useCallback(async () => {
    if (!token) return;
    const [statsRes, txRes] = await Promise.all([
      apiFetch<Stats>('/stats/summary', { token }),
      apiFetch<Paginated<Transaction>>('/transactions?per_page=200', { token }),
    ]);
    setStats(statsRes);
    setAllTxs(txRes.data);
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

  const maxMonth = useMemo(() =>
    Math.max(1, ...(stats?.monthly ?? []).flatMap(m => [m.income, m.expense])),
    [stats]);

  const catStats = useMemo(() => buildCategoryStats(allTxs, catType), [allTxs, catType]);
  const net = (stats?.totals.income ?? 0) - (stats?.totals.expense ?? 0);
  const income = stats?.totals.income ?? 0;
  const expense = stats?.totals.expense ?? 0;
  const savingsRate = income > 0 ? ((net / income) * 100).toFixed(1) : '0.0';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.accent} />}
    >
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      {/* KPI row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        {[
          { label: 'Дохід', value: income, color: c.green, bg: c.greenSubtle },
          { label: 'Витрати', value: expense, color: c.orange, bg: c.orangeSubtle },
        ].map(({ label, value, color, bg }) => (
          <View key={label} style={{
            flex: 1, padding: 18, borderRadius: 22,
            backgroundColor: bg,
            borderWidth: 1, borderColor: c.cardBorder,
          }}>
            <Text style={{ color: color, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>{label}</Text>
            <Text style={{ fontSize: 18, fontWeight: '800', color, letterSpacing: -0.5 }}>{fmt(value)}</Text>
          </View>
        ))}
      </View>

      {/* Net + savings row */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
        {[
          { label: 'Баланс', value: fmt(net), color: net >= 0 ? c.green : c.orange },
          { label: 'Заощадження', value: `${savingsRate}%`, color: Number(savingsRate) >= 0 ? c.green : c.orange },
        ].map(({ label, value, color }) => (
          <View key={label} style={{
            flex: 1, padding: 16, borderRadius: 18,
            backgroundColor: c.card, borderWidth: 1, borderColor: c.cardBorder,
          }}>
            <Text style={{ color: c.hint, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</Text>
            <Text style={{ fontSize: 17, fontWeight: '700', color, letterSpacing: -0.3 }}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Monthly chart */}
      <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3, marginBottom: 14 }}>По місяцях</Text>
      <View style={{ backgroundColor: c.card, borderRadius: 22, borderWidth: 1, borderColor: c.cardBorder, padding: 18, marginBottom: 24 }}>
        {stats?.monthly.length ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingBottom: 8, paddingHorizontal: 4 }}>
                {stats.monthly.map(row => (
                  <View key={row.ym} style={{ alignItems: 'center', width: 48 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 100, marginBottom: 8 }}>
                      <View style={{
                        width: 14, borderRadius: 6,
                        backgroundColor: c.green,
                        height: Math.max(4, (row.income / maxMonth) * 95),
                        opacity: 0.85,
                      }} />
                      <View style={{
                        width: 14, borderRadius: 6,
                        backgroundColor: c.orange,
                        height: Math.max(4, (row.expense / maxMonth) * 95),
                        opacity: 0.85,
                      }} />
                    </View>
                    <Text style={{ color: c.hint, fontSize: 10, fontWeight: '600' }}>{fmtMonth(row.ym)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            <View style={{ flexDirection: 'row', gap: 16, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: c.separator }}>
              {[{ color: c.green, label: 'Дохід' }, { color: c.orange, label: 'Витрати' }].map(({ color, label }) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
                  <Text style={{ color: c.subtext, fontSize: 12, fontWeight: '500' }}>{label}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={{ color: c.hint, textAlign: 'center', paddingVertical: 24 }}>Немає даних</Text>
        )}
      </View>

      {/* Category breakdown */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>По категоріях</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['expense', 'income'] as const).map(t => (
            <Pressable key={t} onPress={() => setCatType(t)} style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999,
              backgroundColor: catType === t ? c.accent : c.chipBg,
              borderWidth: 1,
              borderColor: catType === t ? c.accent : c.cardBorder,
            }}>
              <Text style={{
                color: catType === t ? c.accentText : c.subtext,
                fontWeight: '600', fontSize: 12,
              }}>
                {t === 'expense' ? 'Витрати' : 'Доходи'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{
        backgroundColor: c.card, borderRadius: 22,
        borderWidth: 1, borderColor: c.cardBorder,
        overflow: 'hidden', padding: 16,
      }}>
        {catStats.length === 0 ? (
          <Text style={{ color: c.hint, textAlign: 'center', padding: 24 }}>Немає даних</Text>
        ) : (
          <>
            {/* Segmented bar */}
            <View style={{ height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginBottom: 22 }}>
              {catStats.map((cat, i) => (
                <View key={cat.name} style={{
                  width: `${cat.pct}%`,
                  backgroundColor: cat.color,
                  borderRightWidth: i < catStats.length - 1 ? 2 : 0,
                  borderRightColor: c.card,
                }} />
              ))}
            </View>

            {catStats.map((cat, i) => (
              <View key={cat.name} style={{
                paddingVertical: 12,
                borderBottomWidth: i < catStats.length - 1 ? 1 : 0,
                borderBottomColor: c.separator,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: cat.color }} />
                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 14 }}>{cat.name}</Text>
                    <Text style={{ color: c.hint, fontSize: 12 }}>×{cat.count}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: cat.color, fontWeight: '700', fontSize: 14, letterSpacing: -0.3 }}>{fmt(cat.amount)}</Text>
                    <Text style={{ color: c.hint, fontSize: 11 }}>{cat.pct.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: c.chipBg }}>
                  <View style={{ height: 3, borderRadius: 2, width: `${cat.pct}%`, backgroundColor: cat.color }} />
                </View>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
