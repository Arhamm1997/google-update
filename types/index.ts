// ── Core update types ──────────────────────────────────────────────────
export type UpdateStatus   = 'ongoing' | 'resolved' | 'monitoring';
export type UpdateSeverity = 'high' | 'medium' | 'low';

export interface UpdateEntry {
  when:    string;
  message: string;
  status:  UpdateStatus;
}

export interface GoogleUpdate {
  id:               string;
  title:            string;
  status:           UpdateStatus;
  severity:         UpdateSeverity;
  startedAt:        string;
  resolvedAt?:      string;
  description:      string;
  updates:          UpdateEntry[];
  affectedProducts: string[];
}

// ── API response types ─────────────────────────────────────────────────
export interface UpdatesApiResponse {
  ok:        boolean;
  updates:   GoogleUpdate[];
  fetchedAt: string;
  error?:    string;
}

export interface CheckUpdatesApiResponse {
  ok:          boolean;
  new:         number;
  titles?:     string[];
  emailsSent?: number;
  message?:    string;
  error?:      string;
}

export interface SubscribeApiResponse {
  ok:     boolean;
  error?: string;
}

export interface SendTestApiResponse {
  ok:      boolean;
  sent:    number;
  failed:  number;
  errors:  string[];
}

// ── Notification preferences ───────────────────────────────────────────
export interface NotificationPrefs {
  email?:            string;
  browserEnabled:    boolean;
  notifyOnNew:       boolean;
  notifyOnResolved:  boolean;
  minSeverity:       UpdateSeverity;
}

// ── Subscriber record (used in subscribe route) ────────────────────────
export interface Subscriber {
  email?:    string;
  pushSub?:  string; // JSON-serialised PushSubscription
  createdAt: string;
}
