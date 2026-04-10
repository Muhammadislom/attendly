import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tg } from '../lib/telegram';

type Props = {
  title: string;
  children: ReactNode;
  back?: boolean;
};

export default function Layout({ title, children, back = false }: Props) {
  const navigate = useNavigate();

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
        <div className="px-4 py-3 flex items-center">
          <h1 className="text-lg font-semibold truncate">{title}</h1>
        </div>
      </header>
      <main className="px-4 pt-4">{children}</main>
    </div>
  );
}
