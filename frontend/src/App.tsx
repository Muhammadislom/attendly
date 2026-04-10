import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { api, Me } from './lib/api';
import { tg } from './lib/telegram';
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

  // Detect whether the page is actually running inside Telegram. Outside
  // Telegram `initData` is empty and any API call will return 401, which
  // would otherwise show as a confusing "Missing initData" error.
  const insideTelegram = !!tg()?.initData;

  const reload = async () => {
    try {
      setError(null);
      const data = await api<Me>('/api/me');
      setMe(data);
    } catch (e: any) {
      setError(e.message || 'Ошибка загрузки');
    }
  };

  useEffect(() => {
    if (!insideTelegram) return;
    reload();
  }, [insideTelegram]);

  if (!insideTelegram) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-4">
          <div className="text-5xl">📱</div>
          <h1 className="text-xl font-semibold">Откройте через Telegram</h1>
          <p className="text-sm opacity-80">
            Это мини-приложение работает только внутри Telegram. Откройте бота
            и нажмите кнопку «📱 Открыть приложение» или команду /app.
          </p>
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
