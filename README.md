# Lab Brain — Frontend

Next.js 14 + React + TypeScript frontend for the Lab Brain multimodal
research-lab agent (Module 5, Month 6). Communicates with the FastAPI
backend over REST and Server-Sent Events; publishes audio + camera to
LiveKit via WebRTC.

---

## Quick start

### 1. Prerequisites

| Dependency | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Lab Brain backend | running on `localhost:8080` |
| LiveKit SFU | running on `localhost:7880` |

Start the SFU with one command:

```bash
docker run --rm -p 7880:7880 livekit/livekit-server --dev
```

### 2. Install & run

```bash
cd labbrain-frontend
npm install
npm run dev          # starts on http://localhost:5173
```

Production build:

```bash
npm run build
npm start
```

### 3. Environment

Create `.env.local` (already included in the repo):

```
NEXT_PUBLIC_API_BASE=http://localhost:8080
NEXT_PUBLIC_LK_URL=ws://localhost:7880
```

Change these if your backend or LiveKit run on different hosts/ports.

---

## App structure

```
src/
├── app/
│   ├── page.tsx            ← Welcome / landing page
│   ├── auth/
│   │   ├── login/page.tsx  ← Sign-in form
│   │   └── register/page.tsx
│   ├── dashboard/page.tsx  ← User dashboard, past sessions
│   └── session/page.tsx    ← Live session (Google Meet style)
├── components/
│   └── session/
│       ├── AgentReplyBanner.tsx   SSE agent_reply events
│       ├── EnvironmentPanel.tsx   Right sidebar: scene/speakers/environment
│       ├── MetricsBar.tsx         Header: ASR / E2E latency counters
│       ├── ModeIndicator.tsx      Conversation mode pill
│       ├── SpeakerChips.tsx       Detected speaker badges
│       ├── SummonButton.tsx       Manual agent summon/dismiss
│       ├── SummaryModal.tsx       End-of-session summary overlay
│       ├── TranscriptPanel.tsx    Live scrolling transcript
│       └── Waveform.tsx           Animated mic indicator
├── hooks/
│   ├── useSSE.ts      EventSource → Zustand dispatch
│   └── useSession.ts  LiveKit room lifecycle (start / stop)
├── lib/
│   ├── api.ts    All REST calls to the backend
│   ├── auth.ts   Local email/password auth (swap for real API)
│   └── utils.ts  CN helper, colour palettes, formatters
├── store/
│   ├── auth.ts     Zustand auth store (persisted in localStorage)
│   └── session.ts  Zustand session store (transcripts, SSE state)
└── types/index.ts  All TypeScript interfaces
```

---

## Auth

The frontend ships with a **local auth layer** (`src/lib/auth.ts`) that
stores users in `localStorage` — no separate auth backend required.
To connect a real `/auth/*` API, replace the `authService.login` and
`authService.register` functions in that file.

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

---

## Backend endpoints used

| Method | Path | Used by |
|---|---|---|
| POST | `/livekit/room` | Start session |
| GET | `/livekit/token` | Reconnect |
| DELETE | `/livekit/room/:sid` | End session |
| GET | `/events/:sid` | SSE stream |
| GET | `/agent/summon/:sid` | SummonButton poll |
| POST | `/agent/summon/:sid` | SummonButton activate |
| DELETE | `/agent/summon/:sid` | SummonButton dismiss |
| POST | `/summary/:sid` | End-of-session summary |
| GET | `/metrics` | MetricsBar (polled every 5s) |
| GET | `/lkc/sessions` | Dashboard session list |
| GET | `/config/client` | TTS hide delay |
