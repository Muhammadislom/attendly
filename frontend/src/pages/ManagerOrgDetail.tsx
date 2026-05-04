import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, Me } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Button, Input, Help } from '../components/Card';
import Spinner from '../components/Spinner';
import { notify, showAlert, showConfirm } from '../lib/telegram';
import { useT } from '../lib/i18n';

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

export default function ManagerOrgDetail({ me: _me }: { me: Me }) {
  const { t } = useT();
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

  const windowStart = `${pad(org.markStartHour)}:${pad(org.markStartMin)}`;
  const windowEnd = `${pad(org.markEndHour)}:${pad(org.markEndMin)}`;

  return (
    <Layout title={org.name} back>
      <div className="mb-4 text-sm text-tg-hint">
        {t('orgDetail.window', windowStart, windowEnd, org.timezone)}
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {(
          [
            ['staff', t('orgDetail.tab.staff')],
            ['assistants', t('orgDetail.tab.assistants')],
            ['report', t('orgDetail.tab.report')],
            ['settings', t('orgDetail.tab.settings')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
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
  const { t } = useT();
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');
  const [withInvite, setWithInvite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editPos, setEditPos] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const submit = async () => {
    if (!fullName.trim()) return showAlert(t('staffTab.enterFullName'));
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
    const ok = await showConfirm(t('staffTab.confirmDelete'));
    if (!ok) return;
    try {
      await api(`/api/manager/staff/${staffId}`, { method: 'DELETE' });
      notify('success');
      await reload();
    } catch (e: any) {
      showAlert(e.message);
    }
  };

  const startEdit = (s: Org['staff'][number]) => {
    setEditingId(s.id);
    setEditName(s.fullName);
    setEditPos(s.position ?? '');
    setEditPhone(s.phone ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async (staffId: number) => {
    if (!editName.trim()) return showAlert(t('staffTab.enterFullName'));
    setEditSaving(true);
    try {
      await api(`/api/manager/staff/${staffId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fullName: editName.trim(),
          position: editPos.trim() || null,
          phone: editPhone.trim() || null,
        }),
      });
      notify('success');
      setEditingId(null);
      await reload();
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <Help title={t('staffTab.help.title')}>
        <p>{t('staffTab.help.body1')}</p>
        <p>{t('staffTab.help.body2')}</p>
      </Help>
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="mb-4">
          {t('staffTab.addStaff')}
        </Button>
      )}
      {showForm && (
        <Card className="mb-4">
          <div className="font-semibold mb-3">{t('staffTab.new')}</div>
          <Input
            label={t('common.fullName')}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('staffTab.namePlaceholder')}
          />
          <Input
            label={t('common.position')}
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder={t('staffTab.positionPlaceholder')}
            hint={t('common.optional')}
          />
          <Input
            label={t('common.phone')}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('staffTab.phonePlaceholder')}
            hint={t('common.optional')}
          />
          <label className="flex items-start gap-2 mb-3 px-1">
            <input
              type="checkbox"
              checked={withInvite}
              onChange={(e) => setWithInvite(e.target.checked)}
              className="w-5 h-5 mt-0.5 flex-shrink-0"
            />
            <span className="text-sm leading-snug">
              {t('staffTab.invite')}
              <div className="text-xs text-tg-hint mt-0.5">
                {t('staffTab.inviteHint')}
              </div>
            </span>
          </label>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(false)} variant="secondary">
              {t('common.cancel')}
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? t('common.saving') : t('common.add')}
            </Button>
          </div>
        </Card>
      )}
      {org.staff.length === 0 && !showForm && (
        <div className="text-center text-tg-hint mt-6">
          <div className="text-4xl mb-2">👥</div>
          {t('staffTab.empty')}
        </div>
      )}
      <div className="space-y-2">
        {org.staff.map((s) =>
          editingId === s.id ? (
            <Card key={s.id}>
              <Input
                label={t('common.fullName')}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <Input
                label={t('common.position')}
                value={editPos}
                onChange={(e) => setEditPos(e.target.value)}
                hint={t('common.optional')}
              />
              <Input
                label={t('common.phone')}
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                hint={t('common.optional')}
              />
              <div className="flex gap-2">
                <Button onClick={cancelEdit} variant="secondary">
                  {t('common.cancel')}
                </Button>
                <Button onClick={() => saveEdit(s.id)} disabled={editSaving}>
                  {editSaving ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </Card>
          ) : (
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
                      <span className="text-green-500">
                        {t('staffTab.linked')}
                      </span>
                    ) : s.inviteCode ? (
                      <span className="text-blue-500">
                        {t('staffTab.sendCode')}{' '}
                        <code>link:{s.inviteCode}</code>
                      </span>
                    ) : (
                      <span className="text-tg-hint">
                        {t('common.notLinked')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!s.userId && !s.inviteCode && (
                    <button
                      onClick={() => genInvite(s.id)}
                      className="text-xs px-3 py-2 rounded-xl bg-tg-button text-tg-buttonText font-semibold"
                    >
                      {t('common.code')}
                    </button>
                  )}
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs px-3 py-2 rounded-xl bg-tg-bg ring-1 ring-white/10 text-tg-text font-semibold"
                  >
                    {t('common.edit')}
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="text-xs px-3 py-2 rounded-xl bg-red-500 text-white font-semibold"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </Card>
          ),
        )}
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
  const { t } = useT();
  const [identifier, setIdentifier] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!identifier.trim()) return showAlert(t('asstTab.enterIdentifier'));
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
    const ok = await showConfirm(t('asstTab.confirmRemove'));
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
      <Help title={t('asstTab.help.title')}>
        <p>{t('asstTab.help.body1')}</p>
        <p>{t('asstTab.help.step1')}</p>
        <p>{t('asstTab.help.step2')}</p>
      </Help>
      <Card className="mb-4">
        <div className="font-semibold mb-3">{t('asstTab.add')}</div>
        <Input
          label={t('asstTab.label')}
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder={t('asstTab.placeholder')}
          hint={t('asstTab.hint')}
        />
        <Button onClick={submit} disabled={saving}>
          {saving ? t('common.adding') : t('common.add')}
        </Button>
      </Card>
      {org.assistants.length === 0 && (
        <div className="text-center text-tg-hint mt-6">
          <div className="text-4xl mb-2">🧑‍💼</div>
          {t('asstTab.empty')}
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
                  {a.user.username
                    ? `@${a.user.username}`
                    : `id ${a.user.telegramId}`}
                </div>
              </div>
              <button
                onClick={() => remove(a.id)}
                className="text-xs px-3 py-2 rounded-xl bg-red-500 text-white font-semibold"
              >
                {t('common.remove')}
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
  const { t } = useT();
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
    if (eh * 60 + em <= sh * 60 + sm) {
      return showAlert(t('manager.invalidWindow'));
    }
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
    const ok = await showConfirm(t('settingsTab.confirmDelete'));
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
      <Help title={t('settingsTab.help.title')}>
        <p>{t('settingsTab.help.body1')}</p>
        <p>{t('settingsTab.help.body2', org.timezone)}</p>
      </Help>
      <Card>
        <Input
          label={t('common.name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <div className="text-sm font-medium mb-1.5 px-1">
              {t('manager.windowStart')}
            </div>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
          <label className="block">
            <div className="text-sm font-medium mb-1.5 px-1">
              {t('manager.windowEnd')}
            </div>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition"
            />
          </label>
        </div>
        <Button onClick={save} disabled={saving} className="mb-2">
          {saving ? t('common.saving') : t('common.save')}
        </Button>
        <Button onClick={remove} variant="danger">
          {t('settingsTab.deleteOrg')}
        </Button>
      </Card>
    </div>
  );
}

function ReportTab({ org }: { org: Org }) {
  const { t } = useT();
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
      <Help title={t('report.help.title')}>
        <p>{t('report.help.body1')}</p>
        <p>{t('report.help.body2')}</p>
      </Help>
      <Card className="mb-3">
        <div className="text-sm font-medium mb-1.5 px-1">{t('report.date')}</div>
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
            <div className="text-xs text-tg-hint">{t('report.present')}</div>
          </div>
          <div className="bg-yellow-500/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-yellow-500">{late}</div>
            <div className="text-xs text-tg-hint">{t('report.late')}</div>
          </div>
          <div className="bg-red-500/10 rounded-xl p-3">
            <div className="text-2xl font-bold text-red-500">{absent}</div>
            <div className="text-xs text-tg-hint">{t('report.absent')}</div>
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
                {r.status === 'PRESENT' && (
                  <span className="text-green-500">✅</span>
                )}
                {r.status === 'LATE' && (
                  <span className="text-yellow-500">🟡</span>
                )}
                {r.status === 'ABSENT' && (
                  <span className="text-red-500">❌</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
