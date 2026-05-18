import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { apiFetch } from './api';
import type { User } from './types';

const TOKEN_KEY = 'mt_token';
const DEVICE_KEY = 'mt_device_uuid';

// ─── Token storage ────────────────────────────────────────────────────────────

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setStoredToken(token: string | null): Promise<void> {
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

// ─── Device UUID (legacy device auth) ────────────────────────────────────────

export async function getOrCreateDeviceUuid(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** @deprecated Використовується лише для legacy device_uuid flow */
export async function loginWithDevice(): Promise<string> {
  const device_uuid = await getOrCreateDeviceUuid();
  const res = await apiFetch<{ token: string }>('/auth/device', {
    method: 'POST',
    body: JSON.stringify({ device_uuid }),
  });
  await setStoredToken(res.token);
  return res.token;
}

// ─── Email / password auth ────────────────────────────────────────────────────

export type AuthResult = { token: string; user: User };

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await apiFetch<AuthResult>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, password_confirmation: password }),
  });
  await setStoredToken(res.token);
  return res;
}

export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const res = await apiFetch<AuthResult>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  await setStoredToken(res.token);
  return res;
}

export async function logout(token: string): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST', token });
  } finally {
    await setStoredToken(null);
  }
}
