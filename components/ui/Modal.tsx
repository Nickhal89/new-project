import type { ReactNode } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  mode?: 'center' | 'side';
};

export default function Modal({ open, onClose, title, children, mode = 'center' }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      {mode === 'side' ? (
        <div className="absolute inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
          {title ? <div className="border-b border-slate-200 px-5 py-4 text-base font-semibold">{title}</div> : null}
          <div className="h-full overflow-auto px-5 py-4">{children}</div>
        </div>
      ) : (
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            {title ? <div className="border-b border-slate-200 px-5 py-4 text-base font-semibold">{title}</div> : null}
            <div className="px-5 py-4">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
}
