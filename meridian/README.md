# Meridian

An AI-powered financial health platform. Answer a short assessment, get a
Financial Health Score out of 100 across four weighted pillars, see the exact
calculation, and work a prioritised plan — with an assistant that explains the
result but never invents a number.

Built with Next.js 16, React 19, TypeScript, Tailwind v4, Supabase (PostgreSQL)
and the Anthropic API.

---

## What it does

- **A deterministic score.** Spend 25%, Save 30%, Borrow 25%, Plan 20%. Each
  pillar is weighted components with published thresholds. The engine is pure —
  no React, no database, no clock — so the same input always produces the same
  result.
- **Full transparency.** Every results page lists each component's measured
  value, its weight and the points it contributed. Pillar scores are rounded
  before they are combined, so the four numbers on screen add back up to the
  overall score exactly.
- **Honest about missing data.** A component that cannot be measured is left
  out and the remaining weights are scaled up — never scored as a zero. A
  debt-free profile scores 100 on Borrow. Someone with no car is not marked
  down for having no vehicle cover.
- **Immutable history.** A completed assessment stores its answers, its full
  component breakdown, the input it was scored from and the scoring version.
  The database physically refuses to update those rows, so a score from a year
  ago still means what it meant then.
- **Measured recommendations.** Each recommendation's point value comes from
  re-running the engine with that change applied. Changes that cannot be
  expressed as an input adjustment carry no number rather than a guess.
- **An assistant that is not the source of truth.** It reads the engine's
  output and explains it. For "what if" questions it calls a tool that runs the
  real engine. It cannot see your finances at all unless you allow it.

Everything else — CRUD for income, expenses, savings, debts, goals, assets and
liabilities; a what-if simulator; an improvement roadmap; emergency-fund,
savings-goal and debt-payoff calculators; net worth; monthly check-ins;
deterministic alerts; milestones; printable reports; JSON and CSV export;
account deletion — is built on those foundations.

---

## Quick start

```sh
cd meridian
npm install
cp .env.example .env.local     # then fill it in — see below
npm run dev
```

Open <http://localhost:3000>.

Without any configuration the marketing site and the **full demo** at `/demo`
work immediately: the demo runs the real scoring engine on example data, in the
browser, with no account and no database.

---

## Setting up Supabase

Accounts and saved data need a Supabase project.

1. **Create a project** at <https://supabase.com/dashboard>.

2. **Apply the migrations.** In the SQL editor, run the files in
   `supabase/migrations/` in numerical order:

   | File | What it creates |
   |---|---|
   | `0001_core.sql` | Extensions, enums, `profiles`, `financial_profiles`, `user_settings`, and the trigger that creates a row in each for every new auth user |
   | `0002_financial_records.sql` | Income, expenses, savings, debts, goals, assets, liabilities, net worth snapshots |
   | `0003_assessments.sql` | Assessments, answers, score history, drafts — and the trigger that makes completed assessments immutable |
   | `0004_engagement.sql` | Action plans, AI conversations and messages, notifications, milestones, check-ins, simulations |
   | `0005_rls.sql` | Row level security and grants on every table |
   | `0006_account_deletion.sql` | The function that lets a user delete their own account |

   With the Supabase CLI instead:

   ```sh
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

3. **Configure authentication.** Authentication → Providers → Email. For a
   normal deployment leave *Confirm email* on. Add your site URL and
   `<site>/auth/confirm` to the redirect allow-list.

4. **Copy the keys** from Project Settings → API into `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

   Only the anon key is used. Meridian never needs the service role key, and
   never ships one to the browser — row level security is the authorization
   boundary, not the application.

---

## Setting up the AI assistant

1. Get a key from <https://console.anthropic.com> → API keys.
2. Put it in `.env.local`:

   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

`ANTHROPIC_API_KEY` has no `NEXT_PUBLIC_` prefix and is read only in server
code, so it cannot reach a bundle. Every request goes through an authenticated
route handler that builds the financial context server-side from the database.

Optional:

| Variable | Default | Purpose |
|---|---|---|
| `ANTHROPIC_MODEL` | `claude-opus-5` | The model the assistant runs on |
| `DEMO_AI_ENABLED` | `true` | Set to `false` to switch off the unauthenticated demo assistant |
| `DEMO_AI_MESSAGES_PER_HOUR` | `8` | Per-IP cap on the demo assistant |

**Without a key**, the assistant says so plainly and everything else works
unchanged — insights, alerts, recommendations and the action plan are all
computed deterministically by the scoring engine, not by a model.

> **A note on the demo assistant.** `/api/ai/demo` is unauthenticated by
> design, because the demo has no account. It never touches the database, it
> only ever sees the demo profile's figures, and it is rate limited per IP. It
> is still a route that spends money on your key: if you deploy publicly and do
> not want that, set `DEMO_AI_ENABLED=false`.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | For accounts | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For accounts | Anon public key. Safe in the browser; RLS restricts it |
| `ANTHROPIC_API_KEY` | For the assistant | **Server only.** Never prefix with `NEXT_PUBLIC_` |
| `ANTHROPIC_MODEL` | No | Defaults to `claude-opus-5` |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Absolute origin, for links in auth emails |
| `DEMO_AI_ENABLED` | No | `false` disables the demo assistant |
| `DEMO_AI_MESSAGES_PER_HOUR` | No | Per-IP cap for the demo assistant |
| `TEST_DATABASE_URL` | Tests only | A throwaway PostgreSQL server for `npm run test:db` |

Never commit `.env.local`. It is git-ignored.

---

## Scripts

```sh
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # unit tests (scoring, assessment, calculations)
npm run test:db     # database security suite — needs PostgreSQL
npm run test:e2e    # Playwright
```

---

## Testing

### Unit tests

```sh
npm test
```

Covers every reference point in the scoring specification, the edge cases
(zero income, no debt, no savings, negative disposable income), determinism,
clamping, hostile input, the assessment's conditional questions and cross-field
validation, the improvement roadmap's cumulative arithmetic, and the debt
payoff engine.

### Database security suite

```sh
TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres npm run test:db
```

This rebuilds the entire schema on a throwaway database and then attacks it as
a second user through the same roles and policies production uses: cross-user
reads, updates, deletes, forged inserts, hijacked conversations, anonymous
access, constraint enforcement, historical immutability and cascade deletion.

It runs against plain PostgreSQL. `tests/db/bootstrap-auth.sql` supplies the
pieces Supabase would otherwise provide — the `auth` schema, `auth.uid()`, and
the `anon`/`authenticated` roles — and is **never** applied to a real project.

### End-to-end tests

```sh
npm run build && npm run test:e2e
```

The demo suite needs no credentials: it walks the landing page, the demo
assessment (including a validation failure and a conditional section), the
results and transparency table, the simulator, dark mode, mobile layout, and
the fact that protected routes and API endpoints refuse anonymous callers. It
also runs axe against seven pages and fails on any serious or critical
violation.

#### Running the authenticated E2E suite

The twenty-step round trip in `tests/e2e/authenticated.spec.ts` needs a real
project. It is skipped unless you opt in:

1. Point `.env.local` at a **disposable** Supabase project.
2. Turn **off** email confirmation in Authentication → Providers → Email, so
   sign-up produces a session immediately.
3. Run:

   ```sh
   E2E_AUTH=1 npm run test:e2e
   ```

It creates a uniquely-named account each run. Do not point it at a project
holding real data.

---

## Deployment

Any host that runs Next.js works. On Vercel:

1. Import the repository and set the **root directory** to `meridian`.
2. Add the environment variables above. `ANTHROPIC_API_KEY` must be a plain
   (not public) variable.
3. Set `NEXT_PUBLIC_SITE_URL` to the deployed origin, and add that origin plus
   `<origin>/auth/confirm` to Supabase's redirect allow-list.
4. Deploy. The build runs `next build`; there is no separate migration step, so
   apply the SQL to your project first.

Before going live:

- Apply all six migrations and confirm RLS is on for every table.
- Run `npm run test:db` against a copy of the schema.
- Put a durable rate limiter in front of `/api/ai/chat` and `/api/ai/demo`. The
  in-process limiter in the route handlers resets on deploy and does not span
  instances — it is a brake on an obvious loop, not a security control.
- Decide whether the demo assistant should be on.

---

## How the code is arranged

```
app/
  (marketing)/        landing page
  (auth)/             sign in, sign up, password reset
  auth/               callback, confirm and sign-out route handlers
  assessment/         the questionnaire
  results/[id]/       results for one completed assessment
  dashboard/          overview, pillars, data, goals, simulator, AI, history,
                      reports, calculators, check-in, net worth, settings
  demo/               the whole product on example data, no account
  api/                AI chat, demo AI, data export
components/
  ui/                 shadcn-style primitives on Radix
  assessment/  score/  dashboard/  charts/  ai/  financial-data/
  simulator/  results/  history/  settings/  demo/  marketing/
lib/
  scoring/            THE ENGINE — pure, versioned, no side effects
  calculations/       derived figures, net worth, goals, debt payoff, scenarios
  assessment/         question set, validation, answer → scoring input
  ai/                 config, server-side context builder, system prompt, tools
  supabase/           browser and server clients, session refresh
  actions/            server actions
  data/               server-side queries
  server/             action-plan, alert and milestone synchronisation
supabase/migrations/  the schema
tests/
  scoring/  assessment/  calculations/    unit tests
  db/                                     database security suite
  e2e/                                    Playwright
```

### Where to change things

| To change | Edit |
|---|---|
| A weight or a threshold | `lib/scoring/scoreConfig.ts` |
| A pillar's formula | `lib/scoring/calculate*Score.ts` |
| The questions | `lib/assessment/questions.ts` |
| What the assistant may say | `lib/ai/system-prompt.ts` |
| What the assistant may see | `lib/ai/context.ts` |
| Colours and type | `app/globals.css` |

### Changing the scoring formulas

Scores are versioned so that history never shifts under a formula change:

1. Copy the current engine to `lib/scoring/versions/v1_0.ts`, frozen.
2. Bump `SCORING_VERSION` in `lib/scoring/scoreConfig.ts`.
3. Register the frozen copy against `"v1.0"` in `lib/scoring/versions.ts`, and
   the live engine against the new version.

Existing rows keep the version they were scored with, and the stored breakdown
means an old assessment can be explained in full without re-running anything.

---

## Design and accessibility notes

- **Chart colours are validated, not chosen by eye.** Both the four-pillar set
  and the eight-slot categorical ramp were checked for lightness band, chroma
  floor, colour-vision-deficiency separation, normal-vision separation and
  contrast against the chart surface. Dark mode steps were re-derived against
  the dark surface rather than lightened.
- **Status colours come in two variants.** The base colour is for marks
  (gauges, bars) and clears 3:1. The `-ink` variant is for text and clears
  4.5:1 against the card, the page ground *and* a tint of its own hue — which
  is what small chips actually sit on.
- **Every chart has a table view** of the same numbers, and a legend, so
  identity is never carried by colour alone.
- Reduced motion is honoured globally in CSS and per-component through Motion.
- The axe suite fails the build on any serious or critical violation.

---

## What this is not

Meridian gives you a structured read on your own figures and general guidance
about them. It is not financial, tax or legal advice, it does not know your
full circumstances, and it is not a substitute for a professional who does. The
score is not a credit score and no lender ever sees it.
