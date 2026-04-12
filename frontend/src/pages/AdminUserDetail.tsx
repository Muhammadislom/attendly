import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Me, Role } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type User = {
  id: number;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: Role;
  createdAt: string;
  managedOrgs: { id: number; name: string; _count: { staff: number } }[];
  assistantOf: { id: number; organization: { id: number; name: string } }[];
  staffLink: {
    id: number;
    fullName: string;
    organization: { id: number; name: string };
    attendance: { date: string; status: string }[];
  }[];
};

const roleBg: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-500',
  MANAGER: 'bg-green-500',
  ASSISTANT: 'bg-blue-500',
  STAFF: 'bg-gray-400',
  NONE: 'bg-tg-secondary',
};

export default function AdminUserDetail({ me }: { me: Me }) {
  const { t } = useT();
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api<User>(`/api/admin/users/${id}`).then(setUser);
  }, [id]);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!user)
    return (
      <Layout title={t('admin.title')} back>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Layout>
    );

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || t('admin.noName');
  const joined = new Date(user.createdAt).toLocaleDateString('ru-RU');
  const hasLinks = user.managedOrgs.length > 0 || user.assistantOf.length > 0 || user.staffLink.length > 0;

  const statusIcon = (s: string) =>
    s === 'PRESENT' ? '✅' : s === 'LATE' ? '🟡' : '❌';

  return (
    <Layout title={name} back>
      {/* Profile card */}
      <Card className="mb-3">
        <div className="text-xl font-bold mb-1">{name}</div>
        <div className="text-sm text-tg-hint mb-1">
          {user.username ? `@${user.username}` : `ID: ${user.telegramId}`}
        </div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs text-white ${roleBg[user.role]}`}>
            {t(`role.${user.role}` as any)}
          </span>
        </div>
        <div className="text-xs text-tg-hint">{t('adminUserDetail.joined', joined)}</div>
      </Card>

      {!hasLinks && (
        <div className="text-center text-tg-hint text-sm mt-6">{t('adminUserDetail.noLinks')}</div>
      )}

      {/* Managed orgs */}
      {user.managedOrgs.length > 0 && (
        <>
          <div className="font-semibold text-sm mb-2 px-1">
            {t('adminUserDetail.managedOrgs')} ({user.managedOrgs.length})
          </div>
          <div className="space-y-1.5 mb-4">
            {user.managedOrgs.map((o) => (
              <Link key={o.id} to={`/admin/orgs/${o.id}`}>
                <Card className="flex items-center justify-between py-2">
                  <div className="text-sm font-medium truncate">{o.name}</div>
                  <div className="text-xs text-tg-hint">👥 {o._count.staff}</div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Assistant in */}
      {user.assistantOf.length > 0 && (
        <>
          <div className="font-semibold text-sm mb-2 px-1">
            {t('adminUserDetail.assistantIn')} ({user.assistantOf.length})
          </div>
          <div className="space-y-1.5 mb-4">
            {user.assistantOf.map((a) => (
              <Link key={a.id} to={`/admin/orgs/${a.organization.id}`}>
                <Card className="py-2">
                  <div className="text-sm font-medium">{a.organization.name}</div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Staff in */}
      {user.staffLink.length > 0 && (
        <>
          <div className="font-semibold text-sm mb-2 px-1">
            {t('adminUserDetail.staffIn')} ({user.staffLink.length})
          </div>
          <div className="space-y-2 mb-4">
            {user.staffLink.map((s) => (
              <Card key={s.id}>
                <div className="text-sm font-medium mb-1">{s.organization.name}</div>
                <div className="text-xs text-tg-hint mb-1">{s.fullName}</div>
                {s.attendance.length > 0 && (
                  <>
                    <div className="text-xs text-tg-hint mt-2 mb-1">{t('adminUserDetail.attendance')}</div>
                    <div className="flex flex-wrap gap-1">
                      {s.attendance.slice(0, 14).map((a) => (
                        <div key={a.date} className="text-center">
                          <div className="text-xs">{statusIcon(a.status)}</div>
                          <div className="text-[10px] text-tg-hint">{a.date.slice(5)}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}
