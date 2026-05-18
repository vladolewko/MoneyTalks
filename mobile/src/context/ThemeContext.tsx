import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';

export type ThemeColors = {
  bg: string;
  bgDeep: string;
  card: string;
  cardBorder: string;
  text: string;
  subtext: string;
  hint: string;
  accent: string;
  accentText: string;
  accentSubtle: string;
  green: string;
  greenSubtle: string;
  orange: string;
  orangeSubtle: string;
  danger: string;
  dangerSubtle: string;
  inputBg: string;
  chipBg: string;
  chipActiveBg: string;
  alertBg: string;
  alertText: string;
  separator: string;
};

const DARK: ThemeColors = {
  bg: '#080c14',
  bgDeep: '#050810',
  card: '#0e1420',
  cardBorder: '#1a2234',
  text: '#f0f4ff',
  subtext: '#8896b0',
  hint: '#4a5568',
  accent: '#34d399',
  accentText: '#042918',
  accentSubtle: '#0a2e1f',
  green: '#34d399',
  greenSubtle: '#0a2e1f',
  orange: '#f59e0b',
  orangeSubtle: '#2d1b04',
  danger: '#f87171',
  dangerSubtle: '#2d0a0a',
  inputBg: '#060a12',
  chipBg: '#131b2a',
  chipActiveBg: '#1a4535',
  alertBg: '#2d0a0a',
  alertText: '#fca5a5',
  separator: '#111827',
};

const LIGHT: ThemeColors = {
  bg: '#f7f8fc',
  bgDeep: '#eef0f6',
  card: '#ffffff',
  cardBorder: '#e8ecf4',
  text: '#0d111c',
  subtext: '#5a6478',
  hint: '#9aa3b8',
  accent: '#0ea371',
  accentText: '#ffffff',
  accentSubtle: '#e6f7f1',
  green: '#059669',
  greenSubtle: '#ecfdf5',
  orange: '#d97706',
  orangeSubtle: '#fffbeb',
  danger: '#dc2626',
  dangerSubtle: '#fef2f2',
  inputBg: '#f0f2f8',
  chipBg: '#eef0f8',
  chipActiveBg: '#0a3d2b',
  alertBg: '#fef2f2',
  alertText: '#991b1b',
  separator: '#f1f3f8',
};

const THEME_KEY = 'mt_theme';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'dark',
  colors: DARK,
  toggle: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved);
    });
  }, []);

  const toggle = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, colors: mode === 'dark' ? DARK : LIGHT, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
