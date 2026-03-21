# TIER™ CaseFlow — Demo Setup

## Demo accounts (investigator only)

For client walkthroughs, use **only** the investigator demo account. This shows what investigators see: assigned cases, tasks, workload log, reports, and export/backup.

| Purpose | Email | Role |
|---------|-------|------|
| **Client demos** | `demo.investigator@tiercaseflow.com` | Investigator |

The demo admin account (`demo.admin@tiercaseflow.com`) has been retired to avoid mishaps — demos are investigator-view only.

---

## Removing the demo admin (if it still exists)

1. Open **Supabase Dashboard** → your project.
2. Go to **Authentication** → **Users**.
3. Find `demo.admin@tiercaseflow.com`.
4. Click the **⋮** (three dots) → **Delete user**.

No code changes needed; the app does not reference demo admin.

---

## Demo data (cases & tasks)

The seed script `supabase/seed_demo_cases.sql` creates 20 `DEMO-2025-*` cases and global tasks **assigned to the demo investigator**:

- **Investigator UUID** (update in the seed if yours differs): `3ae71177-3e66-46e2-ac12-8750b69a3764`
- Run in **Supabase → SQL Editor**.

---

*`docs/DEMO.md`*
