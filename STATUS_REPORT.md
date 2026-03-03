# STATUS REPORT — Crossroads HR (Where are we now?)

## 1) System map (απλά, στα ελληνικά)

### a) Public demo hub
- Entry: `/demo`
- Ρόλος: κεντρική επιλογή εμπειρίας (HR Demo ή Candidate Demo) + CTA pilot.

### b) HR demo dashboard + auth
- Entry: `/hr/demo`
- Auth: passcode που αποθηκεύεται σε `sessionStorage` και στέλνεται ως `x-demo-key` στα `/api/demo/*`.
- Δράσεις: simulate, reset, export CSV, candidate drawer.

### c) Candidate demo flow
- Entry: `/t2/demo` (landing) → `/t2/demo/start` → `/t2/[job_token]` wizard.
- Ρόλος: waiter_v2 assessment flow με submit.

### d) Pilot HR job dashboard + token guard
- Entry: `/hr/job/[jobId]?token=...`
- Guard: `/api/hr/job/[jobId]/ranking` ελέγχει token μέσω `verifyCompanyTokenForJob` (hash compare σε `company_access_tokens`).

### e) Candidate job flow + session APIs
- Entry: `/t2/[job_token]`
- APIs: `/api/session/start` → `/api/session/save` → `/api/session/submit`.

### f) Submit-time scoring routing (v1 vs waiter_v2)
- Στο submit route γίνεται routing:
  - αν υπάρχουν waiter_v2 keys → `scoreWaiterV2`
  - αλλιώς fallback `scoreV1`
- Storage: γράφεται σε `assessment_scores` (`overall_fit`, `score_json` με `version`, `why`, `competencies`, `flags`).

### g) HR ranking endpoint output
- Endpoint: `/api/hr/job/[jobId]/ranking`
- Output ανά row: `version`, `overallFit`, `why`, `topCompetencies` (για waiter_v2), + breakdown.

---

## 2) Readiness checklist (PASS/FAIL)

### A) User-friendly demo (3 λεπτά αξία για HR)
- **PASS (με μικρά ρίσκα)**
- Υπάρχουν `/demo`, `/hr/demo`, `/t2/demo`, KPI, ranking, why bullets, export.
- Blockers: αξιοπιστία demo εξαρτάται από env/network· θέλει πειθαρχία σε deploy checks.

### B) Pilot-ready job flow (create job → candidate link → HR ranking)
- **PASS (MVP pilot level)**
- Υπάρχει `/admin/jobs` + `POST /api/admin/jobs/create` που δίνει HR/Candidate links με reuse υπάρχοντος pipeline.
- Blockers: admin πρόσβαση βασίζεται σε token (όχι πλήρες RBAC), operational process χρειάζεται καθαρή χρήση.

### C) Towards final product
- **FAIL (αναμενόμενο για το στάδιο)**
- Λείπουν multi-tenant auth model, πλήρες compliance ops, role management, calibration lifecycle, analytics depth.

---

## 3) Current level (Demo vs Pilot vs Final)
- **Demo: A-**
  - Παρουσιάζει καθαρά business value σε μη τεχνικό HR manager.
- **Pilot: B**
  - Ρεαλιστική ροή για μικρό pilot με περιορισμένο operational complexity.
- **Final product: C-**
  - Σωστή βάση, αλλά λείπουν κρίσιμα production layers (governance, tenancy, compliance depth).

---

## 4) Top 10 risks (brutal honesty)
1. Μεγάλη εξάρτηση από env correctness (λάθος key = demo fail).
2. Token-in-URL στο `/hr/job/[jobId]?token=...` για pilot links.
3. Χωρίς πλήρες auth/RBAC για οργανωμένη εταιρική χρήση.
4. In-memory rate limiting (όχι distributed-safe).
5. Περιορισμένο item bank για γενίκευση πέρα από waiter profile.
6. Scoring explainability καλό, αλλά calibration data ακόμη χαμηλό.
7. Operational onboarding δεν είναι ακόμη “idiot-proof” σε όλους τους χρήστες.
8. QA κυρίως smoke/unit, όχι πλήρης end-to-end matrix.
9. CSV export υπάρχει, αλλά όχι πλήρες report workflow για HR governance.
10. Scope risk: εύκολο να ανοίξει παράλληλη λογική αν δεν κρατηθεί strict product discipline.

---

## 5) Top 5 next actions (strict order)
1. **Stabilize pilot ops**: συγκεκριμένο runbook για create-job → candidate submissions → HR ranking check.
2. **Hardening auth surfaces**: μειωμένη έκθεση tokens σε URL όπου γίνεται.
3. **Pilot metrics layer**: μετρήσιμα KPI (time-to-shortlist, interview conversion).
4. **Item bank expansion by role**: μετά τον waiter, controlled δεύτερο προφίλ.
5. **Compliance/tenancy planning**: RBAC + data retention policy as next major foundation.

---

## 6) What NOT to do next (anti-scope)
- Όχι billing/subscriptions τώρα.
- Όχι multi-role UI explosion πριν σταθεροποιηθεί pilot ops.
- Όχι μεγάλο refactor scoring pipeline τώρα.
- Όχι νέο παράλληλο demo σύστημα.
- Όχι DB migrations χωρίς άμεσο pilot ανάγκη.

---

## 7) Recommendation
**Proceed to Deliverable #4 (Pilot-Ready HR Link Flow) now? → YES.**

Γιατί:
- Είναι ήδη ο σωστός επόμενος κρίκος μεταξύ demo και πραγματικού pilot usage.
- Πατάει σε υπάρχουσα αρχιτεκτονική χωρίς νέο scoring ή schema αλλαγές.

Αν προχωρήσουμε (strict scope), τα αρχεία που πρέπει να αλλάξουν είναι:
1. `app/admin/jobs/page.tsx`
2. `app/api/admin/jobs/create/route.ts`

(Και τίποτα άλλο εκτός αν βρεθεί blocker στα tests.)
