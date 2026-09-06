/**
 * Database security suite (§45, §50, §76, §82).
 *
 * Applies every migration to a throwaway PostgreSQL database and then attacks
 * it the way a malicious client would: as user B, try to read, change and
 * delete user A's rows through the same roles and policies production uses.
 *
 * This runs against plain PostgreSQL. tests/db/bootstrap-auth.sql supplies the
 * pieces Supabase would otherwise provide (the auth schema, auth.uid(), and
 * the anon/authenticated roles) and is never applied to a real project.
 *
 *   TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/postgres \
 *     npm run test:db
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const ADMIN_URL =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/postgres";
const DB_NAME = process.env.TEST_DATABASE_NAME ?? "meridian_test";
const ROOT = join(import.meta.dirname, "..", "..");

const ALICE = "11111111-1111-4111-8111-111111111111";
const BOB = "22222222-2222-4222-8222-222222222222";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failures.push(name + (detail ? ` - ${detail}` : ""));
    console.log(`  FAIL  ${name}${detail ? ` - ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
  console.log("-".repeat(title.length));
}

/** Runs a statement and reports whether it was rejected, and with what code. */
async function attempt(
  client: Client,
  sql: string,
  params: unknown[] = [],
): Promise<
  { ok: true; rowCount: number } | { ok: false; code?: string; message: string }
> {
  try {
    const res = await client.query(sql, params as never[]);
    return { ok: true, rowCount: res.rowCount ?? 0 };
  } catch (error) {
    const err = error as { code?: string; message: string };
    return { ok: false, code: err.code, message: err.message };
  }
}

/** Runs `fn` inside a transaction acting as `userId` through the authenticated role. */
async function asUser<T>(
  url: string,
  userId: string | null,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: userId, role: userId ? "authenticated" : "anon" }),
    ]);
    await client.query(userId ? "set local role authenticated" : "set local role anon");
    return await fn(client);
  } finally {
    await client.query("rollback").catch(() => {});
    await client.end();
  }
}

async function main() {
  // ---- Rebuild the database from the migrations ---------------------------
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(
    `select pg_terminate_backend(pid) from pg_stat_activity
      where datname = $1 and pid <> pg_backend_pid()`,
    [DB_NAME],
  );
  await admin.query(`drop database if exists ${DB_NAME}`);
  await admin.query(`create database ${DB_NAME}`);
  await admin.end();

  const dbUrl = new URL(ADMIN_URL);
  dbUrl.pathname = `/${DB_NAME}`;
  const url = dbUrl.toString();

  const setup = new Client({ connectionString: url });
  await setup.connect();

  const files = [
    join(ROOT, "tests", "db", "bootstrap-auth.sql"),
    ...readdirSync(join(ROOT, "supabase", "migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort()
      .map((f) => join(ROOT, "supabase", "migrations", f)),
  ];

  section("Migrations");
  for (const file of files) {
    const name = file.split("/").slice(-1)[0];
    try {
      await setup.query(readFileSync(file, "utf8"));
      check(`apply ${name}`, true);
    } catch (error) {
      check(`apply ${name}`, false, (error as Error).message);
      throw error;
    }
  }

  // Every table must have RLS on - a new table that forgets it fails here.
  const rls = await setup.query<{ tablename: string; rowsecurity: boolean }>(
    `select tablename, rowsecurity from pg_tables where schemaname = 'public'`,
  );
  const unprotected = rls.rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
  check(
    `row level security enabled on all ${rls.rows.length} tables`,
    unprotected.length === 0,
    unprotected.join(", "),
  );

  // Every table must carry at least a select and an insert policy.
  const policyCounts = await setup.query<{ tablename: string; n: string }>(
    `select tablename, count(*)::text as n from pg_policies
      where schemaname = 'public' group by tablename`,
  );
  const byTable = new Map(policyCounts.rows.map((r) => [r.tablename, Number(r.n)]));
  const missingPolicies = rls.rows
    .map((r) => r.tablename)
    .filter((t) => (byTable.get(t) ?? 0) < 2);
  check("every table has policies", missingPolicies.length === 0, missingPolicies.join(", "));

  // The historical tables must have no update or delete policy at all.
  const historyPolicies = await setup.query<{ tablename: string; cmd: string }>(
    `select tablename, cmd from pg_policies
       where schemaname = 'public'
         and tablename in ('assessments', 'assessment_answers', 'score_history')
         and cmd in ('UPDATE', 'DELETE')`,
  );
  check(
    "no UPDATE/DELETE policy on historical tables",
    historyPolicies.rowCount === 0,
    historyPolicies.rows.map((r) => `${r.tablename}:${r.cmd}`).join(", "),
  );

  // ---- Seed two users -----------------------------------------------------
  await setup.query(
    `insert into auth.users (id, email, raw_user_meta_data)
     values ($1, 'alice@example.test', '{"full_name":"Alice"}'::jsonb),
            ($2, 'bob@example.test',   '{"full_name":"Bob"}'::jsonb)`,
    [ALICE, BOB],
  );

  section("Signup bootstrap");
  const bootstrapped = await setup.query(
    `select
       (select count(*) from public.profiles)::text as profiles,
       (select count(*) from public.user_settings)::text as settings,
       (select count(*) from public.financial_profiles)::text as fin`,
  );
  const b = bootstrapped.rows[0] as Record<string, string>;
  check("profile row created for each new auth user", b.profiles === "2");
  check("settings row created for each new auth user", b.settings === "2");
  check("financial profile row created for each new auth user", b.fin === "2");

  // Alice's data is created through the same authenticated role the app uses,
  // then committed so the later connections can attack it.
  const alice = new Client({ connectionString: url });
  await alice.connect();
  await alice.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: ALICE, role: "authenticated" }),
  ]);
  await alice.query("set role authenticated");

  section("Owner writes");
  const insertedIncome = await attempt(
    alice,
    `insert into public.income_sources (user_id, name, amount)
     values ($1, 'Salary', 5000) returning id`,
    [ALICE],
  );
  check("owner can insert their own record", insertedIncome.ok);

  const assessment = await alice.query<{ id: string }>(
    `insert into public.assessments
       (user_id, assessment_version, scoring_version, overall_score,
        spend_score, save_score, borrow_score, plan_score)
     values ($1, 'v1.0', 'v1.0', 72, 70, 48, 100, 65)
     returning id`,
    [ALICE],
  );
  const assessmentId = assessment.rows[0].id;
  check("owner can record a completed assessment", Boolean(assessmentId));

  await alice.query(
    `insert into public.assessment_answers (assessment_id, user_id, question_id, question, answer)
     values ($1, $2, 'bill_payment', 'Do you pay bills on time?', 'Always')`,
    [assessmentId, ALICE],
  );
  await alice.query(
    `insert into public.score_history
       (user_id, assessment_id, overall_score, spend_score, save_score, borrow_score, plan_score)
     values ($1, $2, 72, 70, 48, 100, 65)`,
    [ALICE, assessmentId],
  );
  await alice.query(
    `insert into public.expenses (user_id, name, amount, category)
     values ($1, 'Rent', 1800, 'housing')`,
    [ALICE],
  );
  await alice.query(
    `insert into public.financial_goals (user_id, name, target_amount)
     values ($1, 'Emergency fund', 12000)`,
    [ALICE],
  );

  section("Historical immutability");
  const updateOwn = await attempt(
    alice,
    `update public.assessments set overall_score = 99 where id = $1`,
    [assessmentId],
  );
  check(
    "owner cannot rewrite their own completed assessment",
    !updateOwn.ok,
    updateOwn.ok ? `rowCount=${updateOwn.rowCount}` : undefined,
  );
  const updateAnswers = await attempt(
    alice,
    `update public.assessment_answers set answer = 'Never' where assessment_id = $1`,
    [assessmentId],
  );
  check("owner cannot rewrite recorded answers", !updateAnswers.ok);
  const updateHistory = await attempt(
    alice,
    `update public.score_history set overall_score = 99 where assessment_id = $1`,
    [assessmentId],
  );
  check("owner cannot rewrite score history", !updateHistory.ok);
  const deleteOwn = await attempt(alice, `delete from public.assessments where id = $1`, [
    assessmentId,
  ]);
  check(
    "owner cannot delete a completed assessment",
    !deleteOwn.ok || deleteOwn.rowCount === 0,
  );

  section("Database constraints");
  const negativeAmount = await attempt(
    alice,
    `insert into public.income_sources (user_id, name, amount) values ($1, 'Bad', -100)`,
    [ALICE],
  );
  check("negative income is rejected by the database", !negativeAmount.ok);
  const outOfRangeScore = await attempt(
    alice,
    `insert into public.assessments (user_id, assessment_version, scoring_version, overall_score)
     values ($1, 'v1.0', 'v1.0', 140)`,
    [ALICE],
  );
  check("a score above 100 is rejected by the database", !outOfRangeScore.ok);
  const badVersion = await attempt(
    alice,
    `insert into public.assessments (user_id, assessment_version, scoring_version, overall_score)
     values ($1, 'latest', 'latest', 50)`,
    [ALICE],
  );
  check("an unversioned assessment is rejected", !badVersion.ok);
  const blankName = await attempt(
    alice,
    `insert into public.expenses (user_id, name, amount) values ($1, '   ', 10)`,
    [ALICE],
  );
  check("a blank record name is rejected", !blankName.ok);
  const badCompletion = await attempt(
    alice,
    `insert into public.action_plans (user_id, title, status) values ($1, 'Do a thing', 'completed')`,
    [ALICE],
  );
  check("a completed action with no completion time is rejected", !badCompletion.ok);

  await alice.end();

  // ---- The attack ---------------------------------------------------------
  section("Cross-user access as a second authenticated user");
  await asUser(url, BOB, async (bob) => {
    const tables = [
      "income_sources",
      "expenses",
      "savings_accounts",
      "debts",
      "financial_goals",
      "assessments",
      "assessment_answers",
      "score_history",
      "profiles",
      "user_settings",
      "financial_profiles",
    ];
    for (const table of tables) {
      const res = await bob.query<{ n: string }>(
        `select count(*)::text as n from public.${table} where ${
          table === "profiles" ? "id" : "user_id"
        } = $1`,
        [ALICE],
      );
      check(`cannot read another user's ${table}`, res.rows[0].n === "0");
    }

    const stolenUpdate = await attempt(
      bob,
      `update public.income_sources set amount = 1 where user_id = $1`,
      [ALICE],
    );
    check(
      "cannot update another user's income",
      stolenUpdate.ok && stolenUpdate.rowCount === 0,
    );

    const stolenDelete = await attempt(
      bob,
      `delete from public.expenses where user_id = $1`,
      [ALICE],
    );
    check(
      "cannot delete another user's expenses",
      stolenDelete.ok && stolenDelete.rowCount === 0,
    );

    const forgedInsert = await attempt(
      bob,
      `insert into public.expenses (user_id, name, amount) values ($1, 'Planted', 1)`,
      [ALICE],
    );
    check("cannot write a row owned by another user", !forgedInsert.ok);

    const forgedAssessment = await attempt(
      bob,
      `insert into public.assessments (user_id, assessment_version, scoring_version, overall_score)
       values ($1, 'v1.0', 'v1.0', 100)`,
      [ALICE],
    );
    check("cannot plant an assessment on another user", !forgedAssessment.ok);

    const hijackedAnswer = await attempt(
      bob,
      `insert into public.assessment_answers (assessment_id, user_id, question_id, question, answer)
       values ($1, $2, 'q', 'Q', 'A')`,
      [assessmentId, BOB],
    );
    check("cannot attach answers to another user's assessment", !hijackedAnswer.ok);
  });

  section("Anonymous access");
  await asUser(url, null, async (anon) => {
    const res = await attempt(anon, `select count(*) from public.income_sources`);
    check(
      "anonymous role cannot read financial records",
      !res.ok,
      res.ok ? "select succeeded" : undefined,
    );
    const ins = await attempt(
      anon,
      `insert into public.expenses (user_id, name, amount) values ($1, 'x', 1)`,
      [ALICE],
    );
    check("anonymous role cannot write financial records", !ins.ok);
  });

  section("Account deletion");
  await asUser(url, BOB, async (bob) => {
    // The function takes no arguments, so a caller can only ever delete
    // themselves — there is no id to substitute.
    const signature = await bob.query<{ n: string }>(
      `select count(*)::text as n from pg_proc p
        join pg_namespace ns on ns.oid = p.pronamespace
        where ns.nspname = 'public'
          and p.proname = 'meridian_delete_account'
          and p.pronargs = 0
          and p.prosecdef`,
    );
    check(
      "delete_account is a zero-argument SECURITY DEFINER function",
      signature.rows[0].n === "1",
    );
  });

  await asUser(url, null, async (anon) => {
    const res = await attempt(anon, `select public.meridian_delete_account()`);
    check("anonymous role cannot call delete_account", !res.ok);
  });

  section("Account deletion cascades");
  const cleanup = new Client({ connectionString: url });
  await cleanup.connect();
  await cleanup.query(`delete from auth.users where id = $1`, [ALICE]);
  const leftovers = await cleanup.query<{ n: string }>(
    `select (
       (select count(*) from public.income_sources where user_id = $1) +
       (select count(*) from public.expenses where user_id = $1) +
       (select count(*) from public.assessments where user_id = $1) +
       (select count(*) from public.assessment_answers where user_id = $1) +
       (select count(*) from public.score_history where user_id = $1) +
       (select count(*) from public.action_plans where user_id = $1) +
       (select count(*) from public.profiles where id = $1)
     )::text as n`,
    [ALICE],
  );
  check("deleting the auth user removes every trace", leftovers.rows[0].n === "0");
  await cleanup.end();
  await setup.end();

  // ---- Report -------------------------------------------------------------
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length > 0) {
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\nDatabase suite crashed");
  console.error(error);
  process.exit(1);
});
