# AI Todo Planner

AI-assisted to-do planner built with React + TypeScript + Vite. Tasks are persisted per user in Supabase, and Gemini (via an Express proxy) re-orders the list so the most impactful work floats to the top. The UI follows the "midnight indigo" × "vanilla cream" palette to keep focus on the plan.

## Features

- Email/password auth with Supabase, including session persistence and sign-out.
- Per-user todo storage in Supabase (`todos` table) with real-time loading states.
- Gemini 2.5 Flash prioritization triggered on demand through a secure Express proxy.
- Responsive UI with inline stats, disabled states while loading/prioritizing, and graceful error handling.

## Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- Access to the Google Gemini API (key stored server-side)

## Environment variables

Copy `.env.example` to `.env` and fill in the real values:

```bash
cp .env.example .env
```

```
GEMINI_API_KEY=your_server_side_gemini_key
SERVER_PORT=5000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> The Gemini key is only consumed by the Express server (`server/index.js`) so it never leaks to the browser.
> `VITE_SUPABASE_ANON_KEY` must be the public anon key from Project Settings → API (it usually starts with `ey`). Never paste the `sb_secret_*` service-role key into client-side env vars. Rotate the service key in Supabase if it was exposed.

## Supabase setup

1. Create a new project and grab the project URL + anon key for the Vite env vars above.
2. Run the SQL below in the Supabase SQL editor to create the table and enable Row Level Security (RLS):

```sql
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  text text not null,
  completed boolean not null default false,
  priority integer,
  created_at timestamp with time zone default now()
);

alter table public.todos enable row level security;

create policy "Users can manage their todos"
on public.todos
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

3. Under **Authentication → Providers**, ensure email signups are enabled.
4. Optional: enable email confirmations. The UI already surfaces the "check your email" message after sign up.

## Install & run locally

```bash
npm install
npm run dev
```

`npm run dev` launches both the Express proxy (`server/index.js`) and the Vite dev server via `concurrently`. Visit the printed Vite URL (usually `http://localhost:5173`).

## How prioritization works

1. Todos are fetched from Supabase after a session is detected.
2. Clicking "Prioritize with AI" posts the current list to the backend.
3. `server/index.js` calls Gemini 2.5 Flash and returns the new ordering.
4. The client reorders the list locally and writes the updated `priority` values back to Supabase for that user, keeping the sort stable across devices.

## Deployment notes

1. Deploy the Vite app (e.g., Vercel) and configure the same `VITE_SUPABASE_*` env vars in the hosting platform.
2. Deploy the Express proxy (Vercel serverless, Render, Fly, etc.) with `GEMINI_API_KEY` and `SERVER_PORT` (port ignored on serverless). Make sure CORS allows your frontend origin.
3. Update the frontend service (`GeminiService`) base URL if the proxy is not served from the same origin (`/api`).
4. In Supabase, add any custom domains used by the front/back end to the auth redirect allow list.

## Testing checklist

- 🔐 Sign up with a new email → receive confirmation → sign in.
- ➕ Add a task; verify it appears instantly and survives reload.
- ✅ Toggle and delete tasks to ensure Supabase mutations succeed.
- 🤖 Prioritize tasks and confirm priorities persist after refresh.
- 🔁 Sign out/in to verify session handling and cleared state.

Happy planning!
