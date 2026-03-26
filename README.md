# Google Update Tracker

Real-time tracker for Google Search, Ads & Workspace incidents.
Polls [status.search.google.com](https://status.search.google.com) every 5 minutes
and sends browser + email notifications when a new incident starts or resolves.

![Dark UI with live incident cards](https://placeholder.for/screenshot.png)

---

## Features

- **Live feed** — server-rendered incident cards grouped by status (Active / Monitoring / Resolved)
- **Severity-coded** — red / amber / green left-border accents and badges
- **Timeline history** — expandable update history with a visual timeline per incident
- **Browser notifications** — push alerts even when the tab is in the background (via Service Worker)
- **Email alerts** — HTML emails sent via Resend when the cron job detects new incidents
- **Auto-refresh** — countdown ring shows time until next server revalidation
- **PWA-ready** — installable on mobile, manifest + SW included
- **Dark mode first** — mission-control dark theme, no light mode flash

---

## Quick start

```bash
# 1. Create the Next.js project scaffold
npx create-next-app@latest google-update-tracker \
  --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd google-update-tracker

# 2. Replace the generated files with this project's source
#    (copy everything from this zip into the project root)

# 3. Install optional email dependency
npm i resend

# 4. Configure environment
cp .env.local.template .env.local
# Edit .env.local — at minimum set NEXT_PUBLIC_USE_MOCK=true to
# see mock data while developing before deploying

# 5. Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Tip:** set `NEXT_PUBLIC_USE_MOCK=true` in `.env.local` during development
> to display realistic mock incidents without hitting the Google API.

---

## Environment variables

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `RESEND_API_KEY`      | Optional | [resend.com](https://resend.com) free key — enables email alerts |
| `NOTIFY_EMAILS`       | Optional | Comma-separated recipient emails |
| `EMAIL_FROM`          | Optional | Verified sender address in Resend (default: `alerts@yourdomain.com`) |
| `CRON_SECRET`         | Recommended | Protects `/api/check-updates` — generate with `openssl rand -hex 32` |
| `KV_REST_API_URL`     | Optional | Auto-populated by Vercel KV — enables production-grade deduplication |
| `KV_REST_API_TOKEN`   | Optional | Auto-populated by Vercel KV |
| `NEXT_PUBLIC_USE_MOCK`| Dev only | Set `true` to use mock incidents instead of live API |
| `VAPID_PUBLIC_KEY`    | Optional | VAPID public key for web push — generate with web-push |
| `VAPID_PRIVATE_KEY`   | Optional | VAPID private key — keep secret, never commit |
| `VAPID_SUBJECT`       | Optional | Contact URI for push service (e.g. `mailto:admin@you.com`) |

---

## API routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/updates` | GET | Public | Returns current incidents as JSON |
| `/api/check-updates` | GET | `CRON_SECRET` | Diffs against seen state, sends emails |
| `/api/subscribe` | POST | Public | Saves email / push subscription |
| `/api/subscribe` | DELETE | Public | Removes subscription by email |
| `/api/send-test` | POST | `CRON_SECRET` | Sends a test email to verify Resend |
| `/api/vapid-public-key` | GET | Public | Returns VAPID public key for push subscriptions |

### Test email
```bash
curl -X POST http://localhost:3000/api/send-test \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
```

---

## Notification flow

### Browser push
1. User clicks **Enable** → `Notification.requestPermission()` is called
2. `ClientPolling` component polls `/api/updates` every 5 minutes
3. New incidents trigger a `ServiceWorkerRegistration.showNotification()` call
4. Works in background tabs; page soft-reloads to reflect new server data

### Email alerts (cron)
1. Vercel Cron calls `GET /api/check-updates` every 30 minutes
2. Route fetches Google's API, diffs against `getSeenKeys()` (KV or local JSON)
3. New incidents are marked seen, then emailed to all `NOTIFY_EMAILS` recipients

---

## Storage backends

The app auto-detects which storage to use:

| Environment | Backend | How to configure |
|-------------|---------|-----------------|
| Local dev   | `.seen-updates.json` (file) | Nothing needed |
| Vercel + KV | Vercel KV (Redis) | `npm i @vercel/kv` + `vercel env pull` |

### Upgrade to Vercel KV
```bash
npm i @vercel/kv
vercel link       # if not already linked
vercel env pull   # pulls KV_REST_API_URL + KV_REST_API_TOKEN
```
`lib/kv.ts` detects `KV_REST_API_URL` automatically — no code changes needed.

---


## Web Push (VAPID) setup

Real push notifications delivered even when the browser is closed require VAPID keys.

```bash
# Install web-push (already in package.json)
npm i web-push @types/web-push

# Generate your VAPID key pair (one-time)
node -e "
  const { generateVAPIDKeys } = require('web-push');
  const k = generateVAPIDKeys();
  console.log('VAPID_PUBLIC_KEY=' + k.publicKey);
  console.log('VAPID_PRIVATE_KEY=' + k.privateKey);
"

# Add both keys to .env.local
```

Once keys are set:
1. Users click **Enable** in the notification panel — the browser subscribes using the public key
2. The subscription (endpoint + auth keys) is stored in `.subscribers.json` on the server
3. When cron runs and finds new incidents, push messages are sent via `lib/vapid.ts`
4. `public/sw.js` receives the push event and shows a system notification

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel --prod
```

Set env vars under **Settings → Environment Variables** in the Vercel dashboard.
Cron jobs are free on the Hobby plan (up to 2 jobs).

---

## Project structure

```
app/
  layout.tsx                  Root layout (fonts, dark mode, PWA meta)
  globals.css                 Tailwind + custom CSS (glass cards, animations)
  page.tsx                    Server component — fetches + renders feed
  components/
    UpdateCard.tsx            Expandable incident card (client)
    NotificationSetup.tsx     Email + browser push settings panel (client)
    StatusBar.tsx             Live incident count chips (server)
    RefreshTicker.tsx         Countdown ring (client)
    ClientPolling.tsx         Background poller + SW registration (client)
  api/
    updates/route.ts          GET  — current incidents JSON
    check-updates/route.ts    GET  — cron endpoint, diffs + emails
    subscribe/route.ts        POST/DELETE — manage subscriptions
    send-test/route.ts        POST — send a test email
    vapid-public-key/route.ts GET  — serve VAPID public key

lib/
  google-status.ts            Fetch + parse Google Status API
  kv.ts                       Storage adapter (Vercel KV or local JSON)
  email.ts                    Resend email sender

types/index.ts                All shared TypeScript types
public/
  sw.js                       Service Worker for push notifications
  manifest.json               PWA manifest
  favicon.svg                 Google-colors favicon
vercel.json                   Cron + function config
```
