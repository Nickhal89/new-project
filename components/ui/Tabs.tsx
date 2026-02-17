'use client';

import type { ReactNode } from 'react';

type Tab = { key: string; label: string };

export default function Tabs({ tabs, activeKey, onChange }: { tabs: Tab[]; activeKey: string; onChange: (k: string) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-sm ${active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
