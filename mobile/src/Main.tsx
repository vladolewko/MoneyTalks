import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';

import { apiFetch } from './api';
import { getStoredToken, getOrCreateDeviceUuid, loginWithDevice, setStoredToken } from './auth';
import { API_BASE } from './config';

type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amount: string;
  currency: string;
  category: string | null;
  note: string | null;
  occurred_at: string;
};

type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type MonthlyRow = {
  ym: string;
  income: number;
  expense: number;
};

type Stats = {
  totals: { income: number; expense: number };
  monthly: MonthlyRow[];
};

type User = {
  id: number;
  device_uuid: string;
};

type FilterType = 'all' | 'income' | 'expense';
type EntryType = 'income' | 'expense';

type DraftPreset = {
  type: EntryType;
  amount: number;
  category: string;
  note: string;
  occurred_at: string;
};

const QUICK_CATEGORIES: Record<EntryType, string[]> = {
  expense: ['Продукти', 'Кафе', 'Транспорт', 'Дім', 'Здоровʼя', 'Інше'],
  income: ['Зарплата', 'Фриланс', 'Переказ', 'Подарунок', 'Повернення', 'Інше'],
};

const DEMO_PRESETS: DraftPreset[] = [
  { type: 'income', amount: 28500, category: 'Зарплата', note: 'Щомісячне нарахування', occurred_at: daysAgo(9) },
  { type: 'expense', amount: 1240, category: 'Продукти', note: 'Супермаркет', occurred_at: daysAgo(7) },
  { type: 'expense', amount: 360, category: 'Кафе', note: 'Кава та обід', occurred_at: daysAgo(4) },
  { type: 'income', amount: 2200, category: 'Фриланс', note: 'Невеликий проєкт', occurred_at: daysAgo(3) },
  { type: 'expense', amount: 820, category: 'Транспорт', note: 'Таксі та метро', occurred_at: daysAgo(1) },
];

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatMonth(ym: string) {
  const [year, month] = ym.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, 1).toLocaleDateString('uk-UA', {
    month: 'short',
  });
}

function formatTxDate(value: string) {
  return new Date(value).toLocaleString('uk-UA', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateTimeLocalValue(value: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function normalizeOccurredAt(value: string): string | null {
  const raw = value.trim();
  if (!raw) {
    return null;
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function transactionTitle(item: Transaction) {
  if (item.category?.trim()) {
    return item.category.trim();
  }
  return item.type === 'income' ? 'Надходження' : 'Витрата';
}

export default function Main() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [type, setType] = useState<EntryType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(toDateTimeLocalValue(new Date()));

  const topPad = useMemo(() => (Constants.statusBarHeight ?? 0) + 12, []);

  const bootstrap = useCallback(async () => {
    setBootError(null);

    const currentDeviceUuid = await getOrCreateDeviceUuid();
    setDeviceUuid(currentDeviceUuid);

    let activeToken = await getStoredToken();
    let currentUser: User | null = null;

    if (!activeToken) {
      activeToken = await loginWithDevice();
    } else {
      try {
        currentUser = await apiFetch<User>('/user', { token: activeToken });
      } catch {
        await setStoredToken(null);
        activeToken = await loginWithDevice();
      }
    }

    if (!currentUser) {
      currentUser = await apiFetch<User>('/user', { token: activeToken });
    }

    setUser(currentUser);
    setToken(activeToken);
  }, []);

  const loadData = useCallback(async (activeToken: string) => {
    const [txRes, statsRes] = await Promise.all([
      apiFetch<Paginated<Transaction>>('/transactions', { token: activeToken }),
      apiFetch<Stats>('/stats/summary', { token: activeToken }),
    ]);

    setItems(txRes.data);
    setStats(statsRes);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        await bootstrap();
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : 'Не вдалося увійти');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrap]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadData(token);
      } catch (error) {
        if (!cancelled) {
          setBootError(error instanceof Error ? error.message : 'Не вдалося завантажити дані');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadData, token]);

  const resetDraft = useCallback((nextType?: EntryType) => {
    const actualType = nextType ?? type;
    setType(actualType);
    setAmount('');
    setCategory('');
    setNote('');
    setOccurredAt(toDateTimeLocalValue(new Date()));
  }, [type]);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    resetDraft();
  }, [resetDraft]);

  const onRefresh = useCallback(async () => {
    if (!token) {
      return;
    }

    setRefreshing(true);
    setBootError(null);

    try {
      await loadData(token);
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Оновлення не вдалося');
    } finally {
      setRefreshing(false);
    }
  }, [loadData, token]);

  const submit = useCallback(async () => {
    if (!token) {
      return;
    }

    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Сума', 'Введіть коректну суму більше нуля.');
      return;
    }

    const normalizedOccurredAt = normalizeOccurredAt(occurredAt);
    if (occurredAt.trim() && !normalizedOccurredAt) {
      Alert.alert('Дата', 'Використайте формат YYYY-MM-DDTHH:MM.');
      return;
    }

    setSaving(true);

    try {
      await apiFetch<Transaction>('/transactions', {
        method: 'POST',
        token,
        body: JSON.stringify({
          type,
          amount: parsedAmount,
          currency: 'UAH',
          category: category.trim() || null,
          note: note.trim() || null,
          occurred_at: normalizedOccurredAt,
        }),
      });

      closeModal();
      await loadData(token);
    } catch (error) {
      Alert.alert('Помилка', error instanceof Error ? error.message : 'Збереження не вдалося');
    } finally {
      setSaving(false);
    }
  }, [amount, category, closeModal, loadData, occurredAt, note, token, type]);

  const createDemoData = useCallback(async () => {
    if (!token) {
      return;
    }

    setSeedLoading(true);
    setBootError(null);

    try {
      await Promise.all(
        DEMO_PRESETS.map((preset) =>
          apiFetch('/transactions', {
            method: 'POST',
            token,
            body: JSON.stringify({
              ...preset,
              currency: 'UAH',
            }),
          }),
        ),
      );

      await loadData(token);
    } catch (error) {
      Alert.alert('Помилка', error instanceof Error ? error.message : 'Не вдалося створити демо-дані');
    } finally {
      setSeedLoading(false);
    }
  }, [loadData, token]);

  const removeTx = useCallback((row: Transaction) => {
    if (!token) {
      return;
    }

    Alert.alert(
      'Видалити операцію',
      `${transactionTitle(row)} • ${formatMoney(Number(row.amount), row.currency)}`,
      [
        { text: 'Скасувати', style: 'cancel' },
        {
          text: 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiFetch(`/transactions/${row.id}`, { method: 'DELETE', token });
              await loadData(token);
            } catch (error) {
              Alert.alert('Помилка', error instanceof Error ? error.message : 'Не вдалося видалити');
            }
          },
        },
      ],
    );
  }, [loadData, token]);

  const logout = useCallback(() => {
    Alert.alert('Скинути сесію', 'Токен буде видалений з пристрою, а вхід виконається повторно.', [
      { text: 'Скасувати', style: 'cancel' },
      {
        text: 'Скинути',
        style: 'destructive',
        onPress: async () => {
          await setStoredToken(null);
          setToken(null);
          setUser(null);
          setItems([]);
          setStats(null);
          setLoading(true);

          try {
            await bootstrap();
            const nextToken = await getStoredToken();
            if (nextToken) {
              await loadData(nextToken);
            }
          } catch (error) {
            setBootError(error instanceof Error ? error.message : 'Не вдалося перевидати сесію');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  }, [bootstrap, loadData, token]);

  const filteredItems = useMemo(() => {
    if (filter === 'all') {
      return items;
    }
    return items.filter((item) => item.type === filter);
  }, [filter, items]);

  const net = useMemo(() => {
    return (stats?.totals.income ?? 0) - (stats?.totals.expense ?? 0);
  }, [stats]);

  const maxMonth = useMemo(() => {
    if (!stats?.monthly.length) {
      return 1;
    }
    return Math.max(1, ...stats.monthly.flatMap((month) => [month.income, month.expense]));
  }, [stats]);

  const recentExpense = useMemo(() => items.find((item) => item.type === 'expense') ?? null, [items]);
  const recentIncome = useMemo(() => items.find((item) => item.type === 'income') ?? null, [items]);

  if (loading && !token) {
    return (
      <View style={[styles.center, { paddingTop: topPad }]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingTitle}>MoneyTalks</Text>
        <Text style={styles.loadingText}>Підключення до {API_BASE}</Text>
      </View>
    );
  }

  if (bootError && !token) {
    return (
      <View style={[styles.center, styles.screenPadding, { paddingTop: topPad }]}>
        <StatusBar style="light" />
        <Text style={styles.loadingTitle}>MoneyTalks</Text>
        <Text style={styles.errorText}>{bootError}</Text>
        <Pressable
          style={styles.primaryButton}
          onPress={() => {
            setLoading(true);
            bootstrap()
              .catch(() => undefined)
              .finally(() => setLoading(false));
          }}
        >
          <Text style={styles.primaryButtonText}>Повторити</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: topPad }]}>
      <StatusBar style="light" />

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22c55e" />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.screenPadding}>
            <View style={styles.hero}>
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <Text style={styles.brand}>MoneyTalks</Text>
                  <Text style={styles.heroMeta}>
                    {user ? `Користувач #${user.id}` : 'Локальна сесія'} • {deviceUuid?.slice(0, 8) ?? 'device'}
                  </Text>
                </View>
                <View style={styles.heroActions}>
                  <Pressable style={styles.smallGhostButton} onPress={onRefresh}>
                    <Text style={styles.smallGhostButtonText}>Оновити</Text>
                  </Pressable>
                  <Pressable style={styles.smallGhostButton} onPress={logout}>
                    <Text style={styles.smallGhostButtonText}>Сесія</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={styles.heroLabel}>Поточний баланс</Text>
              <Text style={[styles.heroAmount, net >= 0 ? styles.positiveText : styles.negativeText]}>
                {formatMoney(net, 'UAH')}
              </Text>
              <Text style={styles.heroSubtext}>Дані синхронізуються з API і зберігаються на сервері.</Text>
            </View>

            {bootError ? (
              <View style={styles.inlineAlert}>
                <Text style={styles.inlineAlertText}>{bootError}</Text>
              </View>
            ) : null}

            <View style={styles.summaryGrid}>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Дохід</Text>
                <Text style={[styles.metricValue, styles.positiveText]}>
                  {formatMoney(stats?.totals.income ?? 0, 'UAH')}
                </Text>
                <Text style={styles.metricHint}>
                  {recentIncome ? `Останній: ${transactionTitle(recentIncome)}` : 'Ще немає надходжень'}
                </Text>
              </View>

              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Витрати</Text>
                <Text style={[styles.metricValue, styles.negativeText]}>
                  {formatMoney(stats?.totals.expense ?? 0, 'UAH')}
                </Text>
                <Text style={styles.metricHint}>
                  {recentExpense ? `Остання: ${transactionTitle(recentExpense)}` : 'Ще немає витрат'}
                </Text>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Динаміка за місяцями</Text>
                  <Text style={styles.sectionCaption}>Останні 6 місяців, доходи і витрати окремо</Text>
                </View>
                <Pressable
                  style={styles.primaryButtonCompact}
                  onPress={() => {
                    resetDraft('expense');
                    setModalOpen(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Додати</Text>
                </Pressable>
              </View>

              {stats?.monthly.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.chart}>
                    {stats.monthly.map((row) => (
                      <View key={row.ym} style={styles.chartColumn}>
                        <View style={styles.chartBars}>
                          <View
                            style={[
                              styles.chartBar,
                              styles.chartBarIncome,
                              { height: 8 + (row.income / maxMonth) * 110 },
                            ]}
                          />
                          <View
                            style={[
                              styles.chartBar,
                              styles.chartBarExpense,
                              { height: 8 + (row.expense / maxMonth) * 110 },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartLabel}>{formatMonth(row.ym)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <View style={styles.emptyChart}>
                  <Text style={styles.emptyChartText}>Поки немає історії. Додай перший запис або створи демо-дані.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Операції</Text>
                  <Text style={styles.sectionCaption}>
                    {items.length ? `${items.length} записів у стрічці` : 'Порожній акаунт, можна одразу наповнити'}
                  </Text>
                </View>
              </View>

              <View style={styles.filterRow}>
                {(['all', 'expense', 'income'] as FilterType[]).map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => setFilter(option)}
                    style={[styles.filterChip, filter === option && styles.filterChipActive]}
                  >
                    <Text style={filter === option ? styles.filterChipTextActive : styles.filterChipText}>
                      {option === 'all' ? 'Усі' : option === 'expense' ? 'Витрати' : 'Доходи'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {!items.length ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateTitle}>Можна показувати навіть порожній сценарій</Text>
                  <Text style={styles.emptyStateText}>
                    Додай власну транзакцію або створи невеликий набір демо-даних для презентації.
                  </Text>
                  <View style={styles.emptyActions}>
                    <Pressable
                      style={styles.ghostButton}
                      disabled={seedLoading}
                      onPress={createDemoData}
                    >
                      <Text style={styles.ghostButtonText}>
                        {seedLoading ? 'Створення…' : 'Демо-дані'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.primaryButtonCompact}
                      onPress={() => {
                        resetDraft('expense');
                        setModalOpen(true);
                      }}
                    >
                      <Text style={styles.primaryButtonText}>Новий запис</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={items.length ? <Text style={styles.filteredEmpty}>Немає записів для обраного фільтра.</Text> : null}
        renderItem={({ item }) => (
          <Pressable style={styles.txRow} onLongPress={() => removeTx(item)}>
            <View style={styles.txIconWrap}>
              <Text style={styles.txIcon}>{item.type === 'income' ? '↗' : '↘'}</Text>
            </View>

            <View style={styles.txMain}>
              <View style={styles.txHeader}>
                <Text style={styles.txTitle}>{transactionTitle(item)}</Text>
                <Text style={item.type === 'income' ? styles.txAmountIncome : styles.txAmountExpense}>
                  {item.type === 'income' ? '+' : '−'}
                  {formatMoney(Number(item.amount), item.currency)}
                </Text>
              </View>
              <Text style={styles.txNote}>{item.note?.trim() || 'Без додаткової нотатки'}</Text>
              <Text style={styles.txMeta}>{formatTxDate(item.occurred_at)}</Text>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.select({ ios: 'padding', android: undefined })}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Нова транзакція</Text>
            <Text style={styles.modalSubtitle}>Мінімальна форма під наявний контракт API</Text>

            <View style={styles.segmentRow}>
              {(['expense', 'income'] as EntryType[]).map((entryType) => (
                <Pressable
                  key={entryType}
                  onPress={() => {
                    setType(entryType);
                    if (!category.trim()) {
                      setCategory(QUICK_CATEGORIES[entryType][0] ?? '');
                    }
                  }}
                  style={[
                    styles.segmentButton,
                    type === entryType && (entryType === 'expense' ? styles.segmentExpense : styles.segmentIncome),
                  ]}
                >
                  <Text style={type === entryType ? styles.segmentButtonTextActive : styles.segmentButtonText}>
                    {entryType === 'expense' ? 'Витрата' : 'Дохід'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Сума</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />

              <Text style={styles.inputLabel}>Категорія</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Наприклад, Продукти"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
                {QUICK_CATEGORIES[type].map((chip) => (
                  <Pressable
                    key={chip}
                    style={[styles.quickChip, category.trim() === chip && styles.quickChipActive]}
                    onPress={() => setCategory(chip)}
                  >
                    <Text style={category.trim() === chip ? styles.quickChipTextActive : styles.quickChipText}>
                      {chip}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Нотатка</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Короткий контекст"
                placeholderTextColor="#6b7280"
                style={[styles.input, styles.noteInput]}
                multiline
              />

              <Text style={styles.inputLabel}>Дата і час</Text>
              <TextInput
                value={occurredAt}
                onChangeText={setOccurredAt}
                autoCapitalize="none"
                placeholder="2026-05-11T12:30"
                placeholderTextColor="#6b7280"
                style={styles.input}
              />

              <View style={styles.datePresets}>
                <Pressable style={styles.quickChip} onPress={() => setOccurredAt(toDateTimeLocalValue(new Date()))}>
                  <Text style={styles.quickChipText}>Зараз</Text>
                </Pressable>
                <Pressable
                  style={styles.quickChip}
                  onPress={() => {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    yesterday.setHours(18, 0, 0, 0);
                    setOccurredAt(toDateTimeLocalValue(yesterday));
                  }}
                >
                  <Text style={styles.quickChipText}>Вчора 18:00</Text>
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable style={styles.ghostButton} onPress={closeModal} disabled={saving}>
                <Text style={styles.ghostButtonText}>Скасувати</Text>
              </Pressable>
              <Pressable style={styles.primaryButtonCompact} onPress={submit} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? 'Збереження…' : 'Зберегти'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07111f',
    gap: 12,
  },
  screenPadding: {
    paddingHorizontal: 20,
  },
  listContent: {
    paddingBottom: 32,
  },
  loadingTitle: {
    color: '#f8fafc',
    fontSize: 26,
    fontWeight: '700',
  },
  loadingText: {
    color: '#94a3b8',
    textAlign: 'center',
  },
  errorText: {
    color: '#fecaca',
    textAlign: 'center',
    marginBottom: 8,
  },
  hero: {
    paddingTop: 8,
    paddingBottom: 22,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  heroCopy: {
    flex: 1,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  brand: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  heroMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  heroLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 44,
  },
  heroSubtext: {
    color: '#94a3b8',
    marginTop: 10,
    lineHeight: 20,
  },
  positiveText: {
    color: '#4ade80',
  },
  negativeText: {
    color: '#fb923c',
  },
  smallGhostButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f1c2e',
  },
  smallGhostButtonText: {
    color: '#cbd5e1',
    fontWeight: '600',
    fontSize: 12,
  },
  inlineAlert: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#3f1d1d',
  },
  inlineAlertText: {
    color: '#fecaca',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  metricBlock: {
    flex: 1,
    minHeight: 116,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0f1c2e',
    borderWidth: 1,
    borderColor: '#16283c',
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  metricHint: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionCaption: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 14,
  },
  primaryButtonCompact: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#04110a',
    fontWeight: '700',
  },
  ghostButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f1c2e',
  },
  ghostButtonText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    paddingVertical: 8,
    paddingRight: 12,
  },
  chartColumn: {
    width: 48,
    alignItems: 'center',
  },
  chartBars: {
    width: 34,
    height: 126,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  chartBar: {
    width: 14,
    borderRadius: 8,
  },
  chartBarIncome: {
    backgroundColor: '#4ade80',
  },
  chartBarExpense: {
    backgroundColor: '#fb923c',
  },
  chartLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 8,
  },
  emptyChart: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0f1c2e',
  },
  emptyChartText: {
    color: '#94a3b8',
    lineHeight: 20,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#0f1c2e',
  },
  filterChipActive: {
    backgroundColor: '#1d4ed8',
  },
  filterChipText: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#eff6ff',
    fontWeight: '700',
  },
  emptyState: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0f1c2e',
    borderWidth: 1,
    borderColor: '#16283c',
  },
  emptyStateTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 16,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 10,
  },
  filteredEmpty: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  txRow: {
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#0f1c2e',
    borderWidth: 1,
    borderColor: '#16283c',
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  txIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1628',
  },
  txIcon: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '700',
  },
  txMain: {
    flex: 1,
  },
  txHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  txTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    flex: 1,
  },
  txAmountIncome: {
    color: '#4ade80',
    fontWeight: '700',
  },
  txAmountExpense: {
    color: '#fb923c',
    fontWeight: '700',
  },
  txNote: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  txMeta: {
    color: '#64748b',
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(2, 6, 23, 0.78)',
  },
  modalSheet: {
    maxHeight: '88%',
    backgroundColor: '#07111f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: '#16283c',
  },
  modalHandle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#334155',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0f1c2e',
    alignItems: 'center',
  },
  segmentExpense: {
    backgroundColor: '#7c2d12',
  },
  segmentIncome: {
    backgroundColor: '#14532d',
  },
  segmentButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
  },
  segmentButtonTextActive: {
    color: '#f8fafc',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#16283c',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#f8fafc',
    backgroundColor: '#0f1c2e',
    marginBottom: 12,
  },
  noteInput: {
    minHeight: 84,
    textAlignVertical: 'top',
  },
  quickRow: {
    gap: 8,
    paddingBottom: 12,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#0f1c2e',
    marginBottom: 12,
  },
  quickChipActive: {
    backgroundColor: '#1d4ed8',
  },
  quickChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  quickChipTextActive: {
    color: '#eff6ff',
    fontSize: 12,
    fontWeight: '700',
  },
  datePresets: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
});
