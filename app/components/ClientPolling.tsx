'use client';

/**
 * ClientPolling — mounts invisibly and:
 *   1. Registers the service worker
 *   2. Seeds the "seen" set by fetching /api/updates once on mount
 *   3. Polls /api/updates every 5 minutes
 *   4. Fires browser Notifications for genuinely new incidents
 *   5. Calls router.refresh() (soft, no full reload) when new data arrives
 */

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { GoogleUpdate } from '@/types';

const POLL_MS = 5 * 60 * 1000; // 5 minutes

export default function ClientPolling() {
  const router   = useRouter();
  const seenRef  = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const seeded   = useRef(false);

  useEffect(() => {
    // ── 1. Register service worker ────────────────────────────────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch(err => console.warn('[sw] Registration failed:', err));
    }

    // ── 2. Seed seen-set from current API state ───────────────────────
    // Avoids notifying about incidents that were already live on first load.
    async function seed() {
      if (seeded.current) return;
      seeded.current = true;
      try {
        const res = await fetch('/api/updates');
        if (!res.ok) return;
        const { updates }: { updates: GoogleUpdate[] } = await res.json();
        if (!Array.isArray(updates)) return;
        for (const u of updates) seenRef.current.add(u.id + u.status);
      } catch {
        // non-fatal — worst case we notify on first poll
      }
    }

    // ── 3. Poll loop ──────────────────────────────────────────────────
    async function poll() {
      try {
        const res = await fetch('/api/updates', { cache: 'no-store' });
        if (!res.ok) return;

        const { updates }: { updates: GoogleUpdate[] } = await res.json();
        if (!Array.isArray(updates)) return;

        const newOnes: GoogleUpdate[] = [];
        for (const u of updates) {
          const key = u.id + u.status;
          if (!seenRef.current.has(key)) {
            newOnes.push(u);
            seenRef.current.add(key);
          }
        }

        if (newOnes.length === 0) return;

        // ── 4. Browser notifications ──────────────────────────────────
        if (
          typeof Notification !== 'undefined' &&
          Notification.permission === 'granted'
        ) {
          for (const u of newOnes) {
            const icon = u.severity === 'high' ? '🔴' : u.severity === 'medium' ? '🟡' : '🟢';
            const body =
              u.description.length > 120
                ? u.description.slice(0, 117) + '…'
                : u.description;

            try {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification(`${icon} ${u.title}`, {
                body,
                tag:      u.id,
                renotify: true,
                data:     { url: '/' },
              });
            } catch {
              // Fallback when SW notification isn't available
              new Notification(`${icon} ${u.title}`, { body, tag: u.id });
            }
          }
        }

        // ── 5. Soft refresh — re-runs server components, no full reload ──
        router.refresh();
      } catch (err) {
        console.warn('[poll] Error:', err);
      }
    }

    seed().then(() => {
      timerRef.current = setInterval(poll, POLL_MS);
    });

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  return null;
}
