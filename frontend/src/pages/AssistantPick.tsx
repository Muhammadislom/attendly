import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card } from '../components/Card';
import Spinner from '../components/Spinner';

type Org = {
  id: number;
  name: string;
  markStartHour: number;
  markStartMin: number;
  markEndHour: number;
  markEndMin: number;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function AssistantPick({ me }: { me: Me }) {
  const [orgs, setOrgs] = useState<Org[] | null>(null);

  useEffect(() => {
    api<Org[]>('/api/assistant/orgs').then(setOrgs);
  }, []);

  if (!orgs)
    return (
      <Layout title="Выбор организации" back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  return (
    <Layout title="Отметить посещение" back>
      {orgs.length === 0 && (
        <div className="text-center text-tg-hint mt-10">
          <div className="text-5xl mb-3">🤷</div>
          Вы не назначены ни в одну организацию
        </div>
      )}
      <div className="space-y-3">
        {orgs.map((o) => (
          <Link key={o.id} to={`/assistant/orgs/${o.id}`}>
            <Card>
              <div className="font-semibold">{o.name}</div>
              <div className="text-xs text-tg-hint mt-1">
                ⏰ {pad(o.markStartHour)}:{pad(o.markStartMin)} —{' '}
                {pad(o.markEndHour)}:{pad(o.markEndMin)}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </Layout>
  );
}
