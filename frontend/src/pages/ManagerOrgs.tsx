import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Input } from '../components/Card';
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

  const canManage =
    me.user.role === 'MANAGER' || me.user.role === 'SUPER_ADMIN';

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
          />
          <div className="grid grid-cols-2 gap-3 mb-2">
            <label className="block">
              <div className="text-sm text-tg-hint mb-1 px-1">Начало окна</div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-secondary outline-none"
              />
            </label>
            <label className="block">
              <div className="text-sm text-tg-hint mb-1 px-1">Конец окна</div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-secondary outline-none"
              />
            </label>
          </div>
          <div className="text-xs text-tg-hint mb-3">
            Часовой пояс: Asia/Tashkent. После завершения окна управляющему
            автоматически отправляется отчёт.
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowForm(false)}
              variant="secondary"
            >
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
          У вас пока нет организаций
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
