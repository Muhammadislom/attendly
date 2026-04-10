import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg } from '../lib/telegram';
import { useT } from '../lib/i18n';

type Props = {
  title: string;
  children: ReactNode;
  back?: boolean;
};

export default function Layout({ title, children, back = false }: Props) {
  const navigate = useNavigate();
  const { lang, setLang } = useT();

  useEffect(() => {
    const app = tg();
    if (!app?.BackButton) return;
    if (back) {
      const onClick = () => navigate(-1);
      app.BackButton.show();
      app.BackButton.onClick(onClick);
      return () => {
        app.BackButton?.offClick(onClick);
        app.BackButton?.hide();
      };
    } else {
      app.BackButton.hide();
    }
  }, [back, navigate]);

  return (
    <div className="min-h-full pb-8">
      <header className="sticky top-0 z-10 bg-tg-bg/90 backdrop-blur border-b border-tg-secondary">
        <div className="px-4 py-3 flex items-center gap-2">
          <h1 className="text-lg font-semibold truncate flex-1">{title}</h1>
          <div className="flex rounded-full bg-tg-secondary text-xs font-semibold overflow-hidden ring-1 ring-white/10">
            <button
              onClick={() => setLang('ru')}
              className={`px-2.5 py-1 transition ${
                lang === 'ru' ? 'bg-tg-button text-tg-buttonText' : 'text-tg-hint'
              }`}
            >
              RU
            </button>
            <button
              onClick={() => setLang('uz')}
              className={`px-2.5 py-1 transition ${
                lang === 'uz' ? 'bg-tg-button text-tg-buttonText' : 'text-tg-hint'
              }`}
            >
              UZ
            </button>
          </div>
        </div>
      </header>
      <main className="px-4 pt-4">{children}</main>
    </div>
  );
}
