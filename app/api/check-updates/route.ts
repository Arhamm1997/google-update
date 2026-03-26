/**
 * GET /api/check-updates
 * Called by Vercel Cron every 30 minutes (see vercel.json).
 * Can also be triggered manually or by a self-hosted scheduler.
 *
 * 1. Fetches latest incidents from Google
 * 2. Diffs against seen state (KV or local JSON)
 * 3. Sends email notifications via Resend
 * 4. Sends web push to stored PushSubscriptions (if VAPID configured)
 *
 * Protected by CRON_SECRET — set it in .env.local.
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { fetchGoogleUpdates, hasNewUpdates } from '@/lib/google-status';
import { getSeenKeys, markSeen } from '@/lib/kv';
import { sendEmailNotification } from '@/lib/email';
import { sendPushNotification } from '@/lib/vapid';
import type { GoogleUpdate, Subscriber } from '@/types';

export const runtime = 'nodejs';

const SUBS_FILE = path.join(process.cwd(), '.subscribers.json');

async function loadSubscribers(): Promise<Subscriber[]> {
  try {
    return JSON.parse(await fs.readFile(SUBS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function dispatchPush(subs: Subscriber[], updates: GoogleUpdate[]) {
  const pushSubs = subs.filter(s => s.pushSub);
  if (pushSubs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;

  for (const sub of pushSubs) {
    try {
      const subscription = JSON.parse(sub.pushSub!) as PushSubscriptionJSON;
      const payload = {
        title: updates.length === 1
          ? updates[0].title
          : `${updates.length} New Google Updates`,
        body: updates[0]?.description?.slice(0, 120) ?? '',
        id: updates[0]?.id ?? 'new',
        url: '/',
      };
      await sendPushNotification(subscription, payload);
      sent++;
    } catch (err) {
      console.warn('[push] Failed for subscriber:', err);
      failed++;
    }
  }

  return { sent, failed };
}

export async function GET(req: NextRequest) {
  // Auth
  const auth = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [updates, seenKeys, subscribers] = await Promise.all([
      fetchGoogleUpdates(),
      getSeenKeys(),
      loadSubscribers(),
    ]);

    const newUpdates = hasNewUpdates(updates, seenKeys);

    if (newUpdates.length === 0) {
      return NextResponse.json({ ok: true, new: 0, message: 'No new updates' });
    }

    // Persist seen keys
    await markSeen(newUpdates.map(u => u.id + u.status));

    // Email recipients from env + stored subscribers
    const envEmails = (process.env.NOTIFY_EMAILS ?? '')
      .split(',')
      .map(e => e.trim())
      .filter(Boolean);
    const subEmails = subscribers
      .map(s => s.email)
      .filter((e): e is string => Boolean(e));
    const allEmails = [...new Set([...envEmails, ...subEmails])];

    const [emailResults, pushResult] = await Promise.all([
      Promise.allSettled(
        allEmails.map(email => sendEmailNotification(email, newUpdates))
      ),
      dispatchPush(subscribers, newUpdates),
    ]);

    const emailsSent   = emailResults.filter(r => r.status === 'fulfilled').length;
    const emailsFailed = emailResults.filter(r => r.status === 'rejected').length;

    return NextResponse.json({
      ok: true,
      new:          newUpdates.length,
      titles:       newUpdates.map(u => u.title),
      emailsSent,
      emailsFailed,
      pushSent:     pushResult.sent,
      pushFailed:   pushResult.failed,
    });
  } catch (err) {
    console.error('[/api/check-updates]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
