import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Input, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert } from '../lib/telegram';
import { useT } from '../lib/i18n';

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
  const { t } = useT();
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
      <Layout title={t('manager.title')} back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  // Only managers create/edit organizations. Super admin is excluded by
  // design — they manage users, not organizations.
  const canManage = me.user.role === 'MANAGER';

  const submit = async () => {
    if (!name.trim()) return showAlert(t('manager.enterName'));
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
    <Layout title={t('manager.title')} back>
      {canManage && (
        <Help title={t('manager.help.title')}>
          <p>{t('manager.help.body1')}</p>
          <p className="whitespace-pre-line">{t('manager.help.bullets')}</p>
        </Help>
      )}

      {canManage && !showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-4">
          {t('manager.addOrg')}
        </Button>
      )}

      {showForm && (
        <Card className="mb-4">
          <div className="font-semibold mb-3">{t('manager.newOrg')}</div>
          <Input
            label={t('common.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('manager.orgNamePlaceholder')}
            hint={t('manager.orgNameHint')}
          />
          <div className="grid grid-cols-2 gap-3 mb-2">
            <label className="block">
              <div className="text-sm font-medium mb-1.5 px-1">
                {t('manager.windowStart')}
              </div>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
              />
            </label>
            <label className="block">
              <div className="text-sm font-medium mb-1.5 px-1">
                {t('manager.windowEnd')}
              </div>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
              />
            </label>
          </div>
          <div className="text-xs text-tg-hint mb-3 px-1 leading-snug">
            {t('manager.tzHint')}
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(false)} variant="secondary">
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? t('common.saving') : t('common.create')}
            </Button>
          </div>
        </Card>
      )}

      {orgs.length === 0 && !showForm && (
        <div className="text-center text-tg-hint mt-10">
          <div className="text-5xl mb-3">🏢</div>
          <div>{t('manager.noOrgs')}</div>
          {canManage && (
            <div className="text-xs mt-2 px-6">{t('manager.noOrgsHint')}</div>
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
