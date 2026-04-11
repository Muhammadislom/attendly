import { Link } from 'react-router-dom';
import { Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import { useT } from '../lib/i18n';

type MenuItem = { to: string; title: string; subtitle: string; icon: string };

export default function Home({ me, reload }: { me: Me; reload: () => void }) {
  const { t } = useT();
  const items: MenuItem[] = [];

  // Super admin ONLY manages users (assigns/revokes managers) and views
  // system-wide stats and orgs. They do not create organizations or mark
  // attendance — those are manager/assistant responsibilities per business
  // logic.
  if (me.user.role === 'SUPER_ADMIN') {
    items.push({
      to: '/admin',
      title: t('adminDash.title'),
      subtitle: t('adminDash.menuStatsSub'),
      icon: '👑',
    });
  }
  if (me.user.role === 'MANAGER' || me.managedOrgs.length > 0) {
    items.push({
      to: '/manager',
      title: t('home.menu.orgs'),
      subtitle: t('home.menu.orgsSub'),
      icon: '🏢',
    });
  }
  if (me.user.role === 'ASSISTANT' || me.assistantOf.length > 0) {
    items.push({
      to: '/assistant',
      title: t('home.menu.mark'),
      subtitle: t('home.menu.markSub'),
      icon: '✅',
    });
  }
  if (me.staffLinks.length > 0) {
    items.push({
      to: '/staff',
      title: t('home.menu.history'),
      subtitle: t('home.menu.historySub'),
      icon: '📋',
    });
  }

  const greeting = me.user.firstName
    ? t('home.greeting', me.user.firstName)
    : t('home.greetingAnon');
  const roleLabel = t(`role.${me.user.role}` as any);

  return (
    <Layout title={t('home.title')}>
      <div className="mb-6">
        <div className="text-2xl font-bold">{greeting}</div>
        <div className="text-tg-hint text-sm mt-1">{roleLabel}</div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">⏳</div>
            <div className="font-semibold">{t('home.waiting')}</div>
            <div className="text-tg-hint text-sm mt-2">
              {t('home.waitingHint')}
            </div>
            <button
              onClick={reload}
              className="mt-4 px-4 py-2 rounded-xl bg-tg-button text-tg-buttonText text-sm"
            >
              {t('common.refresh')}
            </button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Link key={it.to} to={it.to} className="block">
              <Card className="flex items-center gap-3">
                <div className="text-3xl">{it.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{it.title}</div>
                  <div className="text-sm text-tg-hint truncate">
                    {it.subtitle}
                  </div>
                </div>
                <div className="text-tg-hint">›</div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Layout>
  );
}
