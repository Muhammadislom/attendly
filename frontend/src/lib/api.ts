import { tg } from './telegram';

const API_BASE = (import.meta.env.VITE_API_BASE as string) || '';

export async function api<T = any>(
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const initData = tg()?.initData || '';
  const res = await fetch(API_BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': initData,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    let err: any = text;
    try {
      err = JSON.parse(text);
    } catch {}
    throw new Error(err?.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Role = 'SUPER_ADMIN' | 'MANAGER' | 'ASSISTANT' | 'STAFF' | 'NONE';

export type Me = {
  user: {
    id: number;
    telegramId: string;
    firstName: string;
    lastName: string | null;
    username: string | null;
    role: Role;
  };
  managedOrgs: any[];
  assistantOf: { organization: any }[];
  staffLinks: { organization: any }[];
};
