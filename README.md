# Crossroads HR - Candidate Assessment Wizard (MVP v1)

## 1) Project Folder Structure

```txt
app/
  api/
    session/start/route.ts
    session/save/route.ts
    session/submit/route.ts
    upload-cv/route.ts
  t/[job_token]/page.tsx
  t2/[job_token]/page.tsx
  globals.css
  layout.tsx
  page.tsx
components/
  candidate-wizard.tsx
  candidate-wizard-waiter-v2.tsx
  hr-ranking-table.tsx
lib/
  insights.ts
  session.ts
  supabase.ts
  supabaseClient.ts
types/
  assessment.ts
.env.example
```

## 2) Required Environment Variables

See `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL` (for server-rendered HR ranking page fetch)

## 3) Supabase Client Setup

`lib/supabase.ts` is server-only (with guard) and uses service-role key for API routes.
`lib/supabaseClient.ts` is browser-safe and uses anon key for client use-cases.

## 4) API Routes

- `POST /api/session/start`
- `POST /api/session/save`
- `POST /api/session/submit`
- `POST /api/upload-cv`

## 5) Wizard UI

Public route:

- `/t/[job_token]` (legacy v1)
- `/t2/[job_token]` (Waiter v2 pilot form - 18 items)

Features:

- email + consents
- CV upload (optional)
- multi-step questions
- autosave after each step
- resume previous session
- submit as `submitted`

## 6) Resume Logic

Session and in-progress payload are persisted in `localStorage` with a key scoped by `job_token`.


## 7) HR Ranking v2 Visibility

Ranking rows now include score payload `version` and v2 `topCompetencies` when `score_json.version = waiter_v2`, so HR can see top strengths and role-specific why bullets.

## 8) Test Commands

Quick local checks:

- `npm run test` → runs unit tests for `scoreWaiterV2` using Node's test runner.
- `npm run smoke` → runs an end-to-end API smoke test against a running local app.

### Smoke test env vars

Set these before running `npm run smoke`:

- `BASE_URL` (optional, defaults to `http://localhost:3000`)
- `SMOKE_JOB_TOKEN` (required)
- `SMOKE_JOB_ID` (required)
- `SMOKE_HR_TOKEN` (required)
- `SMOKE_EMAIL` (optional; defaults to `smoke+<timestamp>@example.com`)

Example:

```bash
BASE_URL=http://localhost:3000 \
SMOKE_JOB_TOKEN=demo123 \
SMOKE_JOB_ID=<job-id> \
SMOKE_HR_TOKEN=<hr-token> \
npm run smoke
```


## 9) Admin Smoke Test UI

You can run the full smoke check from a browser without terminal commands.

1. Set these env vars in `.env.local`:
   - `ADMIN_TOKEN`
   - `SMOKE_JOB_TOKEN`
   - `SMOKE_JOB_ID`
   - `SMOKE_HR_TOKEN`
   - (optional) `SMOKE_EMAIL`
2. Start the app (`npm run dev`).
3. Open:
   - `http://localhost:3000/admin/health?token=YOUR_ADMIN_TOKEN`
4. Click **Run Smoke Test**.

Security note: the page reads `?token=...` once, then removes it from the URL and uses the `x-admin-token` header for API calls.

A **PASS** means the critical flow succeeded end-to-end:
`start session -> save waiter answers -> submit (v2 scoring) -> HR ranking returns waiter_v2 fields`.


## 10) Admin Demo Panel (UI-only demo flow)

Use this panel to run a full demo without terminal steps:

- URL: `http://localhost:3000/admin/demo?token=YOUR_ADMIN_TOKEN`
- Button 1: **Seed Demo Job** (creates demo company/job + HR token)
- Button 2: **Run Full Demo Simulation** (simulates 10 waiter_v2 candidates and loads ranking)

The panel shows job identifiers, run status, logs, and top-5 ranking with competencies/why bullets.


## 11) Windows One-Click Setup

For non-technical setup on Windows:

1. Open PowerShell in the project folder.
2. Run: `powershell -ExecutionPolicy Bypass -File .\scripts\setup-windows.ps1`
3. Paste the requested Supabase/admin values when prompted.
4. Use the printed URLs for `/admin/demo` and `/admin/health`.

See `RUN_ME_FIRST_WINDOWS.md` for the ultra-short guide.


## 12) Public Demo URLs

After deploy:
- `/`
- `/demo`
- `/hr/demo`
- `/t2/demo`
- `/demo/health`

## 13) Demo Mode (safe synthetic demo)

Set:
- `DEMO_MODE=true`
- `DEMO_VIEW_KEY=<demo_passcode>`

Behavior in demo mode:
- Demo endpoints (`/api/demo/*`) accept only `x-demo-key`.
- Candidate simulation uses synthetic `example.com` emails.
- CV upload is mocked/disabled and stores demo placeholder path.

## 14) Vercel env vars

Required for hosted demo:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_MODE`
- `DEMO_VIEW_KEY`
- `ADMIN_TOKEN` (optional internal admin pages)

See `DEPLOY_VERCEL.md` for the full deployment checklist.


Presenter endpoint env:
- `PRESENTER_TOKEN` (optional presenter-only token for `/api/demo/presenter-hint`)


## 15) Sprint 5.2 UI polish

- Added reusable UI kit in `components/ui` (`Button`, `Card`, `Badge`, `Input`, `Modal`, `Tabs`).
- Added B2B-style HR dashboard UX upgrades at `/hr/demo` (KPI tiles + candidate drawer + copy summary).
- Added `/roadmap` pitch page with Presenter Mode toggle.
- Refined demo pages to use the shared UI kit: `/demo`, `/demo/health`, `/t2/demo`.


## Windows Guided Launcher

- Double-click `LAUNCH_DEMO.bat`.
- In the menu, choose:
  - `[2]` to create/fix `.env.local`
  - `[3]` to install and run locally
- Then open: `http://localhost:3000/demo`
- The launcher also includes:
  - guides opener `[1]`
  - Vercel steps `[4]`
  - local demo health opener `[5]`
