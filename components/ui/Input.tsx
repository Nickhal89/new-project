import type { InputHTMLAttributes } from 'react';

export default function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2 ${className}`}
    />
  );
}
