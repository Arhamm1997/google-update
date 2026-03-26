import { cache } from 'react';
import type { GoogleUpdate, UpdateStatus, UpdateSeverity } from '@/types';

const STATUS_URL = 'https://status.search.google.com/incidents.json';

interface RawIncident {
  id: string;
  external_desc: string;
  status_impact: string;
  severity: string;
  begin: string;
  end?: string;
  updates?: Array<{
    when: string;
    text: string;
    status: string;
  }>;
  affected_products?: Array<{ title: string }>;
}

function mapStatus(raw: string): UpdateStatus {
  const s = raw?.toUpperCase();
  if (s === 'AVAILABLE')            return 'resolved';
  if (s === 'SERVICE_INFORMATION')  return 'monitoring';
  return 'ongoing';
}

function mapSeverity(raw: string): UpdateSeverity {
  const s = raw?.toLowerCase();
  if (s === 'high')   return 'high';
  if (s === 'medium') return 'medium';
  return 'low';
}

// ── Dev mock ───────────────────────────────────────────────────────────
const MOCK_DATA: GoogleUpdate[] = [
  {
    id: 'mock-001',
    title: 'Search index serving degradation in EU regions',
    status: 'ongoing',
    severity: 'high',
    startedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    description:
      'We are investigating reports of elevated error rates and increased latency for search queries originating from European Union data centres. Engineers are actively working to identify the root cause.',
    affectedProducts: ['Google Search', 'Google Discover', 'Google News'],
    updates: [
      {
        when: new Date(Date.now() - 30 * 60_000).toISOString(),
        message: 'Engineers have identified the root cause and are rolling out a mitigation. Impact is expected to reduce over the next 30 minutes.',
        status: 'ongoing',
      },
      {
        when: new Date(Date.now() - 90 * 60_000).toISOString(),
        message: 'We are seeing elevated error rates for EU search traffic. Investigation is in progress.',
        status: 'ongoing',
      },
    ],
  },
  {
    id: 'mock-002',
    title: 'Google Ads reporting latency',
    status: 'monitoring',
    severity: 'medium',
    startedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
    description:
      'Some advertisers may experience delays when loading campaign performance reports. Ad serving is not impacted. We are continuing to monitor the situation.',
    affectedProducts: ['Google Ads', 'Google Analytics'],
    updates: [
      {
        when: new Date(Date.now() - 60 * 60_000).toISOString(),
        message: 'Mitigation deployed. Report latency has dropped significantly. Monitoring for full recovery.',
        status: 'monitoring',
      },
    ],
  },
  {
    id: 'mock-003',
    title: 'Gmail attachment upload failures',
    status: 'resolved',
    severity: 'medium',
    startedAt: new Date(Date.now() - 24 * 3600_000).toISOString(),
    resolvedAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
    description:
      'A subset of users were unable to upload attachments larger than 10 MB in Gmail. The issue has been fully resolved.',
    affectedProducts: ['Gmail', 'Google Workspace'],
    updates: [
      {
        when: new Date(Date.now() - 20 * 3600_000).toISOString(),
        message: 'The issue has been resolved. All systems are operating normally.',
        status: 'resolved',
      },
      {
        when: new Date(Date.now() - 22 * 3600_000).toISOString(),
        message: 'Fix deployed and rolling out across all regions.',
        status: 'monitoring',
      },
    ],
  },
];

// ── Cached fetch — deduped within one server-render pass ───────────────
// `cache()` ensures page.tsx + StatusBar.tsx share one network call per request.
export const fetchGoogleUpdates = cache(async (): Promise<GoogleUpdate[]> => {
  if (process.env.NEXT_PUBLIC_USE_MOCK === 'true') {
    return MOCK_DATA;
  }

  const res = await fetch(STATUS_URL, {
    next: { revalidate: 300 },
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) throw new Error(`Google Status API returned ${res.status}`);

  const incidents: RawIncident[] = await res.json();

  return incidents.map((inc): GoogleUpdate => ({
    id:               inc.id,
    title:            inc.external_desc,
    status:           mapStatus(inc.status_impact),
    severity:         mapSeverity(inc.severity),
    startedAt:        inc.begin,
    resolvedAt:       inc.end,
    description:      inc.external_desc,
    affectedProducts: (inc.affected_products ?? []).map(f => f.title),
    updates:          (inc.updates ?? []).map(u => ({
      when:    u.when,
      message: u.text,
      status:  mapStatus(u.status),
    })),
  }));
});

export function hasNewUpdates(
  fresh: GoogleUpdate[],
  seen: Set<string>
): GoogleUpdate[] {
  return fresh.filter(u => !seen.has(u.id + u.status));
}
