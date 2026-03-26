// app/page.tsx — Server Component (fetches data at request time)
import { Suspense } from 'react';
import { fetchGoogleUpdates } from '@/lib/google-status';
import UpdateCard from './components/UpdateCard';
import NotificationSetup from './components/NotificationSetup';
import StatusBar from './components/StatusBar';
import RefreshTicker from './components/RefreshTicker';
import ClientPolling from './components/ClientPolling';
import type { GoogleUpdate } from '@/types';

export const revalidate = 300; // revalidate every 5 minutes

async function UpdatesList() {
  let updates: GoogleUpdate[] = [];
  let fetchError = '';

  try {
    updates = await fetchGoogleUpdates();
  } catch (e) {
    fetchError = String(e);
  }

  const ongoing    = updates.filter(u => u.status === 'ongoing');
  const monitoring = updates.filter(u => u.status === 'monitoring');
  const resolved   = updates.filter(u => u.status === 'resolved');

  if (fetchError) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-sm text-red-400 animate-fade-in">
        <p className="font-semibold mb-1">Failed to fetch updates</p>
        <p className="font-mono text-xs opacity-70">{fetchError}</p>
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-16 text-center animate-fade-in">
        <div className="flex justify-center gap-2 mb-5">
          {[0,1,2,3].map(i => (
            <span key={i} className="w-3 h-3 rounded-full bg-google-green opacity-80" />
          ))}
        </div>
        <p className="font-semibold text-white text-lg mb-2">All Systems Operational</p>
        <p className="text-sm text-gray-500">No active Google incidents at this time.</p>
      </div>
    );
  }

  const sections = [
    { label: 'Active Incidents',  items: ongoing,    accent: 'text-red-400',     dot: 'bg-red-500'     },
    { label: 'Monitoring',        items: monitoring,  accent: 'text-blue-400',    dot: 'bg-blue-500'    },
    { label: 'Recently Resolved', items: resolved,    accent: 'text-emerald-400', dot: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-8">
      {sections.map(({ label, items, accent, dot }) =>
        items.length > 0 ? (
          <section key={label} className="animate-fade-in">
            <div className="flex items-center gap-2.5 mb-4">
              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
              <h2 className={`text-xs font-semibold uppercase tracking-widest ${accent}`}>
                {label}
              </h2>
              <span className="text-xs text-gray-600 font-mono">({items.length})</span>
            </div>
            <div className="space-y-3 stagger-children">
              {items.map(u => <UpdateCard key={u.id} update={u} />)}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card rounded-2xl h-24 animate-pulse">
      <div className="p-5 flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-white/5 rounded-full" />
            <div className="h-5 w-16 bg-white/5 rounded-full" />
          </div>
          <div className="h-4 w-2/3 bg-white/5 rounded" />
          <div className="h-3 w-1/3 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="min-h-screen py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-7">

        {/* Header */}
        <header className="animate-fade-in">
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="flex gap-1.5">
                {['bg-google-blue','bg-google-red','bg-google-yellow','bg-google-green'].map((c, i) => (
                  <span key={i} className={`w-2.5 h-2.5 rounded-full ${c}`} />
                ))}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">
                Google Update Tracker
              </h1>
            </div>
            <a
              href="https://status.search.google.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-500 hover:text-blue-400 transition-colors flex items-center gap-1 mt-0.5"
            >
              Dashboard
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className="flex items-center gap-3 ml-[3.4rem]">
            <p className="text-xs text-gray-600">
              Source:{' '}
              <a
                href="https://status.search.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-gray-500 hover:text-blue-400 transition-colors"
              >
                status.search.google.com
              </a>
            </p>
            <span className="w-1 h-1 rounded-full bg-gray-700" />
            <RefreshTicker />
          </div>
        </header>

        {/* Status Bar */}
        <Suspense fallback={<div className="glass-card rounded-2xl h-20 animate-pulse" />}>
          <StatusBar />
        </Suspense>

        {/* Notification Setup */}
        <NotificationSetup />

        {/* Updates Feed */}
        <Suspense
          fallback={
            <div className="space-y-3">
              {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
            </div>
          }
        >
          <UpdatesList />
        </Suspense>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-700 pb-6 animate-fade-in">
          Data refreshes every 5 min · Powered by Google Status API
        </footer>
      </div>
      {/* Client-side polling + SW registration */}
      <ClientPolling />
    </main>
  );
}
