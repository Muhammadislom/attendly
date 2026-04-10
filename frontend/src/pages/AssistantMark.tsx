import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { haptic, notify, showAlert } from '../lib/telegram';
import { useT } from '../lib/i18n';

type Status = 'PRESENT' | 'LATE' | 'ABSENT' | null;

type StaffRow = {
  id: number;
  fullName: string;
  position: string | null;
  status: Status;
};

type Data = {
  org: { id: number; name: string };
  date: string;
  isOpen: boolean;
  windowStart: string;
  windowEnd: string;
  now: string;
  staff: StaffRow[];
};

export default function AssistantMark({ me: _me }: { me: Me }) {
  const { t, lang } = useT();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [pending, setPending] = useState<number | null>(null);

  const load = async () => {
    const res = await api<Data>(`/api/assistant/orgs/${id}/today`);
    setData(res);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!data)
    return (
      <Layout title={t('assistantPick.title')} back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  const mark = async (
    staffId: number,
    status: 'PRESENT' | 'LATE' | 'ABSENT',
  ) => {
    haptic('light');
    setPending(staffId);
    // Optimistic
    setData((prev) =>
      prev
        ? {
            ...prev,
            staff: prev.staff.map((s) =>
              s.id === staffId ? { ...s, status } : s,
            ),
          }
        : prev,
    );
    try {
      await api(`/api/assistant/orgs/${id}/mark`, {
        method: 'POST',
        body: JSON.stringify({ staffId, status }),
      });
      notify('success');
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
      await load();
    } finally {
      setPending(null);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const present = data.staff.filter((s) => s.status === 'PRESENT').length;
  const late = data.staff.filter((s) => s.status === 'LATE').length;
  const unmarked = data.staff.filter((s) => s.status === null).length;

  return (
    <Layout title={data.org.name} back>
      <Help title={t('mark.help.title')}>
        <p>{t('mark.help.body1')}</p>
        <p className="whitespace-pre-line">{t('mark.help.body2')}</p>
        <p>{t('mark.help.body3')}</p>
      </Help>
      <Card className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-sm text-tg-hint">📅 {data.date}</div>
            <div className="text-xs text-tg-hint">
              {t(
                'mark.window',
                formatTime(data.windowStart),
                formatTime(data.windowEnd),
              )}
            </div>
          </div>
          <div>
            {data.isOpen ? (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                {t('mark.open')}
              </span>
            ) : (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {t('mark.closed')}
              </span>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-bold text-lg text-green-500">{present}</div>
            <div className="text-tg-hint">{t('mark.presentShort')}</div>
          </div>
          <div>
            <div className="font-bold text-lg text-yellow-500">{late}</div>
            <div className="text-tg-hint">{t('mark.lateShort')}</div>
          </div>
          <div>
            <div className="font-bold text-lg text-tg-hint">{unmarked}</div>
            <div className="text-tg-hint">{t('mark.notMarked')}</div>
          </div>
        </div>
      </Card>

      {!data.isOpen && (
        <div className="text-xs text-center text-tg-hint mb-3">
          {t('mark.closedBanner')}
        </div>
      )}

      <div className="space-y-2">
        {data.staff.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{s.fullName}</div>
                {s.position && (
                  <div className="text-xs text-tg-hint truncate">
                    {s.position}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {(['PRESENT', 'LATE', 'ABSENT'] as const).map((st) => {
                  const active = s.status === st;
                  const icon =
                    st === 'PRESENT' ? '✅' : st === 'LATE' ? '🟡' : '❌';
                  const bg =
                    st === 'PRESENT'
                      ? 'bg-green-500'
                      : st === 'LATE'
                      ? 'bg-yellow-500'
                      : 'bg-red-500';
                  return (
                    <button
                      key={st}
                      disabled={!data.isOpen || pending === s.id}
                      onClick={() => mark(s.id, st)}
                      className={`w-11 h-11 rounded-full text-lg transition-all ${
                        active
                          ? `${bg} text-white scale-110`
                          : 'bg-tg-secondary opacity-60'
                      } disabled:opacity-30`}
                    >
                      {icon}
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Layout>
  );
}
