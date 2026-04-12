import { useEffect, useState } from 'react';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type Event = {
  type: 'user' | 'org' | 'mark';
  at: string;
  title: string;
  subtitle: string;
  meta?: any;
};

export default function AdminActivity({ me }: { me: Me }) {
  const { t, lang } = useT();
  const [events, setEvents] = useState<Event[] | null>(null);

  useEffect(() => {
    api<Event[]>('/api/admin/activity').then(setEvents);
  }, []);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!events)
    return (
      <Layout title={t('adminActivity.title')} back>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Layout>
    );

  const formatDt = (iso: string) =>
    new Date(iso).toLocaleString(lang === 'uz' ? 'uz-UZ' : 'ru-RU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

  const icon = (type: Event['type']) =>
    type === 'user' ? '👤' : type === 'org' ? '🏢' : '✅';

  const label = (type: Event['type']) =>
    type === 'user'
      ? t('adminActivity.userEvent')
      : type === 'org'
      ? t('adminActivity.orgEvent')
      : t('adminActivity.markEvent');

  const badgeBg = (type: Event['type']) =>
    type === 'user'
      ? 'bg-blue-500'
      : type === 'org'
      ? 'bg-green-500'
      : 'bg-tg-secondary';

  return (
    <Layout title={t('adminActivity.title')} back>
      <Help title={t('adminActivity.help.title')}>
        <p>{t('adminActivity.help.body')}</p>
      </Help>

      {events.length === 0 ? (
        <div className="text-center text-tg-hint mt-10">{t('adminActivity.empty')}</div>
      ) : (
        <div className="space-y-1.5">
          {events.map((e, i) => (
            <Card key={i} className="flex items-start gap-3 py-2.5">
              <div className="text-2xl mt-0.5">{icon(e.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${badgeBg(e.type)}`}>
                    {label(e.type)}
                  </span>
                  <span className="text-[10px] text-tg-hint">{formatDt(e.at)}</span>
                </div>
                <div className="text-sm font-medium truncate">{e.title}</div>
                <div className="text-xs text-tg-hint truncate">{e.subtitle}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Layout>
  );
}
