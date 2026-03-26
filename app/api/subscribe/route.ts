import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import type { Subscriber } from '@/types';

const FILE = path.join(process.cwd(), '.subscribers.json');

async function load(): Promise<Subscriber[]> {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return [];
  }
}

async function save(subs: Subscriber[]) {
  await fs.writeFile(FILE, JSON.stringify(subs, null, 2));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const subs = await load();

    const entry: Subscriber = { createdAt: new Date().toISOString() };
    if (body.email) entry.email = body.email.trim().toLowerCase();
    if (body.pushSub) entry.pushSub = JSON.stringify(body.pushSub);

    // Deduplicate by email
    const filtered = subs.filter(s => !entry.email || s.email !== entry.email);
    filtered.push(entry);
    await save(filtered);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { email } = await req.json();
    const subs = await load();
    await save(subs.filter(s => s.email !== email?.trim().toLowerCase()));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
