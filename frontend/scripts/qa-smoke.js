#!/usr/bin/env node
/* ============================================================
   API smoke test.

   Exercises the deployed API three ways - unauthenticated, as a
   student, and as an owner - and asserts what each should get.
   The point is not that the endpoints respond; it is that the
   ones a student must not reach return 403 rather than data.

   Usage:
     node scripts/qa-smoke.js <baseUrl> <studentToken> [ownerToken]

   Get a token from the browser while signed in:
     devtools console ->  sessionStorage.getItem("sou_token")

   A token is a live session. Do not paste one into a chat, a
   screenshot, or anywhere public, and do not commit it.
   ============================================================ */

const BASE = (process.argv[2] || "").replace(/\/$/, "");
const STUDENT = process.argv[3] || "";
const OWNER = process.argv[4] || "";

if (!BASE) {
  console.error("Usage: node scripts/qa-smoke.js <baseUrl> <studentToken> [ownerToken]");
  process.exit(1);
}

let pass = 0, fail = 0, skip = 0;
const failures = [];

function record(ok, label, detail) {
  if (ok) { pass++; console.log("  PASS  " + label); }
  else { fail++; failures.push(label + (detail ? " - " + detail : "")); console.log("  FAIL  " + label + (detail ? "  (" + detail + ")" : "")); }
}

async function call(path, { token, method = "GET", body } = {}) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (body) headers["Content-Type"] = "application/json";
  try {
    const r = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let payload = null;
    try { payload = await r.json(); } catch { /* not json */ }
    return { status: r.status, body: payload };
  } catch (e) {
    return { status: 0, body: { error: String(e && e.message || e) } };
  }
}

/** Assert the status code is one of the expected values. */
async function expectStatus(label, path, expected, opts) {
  const r = await call(path, opts);
  const list = Array.isArray(expected) ? expected : [expected];
  record(list.includes(r.status), label, "got " + r.status + (r.body && r.body.error ? ": " + r.body.error : ""));
  return r;
}

async function main() {
  console.log("\nTarget: " + BASE + "\n");

  /* ---------- 1. unauthenticated ---------- */
  console.log("1. Unauthenticated requests must not return data");
  await expectStatus("GET /api/ai/status is public by design", "/api/ai/status", 200);
  await expectStatus("GET /api/finance/me rejected", "/api/finance/me", [401, 403]);
  await expectStatus("GET /api/finance/institutional rejected", "/api/finance/institutional", [401, 403]);
  await expectStatus("GET /api/finance/status rejected", "/api/finance/status", [401, 403]);
  await expectStatus("GET /api/audit/list rejected", "/api/audit/list", [401, 403]);
  await expectStatus("GET /api/iqac/years rejected", "/api/iqac/years", [401, 403]);
  await expectStatus("GET /api/insights/overview rejected", "/api/insights/overview", [401, 403, 404]);
  await expectStatus("POST /api/finance/ask rejected", "/api/finance/ask",
    [401, 403], { method: "POST", body: { question: "how much do I owe" } });

  const bogus = await expectStatus("A forged token is rejected", "/api/finance/me",
    [401, 403], { token: "not.a.real.token" });
  if (bogus.body && bogus.body.analysis) record(false, "Forged token returned data", "SERIOUS");

  /* ---------- 2. public surface must not leak ---------- */
  console.log("\n2. The public status endpoint must not leak secrets");
  const st = await call("/api/ai/status");
  if (st.status !== 200 || !st.body) {
    // Guard against a false pass: an unreachable endpoint returns no text, and
    // "no secret found in nothing" is not evidence of anything.
    record(false, "No key, DSN or secret in /api/ai/status",
      "could not read the endpoint (status " + st.status + ") - assertion not run");
  } else {
    const text = JSON.stringify(st.body);
    record(!/AIza|sk-|postgres:\/\/|secret|password/i.test(text),
      "No key, DSN or secret in /api/ai/status", text.slice(0, 120));
  }

  /* ---------- 3. student ---------- */
  if (!STUDENT) {
    console.log("\n3. Student checks SKIPPED (no student token given)");
    skip += 6;
  } else {
    console.log("\n3. A student reaches their own data and nothing else");
    const me = await expectStatus("GET /api/finance/me allowed", "/api/finance/me", 200, { token: STUDENT });
    if (me.body && me.body.analysis) {
      const a = me.body.analysis;
      record(Number.isFinite(a.totalBilled) && Number.isFinite(a.totalOutstanding),
        "Own analysis returns finite totals", "billed=" + a.totalBilled + " outstanding=" + a.totalOutstanding);
      record(a.totalOutstanding >= 0, "Outstanding is never negative", String(a.totalOutstanding));
    } else { skip += 2; console.log("  SKIP  no fee record on this account"); }

    await expectStatus("GET /api/finance/institutional FORBIDDEN", "/api/finance/institutional", 403, { token: STUDENT });
    await expectStatus("GET /api/audit/list FORBIDDEN", "/api/audit/list", 403, { token: STUDENT });

    const status = await call("/api/finance/status", { token: STUDENT });
    record(status.body && status.body.canViewInstitutional === false,
      "status reports canViewInstitutional=false for a student",
      JSON.stringify(status.body));

    // The agent must not be given the institutional tool for this role.
    const ask = await call("/api/finance/ask", {
      token: STUDENT, method: "POST",
      body: { question: "What is the total fee collection across the whole university?" },
    });
    const used = (ask.body && ask.body.toolsUsed) || [];
    record(!used.includes("analyse_institutional_fees"),
      "Student's agent never invokes analyse_institutional_fees",
      "toolsUsed=" + JSON.stringify(used));
  }

  /* ---------- 4. owner ---------- */
  if (!OWNER) {
    console.log("\n4. Owner checks SKIPPED (no owner token given)");
    skip += 5;
  } else {
    console.log("\n4. An owner reaches the privileged views");
    const inst = await expectStatus("GET /api/finance/institutional allowed", "/api/finance/institutional", 200, { token: OWNER });
    if (inst.body && inst.body.analysis) {
      const a = inst.body.analysis;
      record(a.collectionRatePercent >= 0 && a.collectionRatePercent <= 100,
        "Collection rate is a sane percentage", String(a.collectionRatePercent));
      record(a.totalCollected <= a.totalBilled,
        "Collected never exceeds billed", a.totalCollected + " vs " + a.totalBilled);
      record(!JSON.stringify(a).match(/enrollmentNo|studentId|identityRef/),
        "Institutional view names no individual student");
    } else { skip += 3; }

    await expectStatus("GET /api/audit/list allowed", "/api/audit/list", 200, { token: OWNER });

    console.log("\n5. The audit log must be append-only");
    await expectStatus("POST /api/audit/list refused", "/api/audit/list", 405, { token: OWNER, method: "POST", body: {} });
    await expectStatus("DELETE /api/audit/list refused", "/api/audit/list", 405, { token: OWNER, method: "DELETE" });
  }

  /* ---------- summary ---------- */
  console.log("\n" + "-".repeat(60));
  console.log("PASS " + pass + "   FAIL " + fail + "   SKIP " + skip);
  if (failures.length) {
    console.log("\nFailures:");
    failures.forEach(f => console.log("  - " + f));
  }
  console.log("-".repeat(60) + "\n");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(e => { console.error("Smoke test crashed:", e); process.exit(2); });
