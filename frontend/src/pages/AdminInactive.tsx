import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type InactiveOrg = {
  id: number;
  name: string;
  createdAt: string;
  totalStaff: number;
  lastMarkAt: string | null;
  manager: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
  };
};

export default function AdminInactive({ me }: { me: Me }) {
  const { t } = useT();
  const [orgs, setOrgs] = useState<InactiveOrg[] | null>(null);

  useEffect(() => {
    api<InactiveOrg[]>('/api/admin/inactive-orgs').then(setOrgs);
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
      <Layout title={t('adminInactive.title')} back>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Layout>
    );

  if (orgs.length === 0)
    return (
      <Layout title={t('adminInactive.title')} back>
        <div className="text-center text-tg-hint mt-10">
          <div className="text-5xl mb-3">🎉</div>
          <div>{t('adminInactive.empty')}</div>
        </div>
      </Layout>
    );

  return (
    <Layout title={t('adminInactive.title')} back>
      <Help title={t('adminInactive.help.title')}>
        <p>{t('adminInactive.help.body')}</p>
      </Help>
      <div className="space-y-2">
        {orgs.map((o) => {
          const mgrName = [o.manager.firstName, o.manager.lastName].filter(Boolean).join(' ');
          const lastStr = o.lastMarkAt
            ? t('adminInactive.lastMark', new Date(o.lastMarkAt).toLocaleDateString('ru-RU'))
            : t('adminInactive.never');
          return (
            <Link key={o.id} to={`/admin/orgs/${o.id}`}>
              <Card>
                <div className="font-semibold truncate">{o.name}</div>
                <div className="text-xs text-tg-hint mt-1">
                  {t('adminOrgs.manager', mgrName || t('adminOrgs.noManagerName'))}
                </div>
                <div className="text-xs text-tg-hint">
                  👥 {o.totalStaff} · {lastStr}
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
