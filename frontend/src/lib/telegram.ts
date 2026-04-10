// Telegram WebApp helpers
type TGWebApp = {
  ready: () => void;
  expand: () => void;
  initData: string;
  initDataUnsafe: any;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  HapticFeedback?: {
    impactOccurred: (s: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (s: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  showAlert?: (m: string) => void;
  showConfirm?: (m: string, cb: (ok: boolean) => void) => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton?: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setText: (t: string) => void;
    enable: () => void;
    disable: () => void;
  };
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TGWebApp };
  }
}

export function tg(): TGWebApp | null {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram() {
  const app = tg();
  if (!app) return;
  app.ready();
  app.expand();
}

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light') {
  tg()?.HapticFeedback?.impactOccurred(kind);
}

export function notify(kind: 'success' | 'error' | 'warning' = 'success') {
  tg()?.HapticFeedback?.notificationOccurred(kind);
}

export function showAlert(msg: string) {
  const app = tg();
  if (app?.showAlert) app.showAlert(msg);
  else alert(msg);
}

export async function showConfirm(msg: string): Promise<boolean> {
  const app = tg();
  if (app?.showConfirm) {
    return new Promise((resolve) => app.showConfirm!(msg, (ok) => resolve(ok)));
  }
  return confirm(msg);
}
