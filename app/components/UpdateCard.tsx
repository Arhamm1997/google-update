'use client';

import { useState } from 'react';
import type { GoogleUpdate } from '@/types';

/* ── styles ───────────────────────────────────────────────────────── */
const STATUS: Record<string, { badge: string; dot: string }> = {
  ongoing:    { badge: 'bg-red-500/15 text-red-400 border-red-500/25',       dot: 'bg-red-500'     },
  monitoring: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/25',    dot: 'bg-blue-500'    },
  resolved:   { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-500' },
};

const SEV: Record<string, { badge: string }> = {
  high:   { badge: 'bg-red-500/10 text-red-400 border-red-500/20'     },
  medium: { badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  low:    { badge: 'bg-gray-500/10 text-gray-400 border-gray-500/20'  },
};

const BORDER_ACCENT: Record<string, string> = {
  high:       'border-l-red-500/70',
  medium:     'border-l-amber-500/70',
  low:        'border-l-gray-600',
};

/* ── helpers ──────────────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  const m = Math.floor(diff / 60_000);
  return m <= 1 ? 'just now' : `${m}m ago`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* ── component ────────────────────────────────────────────────────── */
export default function UpdateCard({ update }: { update: GoogleUpdate }) {
  const [open, setOpen] = useState(update.status === 'ongoing');

  const s = STATUS[update.status] ?? STATUS.ongoing;
  const v = SEV[update.severity]  ?? SEV.low;

  return (
    <div
      data-update-id={update.id}
      data-update-status={update.status}
      className={`
        relative overflow-hidden rounded-2xl
        border border-l-4 ${BORDER_ACCENT[update.severity]}
        border-white/[0.07]
        bg-[#13131a] hover:bg-[#16161f]
        transition-all duration-200
        animate-fade-in
      `}
    >

      {/* ── Header / toggle ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full text-left px-5 py-4 flex items-start gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 rounded-2xl"
      >
        {/* Left: badges + title */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {/* Status badge */}
            <span className={`
              inline-flex items-center gap-1.5 text-[11px] font-semibold
              px-2.5 py-0.5 rounded-full border ${s.badge}
              ${update.status === 'ongoing' ? 'badge-ongoing' : ''}
            `}>
              {update.status === 'ongoing' && (
                <span className="live-dot w-1.5 h-1.5 rounded-full bg-red-500 block flex-shrink-0" />
              )}
              {update.status !== 'ongoing' && (
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
              )}
              {update.status.charAt(0).toUpperCase() + update.status.slice(1)}
            </span>

            {/* Severity badge */}
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${v.badge}`}>
              {update.severity}
            </span>
          </div>

          <h3 className="font-semibold text-white text-sm leading-snug text-balance">
            {update.title}
          </h3>

          <p className="text-[11px] text-gray-600 mt-1.5 font-mono">
            Started {fmtDate(update.startedAt)}
            {update.resolvedAt && ` · Resolved ${timeAgo(update.resolvedAt)}`}
          </p>
        </div>

        {/* Chevron */}
        <span
          aria-hidden
          className={`
            flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center
            bg-white/5 text-gray-500
            transition-transform duration-250
            ${open ? 'rotate-180' : ''}
          `}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* ── Body ── */}
      {open && (
        <div className="px-5 pb-5 border-t border-white/[0.06] animate-slide-down">
          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed mt-4">
            {update.description}
          </p>

          {/* Affected products */}
          {update.affectedProducts.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-2">
                Affected products
              </p>
              <div className="flex flex-wrap gap-1.5">
                {update.affectedProducts.map(p => (
                  <span
                    key={p}
                    className="text-[11px] bg-white/5 border border-white/[0.07] text-gray-400
                               px-2.5 py-0.5 rounded-full"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {update.updates.length > 0 && (
            <div className="mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-3">
                Update history
              </p>
              <div className="space-y-0">
                {update.updates.map((u, i) => {
                  const dotColor =
                    u.status === 'resolved'   ? 'bg-emerald-500' :
                    u.status === 'monitoring' ? 'bg-blue-500' : 'bg-amber-500';

                  return (
                    <div key={i} className="flex gap-3">
                      {/* Timeline spine */}
                      <div className="flex flex-col items-center flex-shrink-0 w-4 pt-1">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                        {i < update.updates.length - 1 && (
                          <span className="timeline-line flex-1 w-px mt-1 mb-0" />
                        )}
                      </div>

                      {/* Content */}
                      <div className={`flex-1 ${i < update.updates.length - 1 ? 'pb-4' : 'pb-0'}`}>
                        <p className="text-[11px] text-gray-600 font-mono mb-0.5">
                          {fmtDate(u.when)}
                        </p>
                        <p className="text-sm text-gray-300 leading-relaxed">
                          {u.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
