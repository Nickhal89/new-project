import Badge from '@/components/ui/Badge';

export default function TrustStrip({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? 'px-3 py-2' : 'px-4 py-3'} shadow-sm`}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="success">GDPR-first</Badge>
        <Badge tone="neutral">Synthetic demo data</Badge>
        <Badge tone="neutral">Explainable scoring</Badge>
        <p className="text-xs text-slate-600">
          Demo περιβάλλον μόνο με συνθετικά δεδομένα. Δεν απαιτείται πραγματικό CV για παρουσίαση.
        </p>
      </div>
    </div>
  );
}
