import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { useT } from '../lib/i18n';

type OrgRow = {
  id: number;
  name: string;
  markStartHour: number;
  markStartMin: number;
  markEndHour: number;
  markEndMin: number;
  manager: { firstName: string; lastName: string | null; username: string | null };
  totalStaff: number;
  marked: number;
  windowState: 'before' | 'open' | 'after';
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AdminToday({ me }: { me: Me }) {
  const { t } = useT();
  const [rows, setRows] = useState<OrgRow[] | null>(null);

  useEffect(() => {
    api<OrgRow[]>('/api/admin/today').then(setRows);
  }, []);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  if (!rows)
    return (
      <Layout title={t('adminToday.title')} back>
        <div className="flex justify-center py-12"><Spinner /></div>
      </Layout>
    );

  if (rows.length === 0)
    return (
      <Layout title={t('adminToday.title')} back>
        <div className="text-center text-tg-hint mt-10">{t('adminToday.empty')}</div>
      </Layout>
    );

  const badgeColor = (s: OrgRow['windowState']) =>
    s === 'open'
      ? 'bg-green-500'
      : s === 'after'
      ? 'bg-red-500'
      : 'bg-yellow-500';

  const badgeText = (s: OrgRow['windowState']) =>
    s === 'open'
      ? t('adminToday.open')
      : s === 'after'
      ? t('adminToday.after')
      : t('adminToday.before');

  return (
    <Layout title={t('adminToday.title')} back>
      <Help title={t('adminToday.help.title')}>
        <p>{t('adminToday.help.body')}</p>
      </Help>
      <div className="space-y-2">
        {rows.map((o) => {
          const pct = o.totalStaff > 0 ? Math.round((o.marked / o.totalStaff) * 100) : 0;
          const markedLabel =
            o.totalStaff === 0
              ? ''
              : o.marked === o.totalStaff
              ? t('adminToday.allDone')
              : o.marked === 0
              ? t('adminToday.noneYet')
              : t('adminToday.marked', o.marked, o.totalStaff);

          return (
            <Link key={o.id} to={`/admin/orgs/${o.id}`}>
              <Card>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="font-semibold truncate">{o.name}</div>
                  <span className={`${badgeColor(o.windowState)} text-white text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap`}>
                    {badgeText(o.windowState)}
                  </span>
                </div>
                <div className="text-xs text-tg-hint mb-1">
                  ⏰ {pad(o.markStartHour)}:{pad(o.markStartMin)} — {pad(o.markEndHour)}:{pad(o.markEndMin)}
                </div>
                {o.totalStaff > 0 && (
                  <>
                    <div className="w-full bg-tg-secondary rounded-full h-2 mb-1">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs text-tg-hint">{markedLabel}</div>
                  </>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </Layout>
  );
}
