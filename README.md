# Daily Quiz

Google login → pick **Player** or **Admin** (admin needs the passphrase `enigmadminphrase`) → admins post a free-text daily question → players answer it → answers are auto-graded against keywords with manual admin override.

## Stack

- **Frontend:** Vite + React, `@supabase/supabase-js`
- **Backend/data:** Supabase (Postgres + Auth + Row Level Security)
- **Auto-grading:** a Postgres `BEFORE INSERT` trigger on `answers`
- **Admin signup:** a `SECURITY DEFINER` Postgres function `create_admin_profile(passphrase)`

## One-time setup

### 1. Database schema
Open the Supabase dashboard → **SQL Editor** → New query → paste the whole `supabase/schema.sql` file → **Run**. This creates the tables, trigger, functions, and RLS policies.

### 2. Google sign-in
1. Supabase → **Authentication → Providers → Google → Enable**.
2. Create a Google OAuth client at console.cloud.google.com (Authorized redirect URI must match the one shown in Supabase Auth settings, e.g. `https://obevkfvwefztcsmsglts.supabase.co/auth/v1/callback`; for local dev, set `localhost:5173` as an allowed client origin).
3. Put the OAuth client ID and secret into Supabase.
4. **Authentication → URL Configuration** → add `http://localhost:5173` to *Redirect URLs*.

### 3. Keys
Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (Dashboard → Settings → API). Only the **anon** key goes in the client. Never commit `.env`.

## Run locally

```bash
npm install
npm run dev
```

## Data model

- `profiles(id, email, name, avatar_url, role: 'admin'|'player', created_at)`
- `questions(id, text, question_date, keywords[], explanation, active, created_at)`
- `answers(id, question_id, profile_id, answer_text, score, status, auto_matched, graded_by, graded_at, created_at)`
- `admin_secrets(passphrase)` — single row, deny-all RLS, read only by `create_admin_profile`

## How grading works

- Player submits an answer → the `auto_grade` trigger checks it against the question's `keywords` (case/punctuation-insensitive substring match).
- Keyword hit → auto-graded correct (1 pt) → admin can override in the **Grade** tab.
- No hit / no keywords → `status = 'pending'` → reviewed manually.

## Roles & security (RLS)

- Players: insert their own `profiles` (role must be `player`), read their own answers/profiles, read all questions.
- Admins: created only via `create_admin_profile` with the passphrase; manage questions and grade answers.
- The passphrase lives in `admin_secrets` and is not readable by anyone; change it by updating that table.