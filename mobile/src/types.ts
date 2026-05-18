export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amount: string;
  currency: string;
  category: string | null;
  note: string | null;
  occurred_at: string;
};

export type Paginated<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type MonthlyRow = {
  ym: string;
  income: number;
  expense: number;
};

export type Stats = {
  totals: { income: number; expense: number };
  monthly: MonthlyRow[];
};

export type User = {
  id: number;
  name: string;
  email: string;
  device_uuid?: string;
};

export type FilterType = 'all' | 'income' | 'expense';
export type EntryType = 'income' | 'expense';
