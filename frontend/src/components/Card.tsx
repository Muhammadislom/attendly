import { ReactNode } from 'react';

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
      className={`bg-tg-secondary rounded-2xl p-4 ${
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
    'w-full rounded-2xl py-3 px-4 font-semibold text-center active:scale-[0.98] transition-transform disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-tg-button text-tg-buttonText'
      : variant === 'danger'
      ? 'bg-red-500 text-white'
      : 'bg-tg-secondary text-tg-text';
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

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string },
) {
  const { label, className = '', ...rest } = props;
  return (
    <label className="block mb-3">
      {label && (
        <div className="text-sm text-tg-hint mb-1 px-1">{label}</div>
      )}
      <input
        {...rest}
        className={`w-full rounded-2xl px-4 py-3 bg-tg-secondary outline-none focus:ring-2 focus:ring-tg-button ${className}`}
      />
    </label>
  );
}
