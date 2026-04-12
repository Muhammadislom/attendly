import { useState } from 'react';
import { api, Me, Role } from '../lib/api';
import Layout from '../components/Layout';
import { Card, Help, Button } from '../components/Card';
import { notify, showAlert, haptic, showConfirm } from '../lib/telegram';
import { useT } from '../lib/i18n';

type Target = 'ALL' | 'MANAGER' | 'ASSISTANT' | 'STAFF' | 'NONE';

const targets: { value: Target; icon: string; labelKey: string }[] = [
  { value: 'ALL', icon: '🌍', labelKey: 'adminBroadcast.targetAll' },
  { value: 'MANAGER', icon: '🏢', labelKey: 'role.MANAGER' },
  { value: 'ASSISTANT', icon: '🧑‍💼', labelKey: 'role.ASSISTANT' },
  { value: 'STAFF', icon: '👤', labelKey: 'role.STAFF' },
  { value: 'NONE', icon: '⬜', labelKey: 'role.NONE' },
];

export default function AdminBroadcast({ me }: { me: Me }) {
  const { t } = useT();
  const [text, setText] = useState('');
  const [target, setTarget] = useState<Target>('ALL');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);

  if (me.user.role !== 'SUPER_ADMIN') {
    return (
      <Layout title={t('admin.denied')} back>
        <div className="text-center text-tg-hint">{t('admin.deniedHint')}</div>
      </Layout>
    );
  }

  const submit = async () => {
    if (!text.trim()) return showAlert(t('adminBroadcast.enterText'));
    const ok = await showConfirm(t('adminBroadcast.confirm'));
    if (!ok) return;
    haptic('heavy');
    setSending(true);
    try {
      const res = await api<{ total: number; sent: number; failed: number }>(
        '/api/admin/broadcast',
        {
          method: 'POST',
          body: JSON.stringify({ text: text.trim(), target }),
        },
      );
      setResult(res);
      notify('success');
      setText('');
    } catch (e: any) {
      showAlert(e.message);
      notify('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout title={t('adminBroadcast.title')} back>
      <Help title={t('adminBroadcast.help.title')}>
        <p>{t('adminBroadcast.help.body')}</p>
      </Help>

      {result && (
        <Card className="mb-3 bg-green-500/10">
          <div className="font-semibold mb-1">{t('adminBroadcast.done')}</div>
          <div className="text-sm">{t('adminBroadcast.sent', result.sent)}</div>
          {result.failed > 0 && (
            <div className="text-sm text-red-500">
              {t('adminBroadcast.failed', result.failed)}
            </div>
          )}
        </Card>
      )}

      <Card className="mb-3">
        {/* Target selector */}
        <div className="text-sm font-medium mb-2 px-1">{t('adminBroadcast.target')}</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {targets.map((tgt) => (
            <button
              key={tgt.value}
              onClick={() => setTarget(tgt.value)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold transition ${
                target === tgt.value
                  ? 'bg-tg-button text-tg-buttonText'
                  : 'bg-tg-secondary text-tg-hint'
              }`}
            >
              {tgt.icon} {t(tgt.labelKey as any)}
            </button>
          ))}
        </div>

        {/* Message */}
        <div className="text-sm font-medium mb-1.5 px-1">{t('adminBroadcast.text')}</div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('adminBroadcast.placeholder')}
          rows={5}
          maxLength={4000}
          className="w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition resize-none placeholder:text-tg-hint/60"
        />
        <div className="text-xs text-tg-hint text-right mt-1 px-1">
          {text.length}/4000
        </div>
      </Card>

      <Button onClick={submit} disabled={sending || !text.trim()}>
        {sending ? t('adminBroadcast.sending') : t('adminBroadcast.send')}
      </Button>
    </Layout>
  );
}
