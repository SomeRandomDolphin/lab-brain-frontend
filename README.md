# Lab Brain — Frontend

Next.js 14 + React + TypeScript frontend for the Lab Brain multimodal
research-lab agent. Talks to the FastAPI backend over REST and
Server-Sent Events, and publishes audio + camera to LiveKit via WebRTC.

---

## Project Structure

```
src/
├── app/
│   ├── auth/
│   │   ├── callback/
│   │   │   └── page.tsx              # Supabase OAuth/magic-link/email-confirmation redirect handler
│   │   ├── forgot-password/
│   │   │   └── page.tsx              # authService.forgotPassword()
│   │   ├── login/
│   │   │   └── page.tsx              # authService.login()
│   │   ├── register/
│   │   │   └── page.tsx              # authService.register()
│   │   └── reset-password/
│   │       └── page.tsx              # authService.resetPassword()
│   ├── dashboard/
│   │   ├── sessions/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Single session detail — api.getSession()
│   │   ├── settings/
│   │   │   └── page.tsx              # Profile settings — authService.updateProfile()
│   │   └── page.tsx                  # Dashboard home, past sessions — api.listSessions()
│   ├── session/
│   │   └── page.tsx                  # Live session (Google Meet-style call UI)
│   ├── globals.css
│   ├── layout.tsx                    # Root layout, wraps AuthProvider
│   └── page.tsx                      # Landing page
│
├── components/
│   ├── dashboard/
│   │   └── PrivacyConsentModal.tsx   # First-login ToS/privacy modal — api.setTosConsent()
│   ├── layout/
│   │   └── AuthProvider.tsx          # Rehydrates the auth store on load via authService.me()
│   └── session/
│       ├── AgentReplyBanner.tsx      # SSE agent_reply events
│       ├── ControlBar.tsx            # Mic/camera/leave controls
│       ├── EnvironmentPanel.tsx      # Right sidebar: scene/speakers/environment
│       ├── InviteToast.tsx           # Invite-link toast
│       ├── JoinModal.tsx             # Pre-join dialog
│       ├── MetricsBar.tsx            # Header: ASR / E2E latency counters
│       ├── ModeIndicator.tsx         # Conversation mode pill
│       ├── PreCheck.tsx              # Camera/mic preview before joining
│       ├── SpeakerChips.tsx          # Detected speaker badges
│       ├── SummaryModal.tsx          # End-of-session summary overlay
│       ├── SummonButton.tsx          # Manual agent summon/dismiss
│       ├── TranscriptPanel.tsx       # Live scrolling transcript
│       ├── VideoGrid.tsx             # LiveKit video tile layout
│       ├── VideoTile.tsx             # Single participant video tile
│       └── Waveform.tsx              # Animated mic indicator
│
├── content/
│   └── privacyTerms.ts               # Copy shown in PrivacyConsentModal
│
├── hooks/
│   ├── useDevicePreview.ts           # Camera/mic preview stream, used by PreCheck
│   ├── useSession.ts                 # LiveKit room lifecycle (start / stop)
│   └── useSSE.ts                     # EventSource → Zustand dispatch
│
├── lib/
│   ├── api.ts                        # All REST calls to the backend (session, agent, metrics, kg-agent, privacy)
│   ├── auth.ts                       # Backend /auth/* calls — register, login, logout, me, updateProfile, forgot/reset password
│   ├── supabase.ts                   # Supabase JS client — used by app/auth/callback for OAuth/magic-link/email-confirmation redirects
│   └── utils.ts                      # cn() helper, formatters, mode labels/colors, speaker palette
│
├── store/
│   ├── auth.ts                       # Zustand auth store (persisted) — token/user consumed by lib/api.ts and lib/auth.ts
│   └── session.ts                    # Zustand session store (transcripts, SSE state)
│
└── types/
    └── index.ts                      # All TypeScript interfaces
```

---

## Quickstart

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in your backend, LiveKit, and Supabase values:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
NEXT_PUBLIC_LK_URL=ws://localhost:7880
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` should point at the
same Supabase project the backend uses — see the backend's `SUPABASE_URL`.

### 3. Start the backend + LiveKit

This frontend expects the Lab Brain backend and a LiveKit SFU reachable at
`NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_LK_URL`. Follow the backend's own
Quickstart (`./start_services.sh` then `docker compose up --build`) to get
both running.

### 4. Run the frontend

```bash
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm start             # http://localhost:5173
```

---

## Running with Docker

```bash
cp .env.example .env    # docker compose reads .env from the project root automatically
docker compose up --build
```

`docker-compose.yml` passes the four `NEXT_PUBLIC_*` values as build args into
the multi-stage `Dockerfile`, builds the app with `output: "standalone"`, and
runs it as `lab-brain-frontend` on `localhost:5173`.

Unlike the backend's compose file, this one does **not** need
`host.docker.internal` / `extra_hosts` — `NEXT_PUBLIC_API_BASE` and
`NEXT_PUBLIC_LK_URL` are called directly by the **browser**, not by the
Node server inside the container, so they need to be addresses your browser
can reach (a LAN IP, a public hostname, etc.), not container-internal ones.

LiveKit and the backend (`lab-brain-backend`) are managed by the backend
repo's own compose file. If this frontend's container needs to reach them
over a shared Docker network instead of published host ports, add a
`networks:` entry to both compose files and point the `NEXT_PUBLIC_*` build
args at the container names on that network — see the comment at the bottom
of `docker-compose.yml`.

---

## Auth

Email/password auth (register, login, logout, profile updates, forgot/reset
password) goes through the backend's `/auth/*` endpoints (`lib/auth.ts`),
which — per the backend — is itself backed by Supabase Auth server-side and
returns a Supabase JWT. That JWT is stored in the Zustand auth store
(`store/auth.ts`) and sent as `Authorization: Bearer <token>` on every
request in `lib/api.ts`.

Separately, `lib/supabase.ts` instantiates its own Supabase JS client
(`persistSession` + `autoRefreshToken` + `detectSessionInUrl`), used by
`app/auth/callback/page.tsx` to pick up a session from redirect-based flows
(OAuth / magic link / email confirmation) that land the browser back on
your site with the session in the URL.

A `401` from any `lib/api.ts` call clears the auth store and hard-redirects
to `/auth/login` (see `handleUnauthorized()` in `api.ts`) — there's no
per-page retry logic, by design.

---

## SSE event types handled

| `msg.type` | Handler |
|---|---|
| `session` | Marks session live |
| `transcript` | Appended to TranscriptPanel, updates mode + summon |
| `agent_reply` | AgentReplyBanner + stored in EnvironmentPanel history |
| `speak` | `window.speechSynthesis.speak()` |
| `perception` | Speaker chips, scene summary, environment panel |
| `mode_change` | ModeIndicator pill |
| `listening` | Waveform & processing dots |
| `error` | Console error (add toast as needed) |

`useSSE.ts` opens the stream via `openSSE()` in `lib/api.ts`, which passes the
access token as a `?token=` query param — `EventSource` can't set custom
headers, and the backend's `GET /events/{sid}` accepts the token that way
for this route only (see the backend README's Auth section).

---

## Backend endpoints used

### Auth (`lib/auth.ts`)

| Method | Path | Used by |
|---|---|---|
| POST | `/auth/register` | Register page |
| POST | `/auth/login` | Login page |
| POST | `/auth/logout` | AuthProvider / logout action |
| GET | `/auth/me` | AuthProvider — rehydrate session on load |
| PATCH | `/auth/me` | Settings page — update profile |
| POST | `/auth/forgot-password` | Forgot-password page |
| POST | `/auth/reset-password` | Reset-password page |

### App (`lib/api.ts`)

| Method | Path | Used by |
|---|---|---|
| POST | `/livekit/room` | Start session |
| GET | `/livekit/token` | Reconnect |
| GET | `/livekit/room/:sid` | Room status |
| DELETE | `/livekit/room/:sid` | End session |
| GET | `/events/:sid` | SSE stream |
| GET | `/agent/summon/:sid` | SummonButton poll |
| POST | `/agent/summon/:sid` | SummonButton activate |
| DELETE | `/agent/summon/:sid` | SummonButton dismiss |
| POST | `/summary/:sid` | End-of-session summary |
| GET | `/metrics` | MetricsBar (polled every 5s) |
| GET | `/lkc/sessions` | Dashboard session list |
| GET | `/lkc/sessions/:sid` | Session detail page |
| GET | `/capture/tags/:sid` | Session tags |
| GET | `/config/client` | Camera fps/quality, TTS hide delay, `lk_url` |
| POST | `/lkc/kg-query` | Literature Q&A (kg-agent) |
| GET | `/privacy/status` | Privacy status |
| POST | `/privacy/tos-consent` | PrivacyConsentModal |

---

## Environment Variables

See `.env.example` for the full list.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE` | Base URL of the FastAPI backend (default `http://localhost:8000`) |
| `NEXT_PUBLIC_LK_URL` | LiveKit server WebSocket URL the browser connects to (default `ws://localhost:7880`) — fallback value; `/config/client` and `/livekit/room` responses can also supply `lk_url` directly from the backend |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL, used by `lib/supabase.ts` for the OAuth/magic-link callback flow |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key, used by `lib/supabase.ts` |

All four are baked into the client bundle at build time — see the Docker
callout above.

Secrets should **never** be committed — `.env` and `.env.local` should be
covered by `.gitignore`.