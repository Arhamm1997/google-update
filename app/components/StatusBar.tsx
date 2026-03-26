// app/components/StatusBar.tsx — Server Component
import { fetchGoogleUpdates } from '@/lib/google-status';

export default async function StatusBar() {
  let ongoing = 0, monitoring = 0, resolved = 0;

  try {
    const updates = await fetchGoogleUpdates();
    ongoing    = updates.filter(u => u.status === 'ongoing').length;
    monitoring = updates.filter(u => u.status === 'monitoring').length;
    resolved   = updates.filter(u => u.status === 'resolved').length;
  } catch {
    // silently fail — StatusBar is decorative
  }

  const allClear = ongoing === 0 && monitoring === 0;

  const stats = [
    {
      label: 'Active',
      value: ongoing,
      color: ongoing > 0 ? 'text-red-400' : 'text-gray-600',
      bg: ongoing > 0 ? 'bg-red-500/10' : 'bg-white/5',
      border: ongoing > 0 ? 'border-red-500/20' : 'border-white/5',
    },
    {
      label: 'Monitoring',
      value: monitoring,
      color: monitoring > 0 ? 'text-blue-400' : 'text-gray-600',
      bg: monitoring > 0 ? 'bg-blue-500/10' : 'bg-white/5',
      border: monitoring > 0 ? 'border-blue-500/20' : 'border-white/5',
    },
    {
      label: 'Resolved',
      value: resolved,
      color: resolved > 0 ? 'text-emerald-400' : 'text-gray-600',
      bg: 'bg-white/5',
      border: 'border-white/5',
    },
  ];

  return (
    <div className="glass-card rounded-2xl p-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        {/* System health pill */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
          ${allClear
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}
        >
          {allClear ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              All systems normal
            </>
          ) : (
            <>
              <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 block" />
              Incident detected
            </>
          )}
        </div>

        {/* Stat chips */}
        <div className="flex gap-2">
          {stats.map(({ label, value, color, bg, border }) => (
            <div
              key={label}
              className={`flex flex-col items-center px-3 py-1.5 rounded-xl border ${bg} ${border} min-w-[52px]`}
            >
              <span className={`text-lg font-bold leading-none ${color} font-mono`}>{value}</span>
              <span className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
