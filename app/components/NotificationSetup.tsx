'use client';

import { useState, useEffect } from 'react';

type PermState = 'granted' | 'denied' | 'default' | 'unsupported';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationSetup() {
  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState('');
  const [savedEmail, setSavedEmail] = useState('');
  const [permState, setPermState]   = useState<PermState>('default');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError]     = useState('');

  // Sync permission state on mount and when the panel opens
  useEffect(() => {
    if (typeof Notification === 'undefined') {
      setPermState('unsupported');
    } else {
      setPermState(Notification.permission as PermState);
    }
    // Try to reload stored email from localStorage
    const stored = localStorage.getItem('notify_email') ?? '';
    setEmail(stored);
    setSavedEmail(stored);
  }, []);

  async function enableBrowser() {
    if (permState === 'unsupported') return;
    const result = await Notification.requestPermission();
    setPermState(result as PermState);
    if (result === 'denied') {
      setError('Notifications blocked — enable them in your browser settings, then reload.');
    }
  }

  async function createPushSubscription(): Promise<PushSubscription | null> {
    if (!('serviceWorker' in navigator) || permState !== 'granted') return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      // Fetch server VAPID public key
      const res = await fetch('/api/vapid-public-key');
      if (!res.ok) return null;
      const { publicKey } = await res.json();
      if (!publicKey) return null;
      // Create (or retrieve existing) push subscription
      const existing = await reg.pushManager.getSubscription();
      if (existing) return existing;
      return reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    } catch {
      return null;
    }
  }

  async function save() {
    if (!email && permState !== 'granted') return;
    setSaving(true);
    setError('');
    try {
      const body: Record<string, unknown> = {};
      if (email) body.email = email;

      const pushSub = await createPushSubscription();
      if (pushSub) body.pushSub = pushSub.toJSON();

      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Server error');

      if (email) localStorage.setItem('notify_email', email);
      setSavedEmail(email);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function unsubscribe() {
    if (!savedEmail) return;
    setRemoving(true);
    setError('');
    try {
      // Unsubscribe push
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) await sub.unsubscribe();
      }
      // Remove from server
      await fetch('/api/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedEmail }),
      });
      localStorage.removeItem('notify_email');
      setEmail('');
      setSavedEmail('');
    } catch {
      setError('Failed to remove subscription.');
    } finally {
      setRemoving(false);
    }
  }

  const isSubscribed = Boolean(savedEmail) || permState === 'granted';

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-fade-in">
      {/* ── Toggle row ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4
                   hover:bg-white/[0.03] transition-colors
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-base select-none">
            🔔
          </span>
          <div className="text-left">
            <p className="text-sm font-semibold text-white leading-tight">Notifications</p>
            <p className="text-xs text-gray-600 leading-tight mt-0.5">
              {isSubscribed ? 'Subscribed to alerts' : 'Get alerted on new incidents'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isSubscribed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider
                             bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                             px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div className="border-t border-white/[0.06] px-5 py-5 space-y-5 animate-slide-down">

          {/* Browser push row */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-200">Browser push</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {permState === 'granted'
                  ? 'Alerts will appear even when the tab is in background'
                  : permState === 'denied'
                  ? 'Blocked in browser settings'
                  : permState === 'unsupported'
                  ? 'Not supported in this browser'
                  : 'Get alerts even when the tab is in the background'}
              </p>
            </div>
            {permState === 'granted' ? (
              <span className="shrink-0 text-xs font-semibold
                               bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                               px-3 py-1.5 rounded-full flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Enabled
              </span>
            ) : permState === 'denied' ? (
              <span className="shrink-0 text-xs font-semibold
                               bg-red-500/10 border border-red-500/20 text-red-400
                               px-3 py-1.5 rounded-full">
                Blocked
              </span>
            ) : permState === 'unsupported' ? (
              <span className="shrink-0 text-xs text-gray-600">N/A</span>
            ) : (
              <button
                onClick={enableBrowser}
                className="shrink-0 text-xs font-semibold
                           bg-white/[0.07] hover:bg-white/10 border border-white/10
                           text-gray-200 px-3 py-1.5 rounded-full transition-colors"
              >
                Enable
              </button>
            )}
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Email row */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2.5">
              Email alerts
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && save()}
                className="flex-1 text-sm rounded-xl px-3.5 py-2.5
                           bg-white/[0.05] border border-white/10
                           text-gray-100 placeholder-gray-600
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50
                           focus:border-blue-500/40 transition-all"
              />
              <button
                onClick={save}
                disabled={saving || (!email && permState !== 'granted')}
                className="shrink-0 text-sm font-semibold
                           bg-blue-600 hover:bg-blue-500
                           disabled:opacity-30 disabled:cursor-not-allowed
                           text-white px-4 py-2.5 rounded-xl transition-all min-w-[80px]
                           flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : saved ? (
                  <>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Saved
                  </>
                ) : 'Save'}
              </button>
            </div>

            <div className="flex items-center justify-between mt-2">
              <p className="text-[11px] text-gray-700">
                Requires <code className="font-mono text-gray-600">RESEND_API_KEY</code> in .env.local
              </p>
              {savedEmail && (
                <button
                  onClick={unsubscribe}
                  disabled={removing}
                  className="text-[11px] text-gray-600 hover:text-red-400 transition-colors
                             disabled:opacity-50 underline underline-offset-2"
                >
                  {removing ? 'Removing…' : 'Unsubscribe'}
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20
                          rounded-xl px-3.5 py-2.5">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
