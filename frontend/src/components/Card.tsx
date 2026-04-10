import { ReactNode, useState } from 'react';

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-tg-secondary rounded-2xl p-4 shadow-sm ring-1 ring-white/5 ${
        onClick ? 'active:scale-[0.98] transition-transform cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const base =
    'w-full rounded-2xl py-3 px-4 font-semibold text-center active:scale-[0.97] transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? 'bg-tg-button text-tg-buttonText shadow-lg shadow-tg-button/20'
      : variant === 'danger'
      ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
      : 'bg-tg-bg text-tg-text ring-1 ring-white/10';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

// Input with visible outline so it reads clearly both INSIDE a Card
// (where bg-tg-secondary would blend with card bg) and outside.
// Uses `bg-tg-bg` + a contrast ring — this makes it visible on both the
// light and dark Telegram themes.
export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    hint?: string;
  },
) {
  const { label, hint, className = '', ...rest } = props;
  return (
    <label className="block mb-3">
      {label && (
        <div className="text-sm font-medium mb-1.5 px-1">{label}</div>
      )}
      <input
        {...rest}
        className={`w-full rounded-2xl px-4 py-3 bg-tg-bg text-tg-text placeholder:text-tg-hint/60 ring-1 ring-white/10 outline-none focus:ring-2 focus:ring-tg-button transition ${className}`}
      />
      {hint && (
        <div className="text-xs text-tg-hint mt-1 px-1 leading-snug">
          {hint}
        </div>
      )}
    </label>
  );
}

// A collapsible "How does this work?" block for in-context documentation.
// Keeps screens compact by default; user taps to reveal details.
export function Help({
  title = 'Как это работает?',
  children,
  defaultOpen = false,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4 rounded-2xl bg-tg-button/10 ring-1 ring-tg-button/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold flex items-center gap-2">
          <span>💡</span>
          <span>{title}</span>
        </span>
        <span className={`text-tg-hint transition-transform ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed text-tg-text/90 space-y-2">
          {children}
        </div>
      )}
    </div>
  );
}
