import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type Stats = {
  totalUsers: number;
  totalOrgs: number;
  totalStaff: number;
  totalAssistants: number;
  todayAttendance: number;
  recentUsers: number;
  byRole: {
    SUPER_ADMIN: number;
    MANAGER: number;
    ASSISTANT: number;
    STAFF: number;
    NONE: number;
  };
};

export default function AdminDashboard({ me }: { me: Me }) {
  const { t } = useT();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    api<Stats>('/api/admin/stats').then(setStats);
  }, []);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!stats)
    return (
      <Layout title={t('adminDash.title')} back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  const tile = (label: string, value: number, icon: string) => (
    <Card className="text-center">
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-tg-hint mt-1 leading-tight">{label}</div>
    </Card>
  );

  const roleRow = (role: keyof Stats['byRole'], color: string) => (
    <div className="flex items-center justify-between py-1.5">
      <span
        className={`inline-block px-2 py-0.5 rounded-full text-xs text-white ${color}`}
      >
        {t(`role.${role}` as any)}
      </span>
      <span className="font-semibold">{stats.byRole[role]}</span>
    </div>
  );

  return (
    <Layout title={t('adminDash.title')} back>
      <Help title={t('adminDash.help.title')}>
        <p>{t('adminDash.help.body')}</p>
      </Help>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {tile(t('adminDash.totalUsers'), stats.totalUsers, '👥')}
        {tile(t('adminDash.totalOrgs'), stats.totalOrgs, '🏢')}
        {tile(t('adminDash.totalStaff'), stats.totalStaff, '🧑‍🍳')}
        {tile(t('adminDash.totalAssistants'), stats.totalAssistants, '🧑‍💼')}
        {tile(t('adminDash.todayAttendance'), stats.todayAttendance, '✅')}
        {tile(t('adminDash.recentUsers'), stats.recentUsers, '🆕')}
      </div>

      <Card className="mb-3">
        <div className="font-semibold mb-2">{t('adminDash.byRole')}</div>
        {roleRow('SUPER_ADMIN', 'bg-purple-500')}
        {roleRow('MANAGER', 'bg-green-500')}
        {roleRow('ASSISTANT', 'bg-blue-500')}
        {roleRow('STAFF', 'bg-gray-400')}
        {roleRow('NONE', 'bg-tg-secondary !text-tg-hint')}
      </Card>

      <div className="space-y-3">
        <Link to="/admin/users" className="block">
          <Card className="flex items-center gap-3">
            <div className="text-3xl">👑</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t('home.menu.users')}</div>
              <div className="text-sm text-tg-hint truncate">
                {t('home.menu.usersSub')}
              </div>
            </div>
            <div className="text-tg-hint">›</div>
          </Card>
        </Link>
        <Link to="/admin/orgs" className="block">
          <Card className="flex items-center gap-3">
            <div className="text-3xl">🏢</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{t('adminDash.menuOrgs')}</div>
              <div className="text-sm text-tg-hint truncate">
                {t('adminDash.menuOrgsSub')}
              </div>
            </div>
            <div className="text-tg-hint">›</div>
          </Card>
        </Link>
      </div>
    </Layout>
  );
}
