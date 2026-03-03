# Vercel Setup (Demo-Only, Απλό)

## A) ΑΠΑΡΑΙΤΗΤΑ ENV VARS (μόνο για demo)
Βάλε **ακριβώς** αυτά στο Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEMO_MODE` = `true`
- `DEMO_VIEW_KEY`

Προαιρετικά (όχι απαραίτητα για βασικό demo):
- `ADMIN_TOKEN` (μόνο για internal admin pages)
- `PRESENTER_TOKEN` (μόνο για Presenter hint)

---

## B) Deploy σε 10 βήματα (click-by-click)
1. Μπες στο `vercel.com` και κάνε login με GitHub.
2. Πάτα **Add New** → **Project**.
3. Βρες το repo `Nickhal89/new-project` και πάτα **Import**.
4. Άφησε το framework σε **Next.js** (auto-detected).
5. Άνοιξε το section **Environment Variables**.
6. Πρόσθεσε ένα-ένα τα 5 απαραίτητα env vars (βλέπε ενότητα Α).
7. Βεβαιώσου ότι `DEMO_MODE` είναι ακριβώς `true`.
8. Πάτα **Deploy**.
9. Περίμενε να γίνει build και να εμφανιστεί status **Ready**.
10. Πάτα **Visit** για να ανοίξεις το live URL.

---

## C) Verification checklist (5 βήματα)
1. Άνοιξε `/demo` → PASS αν φορτώνει το Demo Hub.
2. Άνοιξε `/hr/demo` → βάλε `DEMO_VIEW_KEY` → PASS αν ανοίγει dashboard.
3. Πάτα **Simulate Candidates** → PASS αν γεμίσει ranking.
4. Άνοιξε `/t2/demo` → PASS αν ανοίγει candidate demo flow.
5. Άνοιξε `/demo/health` → PASS αν οι έλεγχοι είναι πράσινοι.

---

## D) Αν αποτύχει το deploy
- Άνοιξε **Project → Deployments → τελευταίο deployment → Build Logs**.
- Κοίτα το πρώτο error block (συνήθως λείπει env var ή είναι λάθος τιμή).
- Διόρθωσε env vars στο **Settings → Environment Variables** και κάνε **Redeploy**.
