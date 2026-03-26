/**
 * lib/email.ts — Sends incident alert emails via Resend.
 *
 * Setup:
 *   npm i resend
 *   RESEND_API_KEY=re_xxxx           in .env.local
 *   NOTIFY_EMAILS=you@example.com    in .env.local
 *   EMAIL_FROM=alerts@yourdomain.com in .env.local  (optional, defaults shown)
 *
 * Free tier: 3,000 emails / month at resend.com
 */

import type { GoogleUpdate } from '@/types';

const FROM = process.env.EMAIL_FROM ?? 'Google Alerts <alerts@yourdomain.com>';
const DASHBOARD_URL = 'https://status.search.google.com';

function severityColor(s: string) {
  if (s === 'high')   return '#ef4444';
  if (s === 'medium') return '#f59e0b';
  return '#10b981';
}

function statusColor(s: string) {
  if (s === 'ongoing')    return '#ef4444';
  if (s === 'monitoring') return '#3b82f6';
  return '#10b981';
}

function buildHtml(updates: GoogleUpdate[]): string {
  const cards = updates
    .map(u => `
      <div style="background:#1a1a24;border:1px solid rgba(255,255,255,0.08);
                  border-left:4px solid ${severityColor(u.severity)};
                  border-radius:12px;padding:20px;margin-bottom:16px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;
                       font-weight:600;background:${statusColor(u.status)}22;
                       color:${statusColor(u.status)};border:1px solid ${statusColor(u.status)}44;">
            ${u.status}
          </span>
          <span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:11px;
                       font-weight:600;background:${severityColor(u.severity)}22;
                       color:${severityColor(u.severity)};border:1px solid ${severityColor(u.severity)}44;">
            ${u.severity}
          </span>
        </div>
        <p style="font-size:15px;font-weight:600;color:#f1f1f5;margin:0 0 8px;">${u.title}</p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 10px;font-family:monospace;">
          Started: ${new Date(u.startedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
          ${u.resolvedAt
            ? ` &nbsp;·&nbsp; Resolved: ${new Date(u.resolvedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
            : ''}
        </p>
        <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0 0 10px;">${u.description}</p>
        ${u.affectedProducts.length
          ? `<p style="font-size:11px;color:#6b7280;margin:0;">
               Affected: ${u.affectedProducts.join(', ')}
             </p>`
          : ''}
      </div>
    `)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0c0c10;margin:0;padding:32px 16px;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:580px;margin:0 auto;">

    <!-- Header -->
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
      <span style="display:inline-flex;gap:4px;">
        <span style="width:10px;height:10px;border-radius:50%;background:#4285F4;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#EA4335;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#FBBC04;display:inline-block;"></span>
        <span style="width:10px;height:10px;border-radius:50%;background:#34A853;display:inline-block;"></span>
      </span>
      <h1 style="font-size:18px;font-weight:700;color:#f1f1f5;margin:0;">
        Google Update Alert
      </h1>
    </div>

    <p style="font-size:14px;color:#6b7280;margin:0 0 20px;">
      ${updates.length === 1
        ? '1 new incident detected'
        : `${updates.length} new incidents detected`}
      on Google's status page.
    </p>

    ${cards}

    <!-- Footer -->
    <div style="border-top:1px solid rgba(255,255,255,0.07);padding-top:20px;margin-top:8px;">
      <p style="font-size:12px;color:#4b5563;margin:0 0 6px;">
        <a href="${DASHBOARD_URL}" style="color:#4285F4;text-decoration:none;">
          View full dashboard →
        </a>
      </p>
      <p style="font-size:11px;color:#374151;margin:0;">
        You're receiving this because you subscribed to Google Update alerts.
        Reply to unsubscribe.
      </p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendEmailNotification(
  toEmail: string,
  updates: GoogleUpdate[]
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[email] RESEND_API_KEY not set — skipping email to', toEmail);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const subject =
    updates.length === 1
      ? `🔔 Google Update: ${updates[0].title}`
      : `🔔 ${updates.length} New Google Updates Detected`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject,
    html: buildHtml(updates),
  });

  if (error) {
    console.error('[email] Resend error:', error);
    throw new Error(`Resend failed: ${JSON.stringify(error)}`);
  }

  console.log('[email] Sent to', toEmail, '—', updates.length, 'update(s)');
}
