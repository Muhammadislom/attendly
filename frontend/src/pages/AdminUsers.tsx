import { useEffect, useState } from 'react';
import { api, Me, Role } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert, haptic } from '../lib/telegram';

type U = {
  id: number;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: Role;
};

export default function AdminUsers({ me }: { me: Me }) {
  const [users, setUsers] = useState<U[] | null>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState<number | null>(null);

  const load = async () => {
    const data = await api<U[]>('/api/admin/users');
    setUsers(data);
  };

  useEffect(() => {
    load();
  }, []);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title="Доступ запрещён" back>
        <div className="text-center text-tg-hint">Только для супер-админа</div>
      </Layout>
    );
  }

  if (!users)
    return (
      <Layout title="Пользователи" back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  const setRole = async (id: number, role: 'MANAGER' | 'STAFF' | 'NONE') => {
    setSaving(id);
    haptic('medium');
    try {
      const updated = await api<U>(`/api/admin/users/${id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      setUsers((prev) =>
        prev!.map((u) => (u.id === id ? { ...u, role: updated.role } : u)),
      );
      notify('success');
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSaving(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      (u.firstName || '').toLowerCase().includes(q) ||
      (u.lastName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      u.telegramId.includes(q)
    );
  });

  return (
    <Layout title="Пользователи" back>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск..."
        className="w-full rounded-2xl px-4 py-3 bg-tg-secondary outline-none mb-3"
      />
      <div className="space-y-2">
        {filtered.map((u) => {
          const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
          const isManager = u.role === 'MANAGER';
          return (
            <Card key={u.id}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{name || 'Без имени'}</div>
                  <div className="text-xs text-tg-hint truncate">
                    {u.username ? `@${u.username}` : `id ${u.telegramId}`}
                  </div>
                  <div className="text-xs mt-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full ${
                        u.role === 'SUPER_ADMIN'
                          ? 'bg-purple-500 text-white'
                          : u.role === 'MANAGER'
                          ? 'bg-green-500 text-white'
                          : u.role === 'ASSISTANT'
                          ? 'bg-blue-500 text-white'
                          : u.role === 'STAFF'
                          ? 'bg-gray-400 text-white'
                          : 'bg-tg-secondary text-tg-hint'
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>
                </div>
                {u.role !== 'SUPER_ADMIN' && (
                  <button
                    disabled={saving === u.id}
                    onClick={() => setRole(u.id, isManager ? 'NONE' : 'MANAGER')}
                    className={`text-xs px-3 py-2 rounded-xl font-semibold ${
                      isManager
                        ? 'bg-red-500 text-white'
                        : 'bg-tg-button text-tg-buttonText'
                    }`}
                  >
                    {isManager ? 'Снять' : 'Управляющий'}
                  </button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
}
