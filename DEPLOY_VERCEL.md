# Deploy Checklist (Vercel)

## 1) Deploy
1. Import the GitHub repo in Vercel.
2. Framework: Next.js (auto-detected).
3. Add env vars (Production):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_TOKEN`
   - `DEMO_MODE=true`
   - `DEMO_VIEW_KEY`
4. Deploy.

## 2) Verify (Smoke)
- Open `/` and confirm Greek landing page loads.
- Open `/demo` and navigate to `/hr/demo`.
- Enter `DEMO_VIEW_KEY`, run **Simulate Candidates**, confirm ranking fills.
- Open `/t2/demo` and submit one candidate.
- Return to `/hr/demo` and confirm ranking updates.
