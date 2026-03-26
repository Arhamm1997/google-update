/**
 * POST /api/send-test
 * Sends a test email to verify Resend is configured correctly.
 * Body: { "email": "you@example.com" }
 *
 * Protected: requires CRON_SECRET as Bearer token in Authorization header
 * (same secret used for cron jobs).
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmailNotification } from '@/lib/email';
import type { GoogleUpdate } from '@/types';

export const runtime = 'nodejs';

const MOCK_UPDATE: GoogleUpdate = {
  id: 'test-001',
  title: 'Test Alert — Email Configuration Working',
  status: 'ongoing',
  severity: 'medium',
  startedAt: new Date().toISOString(),
  description:
    'This is a test notification to confirm your Google Update Tracker email alerts are configured correctly. If you received this, email notifications are working!',
  affectedProducts: ['Google Search', 'Google Ads'],
  updates: [
    {
      when: new Date().toISOString(),
      message: 'Test notification dispatched successfully.',
      status: 'ongoing',
    },
  ],
};

export async function POST(req: NextRequest) {
  // Auth check
  const auth = req.headers.get('authorization');
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let email: string | undefined;
  try {
    const body = await req.json();
    email = body.email?.trim();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const recipients = email
    ? [email]
    : (process.env.NOTIFY_EMAILS ?? '')
        .split(',')
        .map(e => e.trim())
        .filter(Boolean);

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: 'No recipients. Pass { email } in body or set NOTIFY_EMAILS.' },
      { status: 400 }
    );
  }

  const results = await Promise.allSettled(
    recipients.map(r => sendEmailNotification(r, [MOCK_UPDATE]))
  );

  const sent    = results.filter(r => r.status === 'fulfilled').length;
  const failed  = results.filter(r => r.status === 'rejected').length;
  const errors  = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => String(r.reason));

  return NextResponse.json({ ok: failed === 0, sent, failed, errors });
}
