import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Input, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert } from '../lib/telegram';

type Org = {
  id: number;
  name: string;
  markStartHour: number;
  markStartMin: number;
  markEndHour: number;
  markEndMin: number;
  timezone: string;
  _count: { staff: number; assistants: number };
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function ManagerOrgs({ me }: { me: Me }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('08:00');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const data = await api<Org[]>('/api/manager/orgs');
    setOrgs(data);
  };

  useEffect(() => {
    load();
  }, []);

  if (!orgs)
    return (
      <Layout title="Мои организации" back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  // Only managers create/edit organizations. Super admin is excluded by
  // design — they manage users, not organizations.
  const canManage = me.user.role === 'MANAGER';

  const submit = async () => {
    if (!name.trim()) return showAlert('Введите название');
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    setSaving(true);
    try {
      await api('/api/manager/orgs', {
        method: 'POST',
        body: JSON.stringify({
          name,
          markStartHour: sh,
          markStartMin: sm,
          markEndHour: eh,
          markEndMin: em,
          timezone: 'Asia/Tashkent',
        }),
      });
      notify('success');
      setName('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout title="Мои организации" back>
      {canManage && (
        <Help title="Что такое организация?">
          <p>
            Организация — это ваш объект учёта посещаемости (кофейня, магазин,
            офис). В ней будут:
          </p>
          <p>
            • <b>Сотрудники</b> — те, чью посещаемость отмечают.
            <br />• <b>Ассистенты</b> — те, кто отмечает посещаемость в
            приложении.
            <br />• <b>Окно отметки</b> — промежуток времени, когда можно
            отмечать. После закрытия окна вам автоматически приходит отчёт в
            Telegram.
          </p>
        </Help>
      )}

      {canManage && !showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-4">
          + Добавить организацию
        </Button>
      )}

      {showForm && (
        <Card className="mb-4">
          <div className="font-semibold mb-3">Новая организация</div>
          <Input
            label="Название"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Кофейня Uptown"
            hint="Как будет называться объект у вас в списке"
          />
          <div className="grid grid-cols-2 gap-3 mb-2">
            <label className="block">
              <div className="text-sm font-medium mb-1.5 px-1">Начало окна</div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium mb-1.5 px-1">Конец окна</div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
              />
            </label>
          </div>
          <div className="text-xs text-tg-hint mb-3 px-1 leading-snug">
            Часовой пояс: Asia/Tashkent. После закрытия окна вы получите отчёт
            в Telegram.
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(false)} variant="secondary">
              Отмена
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Сохранение...' : 'Создать'}
            </Button>
          </div>
        </Card>
      )}

      {orgs.length === 0 && !showForm && (
        <div className="text-center text-tg-hint mt-10">
          <div className="text-5xl mb-3">🏢</div>
          <div>У вас пока нет организаций</div>
          {canManage && (
            <div className="text-xs mt-2 px-6">
              Нажмите «Добавить организацию», чтобы начать
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {orgs.map((o) => (
          <Link key={o.id} to={`/manager/orgs/${o.id}`}>
            <Card className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate">{o.name}</div>
                <div className="text-sm text-tg-hint">
                  👥 {o._count.staff} · 🧑‍💼 {o._count.assistants}
                </div>
                <div className="text-xs text-tg-hint mt-1">
                  ⏰ {pad(o.markStartHour)}:{pad(o.markStartMin)} —{' '}
                  {pad(o.markEndHour)}:{pad(o.markEndMin)}
                </div>
              </div>
              <div className="text-tg-hint">›</div>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
