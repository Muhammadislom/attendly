import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, Me } from './lib/api';
import Home from './pages/Home';
import AdminUsers from './pages/AdminUsers';
import ManagerOrgs from './pages/ManagerOrgs';
import ManagerOrgDetail from './pages/ManagerOrgDetail';
import AssistantPick from './pages/AssistantPick';
import AssistantMark from './pages/AssistantMark';
import StaffHistory from './pages/StaffHistory';
import Spinner from './components/Spinner';

export default function App() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  const reload = async () => {
    try {
      setError(null);
      setAuthFailed(false);
      const data = await api<Me>('/api/me');
      setMe(data);
    } catch (e: any) {
      const msg = e.message || 'Ошибка загрузки';
      // Any auth-related failure (no initData, wrong HMAC, stale, etc.)
      // shows the friendly "open via Telegram" screen.
      if (
        msg.includes('initData') ||
        msg.includes('Unauthorized') ||
        msg.includes('HTTP 401')
      ) {
        setAuthFailed(true);
      } else {
        setError(msg);
      }
    }
  };

  useEffect(() => {
    reload();
  }, []);

  if (authFailed) {
    const w: any = typeof window !== 'undefined' ? window : {};
    const tgw = w.Telegram?.WebApp;
    const debug = {
      hasTelegram: !!w.Telegram,
      hasWebApp: !!tgw,
      version: tgw?.version ?? null,
      platform: tgw?.platform ?? null,
      initDataLen: tgw?.initData?.length ?? 0,
      initDataUnsafeKeys: tgw?.initDataUnsafe
        ? Object.keys(tgw.initDataUnsafe)
        : [],
      href: w.location?.href ?? '',
      hash: w.location?.hash ?? '',
    };
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-5xl">📱</div>
          <h1 className="text-xl font-semibold">Откройте через Telegram</h1>
          <p className="text-sm opacity-80">
            Это мини-приложение работает только внутри Telegram. Откройте бота
            и нажмите кнопку «📱 Открыть приложение» или команду /app.
          </p>
          <button
            onClick={reload}
            className="px-4 py-2 rounded-xl bg-tg-button text-tg-buttonText"
          >
            Повторить
          </button>
          <pre className="text-left text-[10px] opacity-60 whitespace-pre-wrap break-all bg-black/20 p-3 rounded-lg">
            {JSON.stringify(debug, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">⚠️ {error}</div>
        <button
          onClick={reload}
          className="px-4 py-2 rounded-xl bg-tg-button text-tg-buttonText"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (!me) {
    return (
      <div className="h-full flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Home me={me} reload={reload} />} />
      <Route path="/admin/users" element={<AdminUsers me={me} />} />
      <Route path="/manager" element={<ManagerOrgs me={me} />} />
      <Route path="/manager/orgs/:id" element={<ManagerOrgDetail me={me} />} />
      <Route path="/assistant" element={<AssistantPick me={me} />} />
      <Route path="/assistant/orgs/:id" element={<AssistantMark me={me} />} />
      <Route path="/staff" element={<StaffHistory me={me} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
