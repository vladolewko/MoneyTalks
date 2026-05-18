const raw = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');

export const API_BASE = raw && raw.length > 0 ? raw : 'https://moneytalks.ddev.site';

console.log('[config] API_BASE =', API_BASE);

