import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type Status = 'PRESENT' | 'LATE' | 'ABSENT' | null;

type StaffRow = {
  id: number;
  fullName: string;
  position: string | null;
  phone: string | null;
  active: boolean;
  status: Status;
};

type AssistantRow = {
  id: number;
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
    telegramId: string;
  };
};

type Data = {
  org: {
    id: number;
    name: string;
    timezone: string;
    markStartHour: number;
    markStartMin: number;
    markEndHour: number;
    markEndMin: number;
    manager: {
      id: number;
      firstName: string;
      lastName: string | null;
      username: string | null;
    };
    assistants: AssistantRow[];
  };
  date: string;
  isOpen: boolean;
  windowStart: string;
  windowEnd: string;
  summary: { total: number; present: number; late: number; absent: number; unmarked: number };
  staffWithStatus: StaffRow[];
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AdminOrgDetail({ me }: { me: Me }) {
  const { t, lang } = useT();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    api<Data>(`/api/admin/orgs/${id}`).then(setData);
  }, [id]);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!data)
    return (
      <Layout title={t('adminOrgs.title')} back>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Layout>
    );

  const { org, summary } = data;
  const mgrName = [org.manager.firstName, org.manager.lastName].filter(Boolean).join(' ');

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const statusIcon = (s: Status) =>
    s === 'PRESENT' ? '✅' : s === 'LATE' ? '🟡' : s === 'ABSENT' ? '❌' : '⬜';

  return (
    <Layout title={org.name} back>
      <div className="text-xs text-tg-hint mb-1 px-1">
        {t('adminOrgDetail.readOnly')}
      </div>

      {/* Header info */}
      <Card className="mb-3">
        <div className="text-sm text-tg-hint mb-1">
          {t('adminOrgs.manager', mgrName || t('adminOrgs.noManagerName'))}
          {org.manager.username && ` · @${org.manager.username}`}
        </div>
        <div className="text-sm text-tg-hint">
          ⏰ {pad(org.markStartHour)}:{pad(org.markStartMin)} — {pad(org.markEndHour)}:{pad(org.markEndMin)} · {org.timezone}
        </div>
        <div className="text-xs text-tg-hint mt-1">
          📅 {data.date} ·{' '}
          {data.isOpen ? (
            <span className="text-green-500">{t('adminToday.open')}</span>
          ) : (
            <span className="text-red-500">{t('adminToday.after')}</span>
          )}
          {' · '}
          {formatTime(data.windowStart)} — {formatTime(data.windowEnd)}
        </div>
      </Card>

      {/* Today summary */}
      <Card className="mb-3">
        <div className="font-semibold mb-2">{t('adminOrgDetail.todaySummary')}</div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <div className="text-lg font-bold text-green-500">{summary.present}</div>
            <div className="text-tg-hint">{t('adminOrgDetail.present')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-500">{summary.late}</div>
            <div className="text-tg-hint">{t('adminOrgDetail.late')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-500">{summary.absent}</div>
            <div className="text-tg-hint">{t('adminOrgDetail.absent')}</div>
          </div>
          <div>
            <div className="text-lg font-bold text-tg-hint">{summary.unmarked}</div>
            <div className="text-tg-hint">{t('adminOrgDetail.unmarked')}</div>
          </div>
        </div>
      </Card>

      {/* Staff list */}
      <div className="font-semibold text-sm mb-2 px-1">
        {t('adminOrgDetail.staffList')} ({data.staffWithStatus.length})
      </div>
      {data.staffWithStatus.length === 0 ? (
        <div className="text-center text-tg-hint text-sm mb-4">{t('adminOrgDetail.noStaff')}</div>
      ) : (
        <div className="space-y-1.5 mb-4">
          {data.staffWithStatus.map((s) => (
            <Card key={s.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{s.fullName}</div>
                {s.position && <div className="text-xs text-tg-hint truncate">{s.position}</div>}
              </div>
              <div className="text-xl">{statusIcon(s.status)}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Assistants */}
      <div className="font-semibold text-sm mb-2 px-1">
        {t('adminOrgDetail.assistants')} ({org.assistants.length})
      </div>
      {org.assistants.length === 0 ? (
        <div className="text-center text-tg-hint text-sm">{t('adminOrgDetail.noAssistants')}</div>
      ) : (
        <div className="space-y-1.5">
          {org.assistants.map((a) => {
            const name = [a.user.firstName, a.user.lastName].filter(Boolean).join(' ');
            return (
              <Card key={a.id} className="py-2">
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs text-tg-hint">
                  {a.user.username ? `@${a.user.username}` : `id ${a.user.telegramId}`}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
}
