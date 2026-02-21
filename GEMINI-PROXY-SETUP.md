# Gemini API proxy (Edge Function) – step-by-step

This keeps your Gemini API key on the server so it never runs in the browser.

---

## 1. Install Supabase CLI (optional if already installed)

If you already have the CLI, run `supabase --version` to confirm, then skip to step 2.

**macOS (Homebrew):**
```bash
brew install supabase/tap/supabase
```

**npm (any OS):**
```bash
npm install -g supabase
```

**Windows (Scoop):**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

---

## 2. Log in and link your project

**“Linking” is something you do on your computer** (in the terminal), not on the supabase.com website. It connects your project folder to one Supabase cloud project so the CLI knows where to deploy and set secrets.

### 2a. Log in to the CLI (opens browser once)

In a terminal:
```bash
supabase login
```
Sign in in the browser if prompted. After that, the CLI is logged in.

### 2b. Find your project ref (on supabase.com)

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open the project you use for this app (the one whose URL and anon key are in your code).
3. Look at the **browser URL**. It will look like:
   ```text
   https://supabase.com/dashboard/project/abcdefghijklmnop
   ```
   The part at the end (**`abcdefghijklmnop`**) is your **project ref**. It’s a string of letters/numbers (often 20 characters). Copy it.

   **Or:** In the dashboard, go to **Project Settings** (gear icon) → **General**. You’ll see **Reference ID** — that’s the same value. Copy it.

### 2c. Link your folder to that project (in the terminal)

Open a terminal and go to your app folder, then run (replace `YOUR_REF` with the ref you copied):
```bash
cd /Users/andreamcknight/Downloads/investigators-platform-main
supabase link --project-ref YOUR_REF
```
If it asks for a database password, use the one you set when you created the Supabase project (or reset it from Project Settings → Database if you forgot).

When it says “Linked successfully” (or similar), your folder is linked. After that, `supabase secrets set` and `supabase functions deploy` will apply to that project.

---

## 3. Set the Gemini API key as a secret

**You do this entirely in the terminal.** There is no link in the terminal to click for setting the secret. You run one command (below); the only time you open a website is to *get* the key from Google (step 3a).

Your key is stored only in Supabase; the frontend never sees it.

### 3a. Get a Gemini API key (in your browser, once)

1. Open this page in your browser: **https://aistudio.google.com/apikey**
2. Sign in with your Google account if asked.
3. Click **“Create API key”** (or “Get API key”).
4. Copy the key that appears (long string of letters/numbers). Keep this somewhere handy for the next step — you will paste it into the terminal.

### 3b. Give that key to Supabase (in the terminal)

Do this in the **terminal** (the same place you ran `supabase link`). You type or paste a command there and press Enter. You are not editing a file or “attaching” anything to a path.

1. **Open a terminal** (in Cursor: Terminal → New Terminal, or the panel at the bottom).
2. **Check where you are.**  
   Look at the line that ends with `%` or `$`. If it already shows `investigators-platform-main` (e.g. `… Mac investigators-platform-main %`), you are already in the project folder — **skip to step 3**.
   - If you are *not* in that folder, type this and press Enter (use your real Mac username if different):
     ```bash
     cd /Users/andreamcknight/Downloads/investigators-platform-main
     ```
     Or from Downloads:
     ```bash
     cd ~/Downloads/investigators-platform-main
     ```
3. **Set the secret.**  
   Type this (with your real key pasted after the `=`):
   ```bash
   supabase secrets set GEMINI_API_KEY=
   ```
   - Put the cursor after the `=`, then paste your Gemini key (from step 3a). No space, no quotes.
   - Press **Enter**.
4. When the command finishes without an error, the secret is set. You don’t open any link.

---

## 4. Deploy the Edge Function (terminal only)

1. In the terminal, make sure you’re in the project folder:
   ```bash
   cd /Users/andreamcknight/Downloads/investigators-platform-main
   ```
2. Run:
   ```bash
   supabase functions deploy gemini-proxy --no-verify-jwt
   ```
3. Wait until it finishes. You should see a success message (and a URL for the function). No link to click — the deploy is done when the command finishes.

---

## 5. Turn on the proxy in your app (on your computer)

1. In your project folder, open or create the file **`.env.local`** (same folder as `package.json`). If it doesn’t exist, create a new file and name it exactly `.env.local`.
2. Put this single line in the file:
   ```env
   VITE_USE_GEMINI_PROXY=true
   ```
3. Save the file.
4. Do **not** add `VITE_GEMINI_API_KEY` to this file when using the proxy — the key stays only in Supabase.

(If your app already has Supabase URL and anon key in code, you don’t need to add them here. If not, you can add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` as well.)

---

## 6. Restart the dev server and test

1. If the app is already running, stop it (Ctrl+C in the terminal where it’s running).
2. Start it again:
   ```bash
   npm run dev
   ```
3. In the app, open **Communication Hub**, paste an email, and click **Analyze & suggest**. The request goes to your Edge Function (using the secret key on the server), and the result comes back to the app.

---

## Summary

| Step | Action |
|------|--------|
| 1 | Install Supabase CLI (skip if you already have it) |
| 2 | `supabase login` then `supabase link --project-ref YOUR_REF` |
| 3 | `supabase secrets set GEMINI_API_KEY=your_key` |
| 4 | `supabase functions deploy gemini-proxy --no-verify-jwt` |
| 5 | Add `VITE_USE_GEMINI_PROXY=true` to `.env.local` (and set same in production env vars) |
| 6 | Restart dev server and test Communication Hub |

---

## Optional: switch back to client-side key

To use the key in the browser again (e.g. for local dev only):

1. In `.env.local`, remove or set `VITE_USE_GEMINI_PROXY=false` and add `VITE_GEMINI_API_KEY=your_key`.
2. Restart the dev server.

The app uses the proxy only when `VITE_USE_GEMINI_PROXY=true`.

---

## Production (Vercel, Netlify, etc.)

The **same** deployed Edge Function is used by both localhost and production. There is no separate “production-only” setup for the function.

On your hosting provider, set **build-time** environment variables so the built app uses the proxy:

| Variable | Value |
|----------|--------|
| `VITE_USE_GEMINI_PROXY` | `true` |
| `VITE_SUPABASE_URL` | `https://YOUR_REF.supabase.co` (if not hardcoded in code) |
| `VITE_SUPABASE_ANON_KEY` | your anon key (if not hardcoded in code) |

Do **not** put `VITE_GEMINI_API_KEY` in production env vars; the key stays only in Supabase secrets.

After redeploying, the production site will call the Gemini proxy just like localhost.
