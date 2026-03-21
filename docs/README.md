# TIER CaseFlow™ — Documentation

| Document | Audience | Description |
|----------|----------|-------------|
| **[QUICK_START_INVESTIGATOR_ONE_PAGE.md](./QUICK_START_INVESTIGATOR_ONE_PAGE.md)** | Investigators | One-page cheat sheet. |
| **[USER_GUIDE_INVESTIGATOR.md](./USER_GUIDE_INVESTIGATOR.md)** | Investigators | Full step-by-step guide with screenshot placeholders. |
| **[images/README.md](./images/README.md)** | — | Where to drop screenshots + filename list. |

The older combined `USER_GUIDE.md` (investigators + admins) is deprecated; use the investigator guides above unless you need a separate admin manual later.

---

## Deploying the **app** vs the **landing page**

These are usually **two different folders / GitHub repos**:

| What | Typical folder / repo | What to push |
|------|------------------------|--------------|
| **Marketing site** (Vite/React landing) | e.g. `tiercaseflow-landing-page-main` | That repo only — won’t change the investigator app. |
| **Investigator app** (Supabase + `app.tsx`) | e.g. `investigators-platform-main` | This repo — the one with `app.tsx`, `vite.config`, etc. |

If you push the landing page but open the **hosted app URL**, you won’t see app changes until the **app** project is rebuilt and deployed (e.g. Vercel **Build Command** `npm run build` on the app repo, or your host’s equivalent).

**After pulling changes locally**, run `npm install` (if needed) and `npm run build` in the **app** folder so production assets match `app.tsx`. Commit `dist/` only if your host serves pre-built files from git; many hosts build on deploy and ignore `dist`.

---

## Where is the JSON backup in the UI?

In the live app: **System Settings** (sidebar) → at the top, **Export & backup** → **Download my data (JSON)**.  
The file is named like **`my_data_export_YYYY-MM-DD.json`** and lands in your browser’s **Downloads** folder. Open it in any text editor; it is indented (not one long line).

**Spreadsheet exports:** use **.csv** or, if Excel misaligns columns, **Registry .tsv** / **Tasks .tsv** (tab-separated).
