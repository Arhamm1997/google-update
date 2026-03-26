import { NextResponse } from 'next/server';
import { getVapidPublicKey } from '@/lib/vapid';

export const runtime = 'nodejs';

/**
 * GET /api/vapid-public-key
 * Returns the VAPID public key so the browser can create a PushSubscription.
 * The key is public by design — safe to expose.
 */
export async function GET() {
  const key = getVapidPublicKey();

  if (!key) {
    return NextResponse.json(
      { error: 'VAPID_PUBLIC_KEY not configured on this server.' },
      { status: 501 }
    );
  }

  return NextResponse.json({ publicKey: key });
}
