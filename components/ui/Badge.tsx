import type { HTMLAttributes } from 'react';

type Tone = 'success' | 'warn' | 'error' | 'neutral';

const toneClass: Record<Tone, string> = {
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-800',
  error: 'bg-rose-100 text-rose-700',
  neutral: 'bg-slate-100 text-slate-700'
};

export default function Badge({
  className = '',
  tone = 'neutral',
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${toneClass[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}
