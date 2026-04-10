import { Link } from 'react-router-dom';
import { Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';

type MenuItem = { to: string; title: string; subtitle: string; icon: string };

export default function Home({ me, reload }: { me: Me; reload: () => void }) {
  const items: MenuItem[] = [];

  // Super admin ONLY manages users (assigns/revokes managers). They do not
  // create organizations or mark attendance — those are manager/assistant
  // responsibilities per business logic.
  if (me.user.role === 'SUPER_ADMIN') {
    items.push({
      to: '/admin/users',
      title: 'Пользователи',
      subtitle: 'Все пользователи бота и назначение управляющих',
      icon: '👑',
    });
  }
  if (me.user.role === 'MANAGER' || me.managedOrgs.length > 0) {
    items.push({
      to: '/manager',
      title: 'Мои организации',
      subtitle: 'Управление сотрудниками, ассистентами и отчётами',
      icon: '🏢',
    });
  }
  if (me.user.role === 'ASSISTANT' || me.assistantOf.length > 0) {
    items.push({
      to: '/assistant',
      title: 'Отметить посещение',
      subtitle: 'Отметьте кто пришёл сегодня',
      icon: '✅',
    });
  }
  if (me.staffLinks.length > 0) {
    items.push({
      to: '/staff',
      title: 'Мои посещения',
      subtitle: 'История моих посещений',
      icon: '📋',
    });
  }

  const greeting = me.user.firstName ? `Привет, ${me.user.firstName}!` : 'Привет!';
  const roleLabel =
    me.user.role === 'SUPER_ADMIN'
      ? 'Супер-админ'
      : me.user.role === 'MANAGER'
      ? 'Управляющий'
      : me.user.role === 'ASSISTANT'
      ? 'Ассистент'
      : me.user.role === 'STAFF'
      ? 'Сотрудник'
      : 'Нет роли';

  return (
    <Layout title="Главная">
      <div className="mb-6">
        <div className="text-2xl font-bold">{greeting}</div>
        <div className="text-tg-hint text-sm mt-1">{roleLabel}</div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <div className="text-4xl mb-3">⏳</div>
            <div className="font-semibold">Ожидание назначения</div>
            <div className="text-tg-hint text-sm mt-2">
              Свяжитесь с вашим управляющим или супер-админом чтобы получить доступ.
            </div>
            <button
              onClick={reload}
              className="mt-4 px-4 py-2 rounded-xl bg-tg-button text-tg-buttonText text-sm"
            >
              Обновить
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
