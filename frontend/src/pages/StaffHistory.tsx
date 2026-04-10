import { useEffect, useState } from 'react';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Spinner from '../components/Spinner';

type StaffLink = {
  id: number;
  fullName: string;
  position: string | null;
  organization: { id: number; name: string };
  attendance: {
    id: number;
    date: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE';
  }[];
};

export default function StaffHistory({ me }: { me: Me }) {
  const [data, setData] = useState<StaffLink[] | null>(null);

  useEffect(() => {
    api<StaffLink[]>('/api/staff/history').then(setData);
  }, []);

  if (!data)
    return (
      <Layout title="Мои посещения" back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  return (
    <Layout title="Мои посещения" back>
      {data.length === 0 && (
        <div className="text-center text-tg-hint mt-10">
          Вы не привязаны к профилю сотрудника
        </div>
      )}
      {data.map((link) => {
        const present = link.attendance.filter(
          (a) => a.status === 'PRESENT',
        ).length;
        const late = link.attendance.filter((a) => a.status === 'LATE').length;
        const absent = link.attendance.filter(
          (a) => a.status === 'ABSENT',
        ).length;
        return (
          <div key={link.id} className="mb-6">
            <Card className="mb-3">
              <div className="font-semibold">{link.organization.name}</div>
              <div className="text-xs text-tg-hint">{link.fullName}</div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="bg-green-500/10 rounded-xl p-2">
                  <div className="font-bold text-green-500">{present}</div>
                  <div className="text-xs text-tg-hint">Пришёл</div>
                </div>
                <div className="bg-yellow-500/10 rounded-xl p-2">
                  <div className="font-bold text-yellow-500">{late}</div>
                  <div className="text-xs text-tg-hint">Опоздал</div>
                </div>
                <div className="bg-red-500/10 rounded-xl p-2">
                  <div className="font-bold text-red-500">{absent}</div>
                  <div className="text-xs text-tg-hint">Отсутств.</div>
                </div>
              </div>
            </Card>
            <div className="space-y-2">
              {link.attendance.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{a.date}</div>
                    <div>
                      {a.status === 'PRESENT' && <span>✅ Пришёл</span>}
                      {a.status === 'LATE' && <span>🟡 Опоздал</span>}
                      {a.status === 'ABSENT' && <span>❌ Отсутствовал</span>}
                    </div>
                  </div>
                </Card>
              ))}
              {link.attendance.length === 0 && (
                <div className="text-center text-tg-hint text-sm">
                  Записей пока нет
                </div>
              )}
            </div>
          </div>
        );
      })}
    </Layout>
  );
}
