import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Input, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert, showConfirm } from '../lib/telegram';

type Staff = {
  id: number;
  fullName: string;
  position: string | null;
  phone: string | null;
  userId: number | null;
  inviteCode: string | null;
};

type Assistant = {
  id: number;
  user: {
    id: number;
    firstName: string;
    lastName: string | null;
    username: string | null;
    telegramId: string;
  };
};

type Org = {
  id: number;
  name: string;
  markStartHour: number;
  markStartMin: number;
  markEndHour: number;
  markEndMin: number;
  timezone: string;
  staff: Staff[];
  assistants: Assistant[];
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

export default function ManagerOrgDetail({ me }: { me: Me }) {
  const { id } = useParams<{ id: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [tab, setTab] = useState<'staff' | 'assistants' | 'settings' | 'report'>(
    'staff',
  );

  const load = async () => {
    const data = await api<Org>(`/api/manager/orgs/${id}`);
    setOrg(data);
  };

  useEffect(() => {
    load();
  }, [id]);

  if (!org)
    return (
      <Layout title="..." back>
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      </Layout>
    );

  return (
    <Layout title={org.name} back>
      <div className="mb-4 text-sm text-tg-hint">
        Окно отметки: ⏰ {pad(org.markStartHour)}:{pad(org.markStartMin)} —{' '}
        {pad(org.markEndHour)}:{pad(org.markEndMin)} ({org.timezone})
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(
          [
            ['staff', '👥 Персонал'],
            ['assistants', '🧑‍💼 Ассистенты'],
            ['report', '📊 Отчёт'],
            ['settings', '⚙️ Настройки'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-2xl whitespace-nowrap text-sm font-semibold ${
              tab === key
                ? 'bg-tg-button text-tg-buttonText'
                : 'bg-tg-secondary text-tg-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'staff' && <StaffTab org={org} reload={load} />}
      {tab === 'assistants' && <AssistantsTab org={org} reload={load} />}
      {tab === 'settings' && <SettingsTab org={org} reload={load} />}
      {tab === 'report' && <ReportTab org={org} />}
    </Layout>
  );
}

function StaffTab({ org, reload }: { org: Org; reload: () => Promise<void> }) {
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [withInvite, setWithInvite] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!fullName.trim()) return showAlert('Введите ФИО');
    setSaving(true);
    try {
      await api(`/api/manager/orgs/${org.id}/staff`, {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          position: position || undefined,
          phone: phone || undefined,
          generateInvite: withInvite,
        }),
      });
      notify('success');
      setFullName('');
      setPosition('');
      setPhone('');
      setWithInvite(false);
      setShowForm(false);
      await reload();
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSaving(false);
    }
  };

  const genInvite = async (staffId: number) => {
    try {
      await api(`/api/manager/staff/${staffId}/invite`, { method: 'POST' });
      notify('success');
      await reload();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  const remove = async (staffId: number) => {
    const ok = await showConfirm('Удалить сотрудника?');
    if (!ok) return;
    try {
      await api(`/api/manager/staff/${staffId}`, { method: 'DELETE' });
      notify('success');
      await reload();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  return (
    <div>
      <Help title="Как добавить сотрудника">
        <p>
          Сотрудник — это человек, чью посещаемость отмечают ассистенты
          (например, повар, уборщица, продавец). Ему <b>не нужен Telegram</b> —
          просто введите ФИО.
        </p>
        <p>
          Если сотрудник хочет сам видеть свою историю посещений в боте —
          включите «Создать код привязки» при добавлении (или нажмите кнопку
          «Код» позже). Отдайте код сотруднику, он отправит его боту как
          сообщение и привяжет свой Telegram.
        </p>
      </Help>
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-4">
          + Добавить сотрудника
        </Button>
      )}
      {showForm && (
        <Card className="mb-4">
          <div className="font-semibold mb-3">Новый сотрудник</div>
          <Input
            label="ФИО"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иванов Иван"
          />
          <Input
            label="Должность"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Повар"
            hint="Необязательно"
          />
          <Input
            label="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            hint="Необязательно"
          />
          <label className="flex items-start gap-2 mb-3 px-1">
            <input
              type="checkbox"
              checked={withInvite}
              onChange={(e) => setWithInvite(e.target.checked)}
              className="w-5 h-5 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm leading-snug">
              Создать код привязки к Telegram
              <div className="text-xs text-tg-hint mt-0.5">
                Нужен только если сотрудник сам хочет видеть свою историю
              </div>
            </span>
          </label>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(false)} variant="secondary">
              Отмена
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? 'Сохранение...' : 'Добавить'}
            </Button>
          </div>
        </Card>
      )}
      {org.staff.length === 0 && !showForm && (
        <div className="text-center text-tg-hint mt-6">
          <div className="text-4xl mb-2">👥</div>
          Пока никого нет
        </div>
      )}
      <div className="space-y-2">
        {org.staff.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{s.fullName}</div>
                {s.position && (
                  <div className="text-xs text-tg-hint truncate">
                    {s.position}
                  </div>
                )}
                {s.phone && (
                  <div className="text-xs text-tg-hint">{s.phone}</div>
                )}
                <div className="text-xs mt-1">
                  {s.userId ? (
                    <span className="text-green-500">🔗 Привязан к Telegram</span>
                  ) : s.inviteCode ? (
                    <span className="text-blue-500">
                      Код: отправьте в бот <code>link:{s.inviteCode}</code>
                    </span>
                  ) : (
                    <span className="text-tg-hint">Не привязан</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {!s.userId && !s.inviteCode && (
                  <button
                    onClick={() => genInvite(s.id)}
                    className="text-xs px-3 py-2 rounded-xl bg-tg-button text-tg-buttonText font-semibold"
                  >
                    Код
                  </button>
                )}
                <button
                  onClick={() => remove(s.id)}
                  className="text-xs px-3 py-2 rounded-xl bg-red-500 text-white font-semibold"
                >
                  Удалить
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AssistantsTab({
  org,
  reload,
}: {
  org: Org;
  reload: () => Promise<void>;
}) {
  const [identifier, setIdentifier] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!identifier.trim()) return showAlert('Введите @username или ID');
    setSaving(true);
    try {
      await api(`/api/manager/orgs/${org.id}/assistants`, {
        method: 'POST',
        body: JSON.stringify({ identifier: identifier.trim() }),
      });
      notify('success');
      setIdentifier('');
      await reload();
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (assistantId: number) => {
    const ok = await showConfirm('Убрать ассистента?');
    if (!ok) return;
    try {
      await api(`/api/manager/assistants/${assistantId}`, { method: 'DELETE' });
      await reload();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  return (
    <div>
      <Help title="Как добавить ассистента">
        <p>
          Ассистент — это человек, который будет отмечать посещаемость
          сотрудников в приложении (например, администратор смены).
        </p>
        <p>
          <b>Шаг 1.</b> Попросите ассистента открыть бота и нажать{' '}
          <code>/start</code> — без этого бот его «не знает».
        </p>
        <p>
          <b>Шаг 2.</b> Введите его <b>@username</b> (например,{' '}
          <code>@ivanov</code>) или <b>числовой Telegram ID</b>. Узнать ID можно
          командой <code>/id</code> в боте — он пришлёт в ответ число вида{' '}
          <code>123456789</code>.
        </p>
      </Help>
      <Card className="mb-4">
        <div className="font-semibold mb-3">Добавить ассистента</div>
        <Input
          label="@username или Telegram ID"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="@ivanov или 123456789"
          hint="Ассистент должен был хотя бы раз нажать /start в боте"
        />
        <Button onClick={submit} disabled={saving}>
          {saving ? 'Добавление...' : 'Добавить'}
        </Button>
      </Card>
      {org.assistants.length === 0 && (
        <div className="text-center text-tg-hint mt-6">
          <div className="text-4xl mb-2">🧑‍💼</div>
          Ассистентов пока нет
        </div>
      )}
      <div className="space-y-2">
        {org.assistants.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">
                  {a.user.firstName} {a.user.lastName || ''}
                </div>
                <div className="text-xs text-tg-hint truncate">
                  {a.user.username ? `@${a.user.username}` : `id ${a.user.telegramId}`}
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-xs px-3 py-2 rounded-xl bg-red-500 text-white font-semibold"
              >
                Убрать
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({
  org,
  reload,
}: {
  org: Org;
  reload: () => Promise<void>;
}) {
  const [name, setName] = useState(org.name);
  const [startTime, setStartTime] = useState(
    `${pad(org.markStartHour)}:${pad(org.markStartMin)}`,
  );
  const [endTime, setEndTime] = useState(
    `${pad(org.markEndHour)}:${pad(org.markEndMin)}`,
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    setSaving(true);
    try {
      await api(`/api/manager/orgs/${org.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name,
          markStartHour: sh,
          markStartMin: sm,
          markEndHour: eh,
          markEndMin: em,
        }),
      });
      notify('success');
      await reload();
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const ok = await showConfirm(
      'Удалить организацию? Все сотрудники и записи будут потеряны.',
    );
    if (!ok) return;
    try {
      await api(`/api/manager/orgs/${org.id}`, { method: 'DELETE' });
      history.back();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  return (
    <div>
      <Help title="Что такое окно отметки?">
        <p>
          Окно отметки — это промежуток времени, в который ассистент может
          отмечать посещаемость сотрудников. Например, <b>07:00 — 08:00</b>:
          ассистент открывает приложение утром и отмечает «пришёл / опоздал /
          отсутствует».
        </p>
        <p>
          После закрытия окна отметить уже нельзя — отчёт «замораживается» и
          автоматически уходит вам в Telegram. Часовой пояс:{' '}
          <b>{org.timezone}</b>.
        </p>
      </Help>
      <Card>
        <Input
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <div className="text-sm font-medium mb-1.5 px-1">Начало окна</div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium mb-1.5 px-1">Конец окна</div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
        </div>
        <Button onClick={save} disabled={saving} className="mb-2">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
        <Button onClick={remove} variant="danger">
          Удалить организацию
        </Button>
      </Card>
    </div>
  );
}

function ReportTab({ org }: { org: Org }) {
  const [data, setData] = useState<any>(null);
  const [date, setDate] = useState('');

  const load = async (d?: string) => {
    setData(null);
    const q = d ? `?date=${d}` : '';
    const res = await api(`/api/manager/orgs/${org.id}/report${q}`);
    setData(res);
  };

  useEffect(() => {
    load();
  }, [org.id]);

  if (!data)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );

  const present = data.rows.filter((r: any) => r.status === 'PRESENT').length;
  const late = data.rows.filter((r: any) => r.status === 'LATE').length;
  const absent = data.rows.filter((r: any) => r.status === 'ABSENT').length;

  return (
    <div>
      <Help title="Что показывает отчёт">
        <p>
          Здесь вы видите посещаемость за выбранный день. По умолчанию
          показывается сегодняшний день — выберите другую дату, чтобы
          посмотреть историю.
        </p>
        <p>
          Сотрудники, которых ассистент не отметил до закрытия окна,
          автоматически считаются отсутствующими (❌).
        </p>
      </Help>
      <Card className="mb-3">
        <div className="text-sm font-medium mb-1.5 px-1">Дата</div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="date"
            value={date || data.date}
            onChange={(e) => {
              setDate(e.target.value);
              load(e.target.value);
            }}
            className="flex-1 rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-green-500/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-green-500">{present}</div>
            <div className="text-xs text-tg-hint">Пришли</div>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-yellow-500">{late}</div>
            <div className="text-xs text-tg-hint">Опоздали</div>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-red-500">{absent}</div>
            <div className="text-xs text-tg-hint">Отсутств.</div>
          </div>
        </div>
      </Card>
      <div className="space-y-2">
        {data.rows.map((r: any) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-semibold truncate">{r.fullName}</div>
                {r.position && (
                  <div className="text-xs text-tg-hint truncate">
                    {r.position}
                  </div>
                )}
              </div>
              <div>
                {r.status === 'PRESENT' && <span className="text-green-500">✅</span>}
                {r.status === 'LATE' && <span className="text-yellow-500">🟡</span>}
                {r.status === 'ABSENT' && <span className="text-red-500">❌</span>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
