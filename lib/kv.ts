/**
 * lib/kv.ts — Storage adapter for tracking seen update IDs.
 *
 * Automatically switches between backends:
 *   • Vercel KV  — when KV_REST_API_URL env var is present (production on Vercel)
 *   • Local JSON  — otherwise (local dev, self-hosted, any non-KV deployment)
 *
 * To enable Vercel KV:
 *   npm i @vercel/kv
 *   vercel env pull        ← pulls KV_REST_API_URL + KV_REST_API_TOKEN
 */

import fs from 'fs/promises';
import path from 'path';

const FILE = path.join(process.cwd(), '.seen-updates.json');
const PRUNE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Vercel KV adapter ──────────────────────────────────────────────────
async function kvAdapter() {
  const { kv } = await import('@vercel/kv');
  return {
    async isNew(key: string) {
      return !(await kv.sismember('seen', key));
    },
    async markSeen(keys: string[]) {
      if (keys.length) await kv.sadd('seen', ...keys);
    },
    async getSeenKeys(): Promise<Set<string>> {
      return new Set(await kv.smembers('seen'));
    },
  };
}

// ── Local JSON adapter ─────────────────────────────────────────────────
async function readLocal(): Promise<Record<string, number>> {
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeLocal(data: Record<string, number>) {
  await fs.writeFile(FILE, JSON.stringify(data, null, 2));
}

const localAdapter = {
  async isNew(key: string) {
    const seen = await readLocal();
    return !seen[key];
  },
  async markSeen(keys: string[]) {
    const seen = await readLocal();
    const now = Date.now();
    for (const k of keys) seen[k] = now;
    // Prune old entries
    for (const [k, ts] of Object.entries(seen)) {
      if (now - ts > PRUNE_MS) delete seen[k];
    }
    await writeLocal(seen);
  },
  async getSeenKeys(): Promise<Set<string>> {
    const seen = await readLocal();
    return new Set(Object.keys(seen));
  },
};

// ── Auto-detect which adapter to use ──────────────────────────────────
function getAdapter() {
  if (process.env.KV_REST_API_URL) {
    return kvAdapter();
  }
  return Promise.resolve(localAdapter);
}

// ── Public API (thin wrappers) ─────────────────────────────────────────
export async function isNew(key: string): Promise<boolean> {
  const adapter = await getAdapter();
  return adapter.isNew(key);
}

export async function markSeen(keys: string[]) {
  const adapter = await getAdapter();
  return adapter.markSeen(keys);
}

export async function getSeenKeys(): Promise<Set<string>> {
  const adapter = await getAdapter();
  return adapter.getSeenKeys();
}
