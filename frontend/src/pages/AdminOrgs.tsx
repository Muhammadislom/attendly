import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type Org = {
  id: number;
  name: string;
  markStartHour: number;
  markStartMin: number;
  markEndHour: number;
  markEndMin: number;
  timezone: string;
  manager: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
    telegramId: string;
  };
  _count: { staff: number; assistants: number };
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AdminOrgs({ me }: { me: Me }) {
  const { t } = useT();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    api<Org[]>('/api/admin/orgs').then(setOrgs);
  }, []);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!orgs)
    return (
      <Layout title={t('adminOrgs.title')} back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  const managerName = (m: Org['manager']) => {
    const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
    if (name) return name;
    if (m.username) return `@${m.username}`;
    return t('adminOrgs.noManagerName');
  };

  const filtered = orgs.filter((o) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      o.name.toLowerCase().includes(q) ||
      managerName(o.manager).toLowerCase().includes(q) ||
      (o.manager.username || '').toLowerCase().includes(q)
    );
  });

  return (
    <Layout title={t('adminOrgs.title')} back>
      <Help title={t('adminOrgs.help.title')}>
        <p>{t('adminOrgs.help.body')}</p>
      </Help>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('adminOrgs.search')}
        className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text placeholder:text-tg-hint/60 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition mb-3"
      />

      {filtered.length === 0 && (
        <div className="text-center text-tg-hint mt-10">
          <div className="text-5xl mb-3">🏢</div>
          <div>{t('adminOrgs.empty')}</div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((o) => (
          <Link key={o.id} to={`/admin/orgs/${o.id}`}>
          <Card>
            <div className="font-semibold truncate">{o.name}</div>
            <div className="text-xs text-tg-hint mt-1 truncate">
              {t('adminOrgs.manager', managerName(o.manager))}
              {o.manager.username && ` · @${o.manager.username}`}
            </div>
            <div className="text-sm text-tg-hint mt-1">
              👥 {o._count.staff} · 🧑‍💼 {o._count.assistants}
            </div>
            <div className="text-xs text-tg-hint mt-1">
              ⏰ {pad(o.markStartHour)}:{pad(o.markStartMin)} —{' '}
              {pad(o.markEndHour)}:{pad(o.markEndMin)} · {o.timezone}
            </div>
          </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
