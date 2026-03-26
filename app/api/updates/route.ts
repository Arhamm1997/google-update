import { NextResponse } from 'next/server';
import { fetchGoogleUpdates } from '@/lib/google-status';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 minutes

export async function GET() {
  try {
    const updates = await fetchGoogleUpdates();
    return NextResponse.json({ ok: true, updates, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[/api/updates]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
