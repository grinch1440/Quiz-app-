# Quiz Master — full setup guide

This project has three pieces that all talk to the same Supabase database:

1. **The quiz app** (`src/App.jsx`) — what players use.
2. **The admin dashboard** (`public/admin.html`) — where you add/edit content. Once deployed, it lives at `yoursite.vercel.app/admin.html`.
3. **Supabase** — the shared database. Anything you change in admin.html shows up in the app the next time it loads. No more copy-pasting code between files.

Follow these steps in order. None of it requires prior experience — just follow along.

---

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New Project**. Pick any name and password (save the password somewhere — you likely won't need it again, but just in case).
3. Wait ~1 minute for the project to finish setting up.

## 2. Create the database tables

1. In your Supabase project, open the **SQL Editor** (left sidebar).
2. Click **New query**, paste in the entire contents of `supabase/schema.sql`, and click **Run**.
3. Click **New query** again, paste in the entire contents of `supabase/seed.sql`, and click **Run**.
   This loads in the 19 categories, 240 sub-topics, and 95 starter questions already in the app.

## 3. Get your API keys

1. In Supabase, go to **Project Settings → API**.
2. Copy the **Project URL** and the **anon / public key**. You'll paste these in two places below.

## 4. Connect the admin dashboard

1. Open `public/admin.html` in a text editor.
2. Find these two lines near the top of the `<script>` section:
   ```js
   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
   ```
3. Replace them with your actual values from step 3, save the file.
4. You can open `public/admin.html` directly in a browser right now to test it — it'll talk to your live database immediately, no deployment needed yet.

## 5. Run the app locally (optional, but good for testing)

You'll need [Node.js](https://nodejs.org) installed (any recent version).

```bash
cd quiz-master-app
cp .env.example .env.local
# edit .env.local and paste in your Supabase URL + anon key
npm install
npm run dev
```

This opens the app at `http://localhost:5173`. Confirm it loads your categories correctly before moving on.

## 6. Push the project to GitHub

1. Create a new (empty) repository on [github.com](https://github.com) — don't initialize it with a README.
2. In your project folder, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
   git push -u origin main
   ```
   (Your `.env.local` file is excluded automatically via `.gitignore` — your Supabase keys won't be uploaded to GitHub. You'll re-enter them in Vercel in the next step.)

## 7. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account.
2. Click **Add New → Project**, and select the repository you just pushed.
3. Vercel will auto-detect it as a Vite project. Before clicking Deploy, open **Environment Variables** and add:
   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | your Supabase anon key |
4. Click **Deploy**. After a minute or two, you'll get a live URL like `quiz-master-yourname.vercel.app` — that's your temporary domain, shareable immediately.
5. Your admin dashboard is now live too, at `quiz-master-yourname.vercel.app/admin.html`.

From now on: edit content in `admin.html` (local file or the deployed `/admin.html`), and it reflects in the live app the next time someone loads it. No rebuilding, no redeploying, no copy-pasting.

---

## Adding a category with a new icon

The icon dropdown in admin.html is limited to icons already imported in `src/App.jsx` (Brain, GraduationCap, Compass, etc. — see `ICON_NAMES` near the top of `admin.html`). If you want a different icon:

1. Pick a name from [lucide.dev/icons](https://lucide.dev/icons) (e.g. `Rocket`).
2. In `src/App.jsx`, add it to the big `lucide-react` import list near the top, and to the `ICONS = { ... }` map just below it.
3. In `public/admin.html`, add the same name to the `ICON_NAMES` array.
4. Redeploy (push to GitHub — Vercel redeploys automatically on every push).

## About security

`admin.html` currently has full read/write access to your database using the public "anon" key — there's no login screen. That key is visible to anyone who inspects your deployed site's network requests, meaning technically anyone could also write to your database if they found it. For a personal project this is a common, accepted tradeoff. If this ever needs real protection (e.g. you're sharing the app publicly and don't want strangers editing content), the fix is to add Supabase Auth and change the write policies in `schema.sql` from `using (true)` to something like `using (auth.uid() is not null)` — that's a good next step to ask for when you're ready.

