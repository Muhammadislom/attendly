import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert } from '../lib/telegram';
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

      <ExportBlock orgId={org.id} />

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

function firstOfMonth(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}-01`;
}

function todayIso(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function ExportBlock({ orgId }: { orgId: number }) {
  const { t } = useT();
  const [from, setFrom] = useState(firstOfMonth());
  const [to, setTo] = useState(todayIso());
  const [sending, setSending] = useState(false);

  const validate = (): string | null => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return t('export.errInvalidPeriod');
    }
    if (from > to) return t('export.errInvalidPeriod');
    const f = new Date(from + 'T00:00:00Z');
    const tt = new Date(to + 'T00:00:00Z');
    const days = Math.round((tt.getTime() - f.getTime()) / 86400000) + 1;
    if (days > 31) return t('export.errPeriodTooLong');
    if (
      f.getUTCMonth() !== tt.getUTCMonth() ||
      f.getUTCFullYear() !== tt.getUTCFullYear()
    ) {
      return t('export.errCrossMonth');
    }
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) return showAlert(err);
    setSending(true);
    try {
      await api(`/api/admin/orgs/${orgId}/export-timesheet`, {
        method: 'POST',
        body: JSON.stringify({ from, to }),
      });
      notify('success');
      showAlert(t('export.sentSuccess'));
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Help title={t('export.help.title')}>
        <p>{t('export.help.body1')}</p>
        <p>{t('export.help.body2')}</p>
      </Help>
      <Card className="mb-3">
        <div className="font-semibold mb-2">{t('export.title')}</div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <label className="block">
            <div className="text-xs text-tg-hint mb-1 px-1">
              {t('export.from')}
            </div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-2xl px-3 py-2 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
          <label className="block">
            <div className="text-xs text-tg-hint mb-1 px-1">
              {t('export.to')}
            </div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-2xl px-3 py-2 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
        </div>
        <Button onClick={submit} disabled={sending}>
          {sending ? t('export.sending') : t('export.button')}
        </Button>
      </Card>
    </>
  );
}
