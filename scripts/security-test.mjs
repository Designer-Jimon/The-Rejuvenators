import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";

const port = Number(process.env.SECURITY_TEST_PORT || 3210);
const baseUrl = `http://localhost:${port}`;
const memberId = "usr_test_member";
const adminId = "usr_super_admin";
const nextCli = resolve("node_modules", "next", "dist", "bin", "next");
const wranglerCli = resolve("node_modules", "wrangler", "bin", "wrangler.js");

function wrangler(args) {
  const result = spawnSync(
    process.execPath,
    [wranglerCli, "d1", "execute", "itisfinished-db", "--local", ...args],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `wrangler failed:\n${result.stdout ?? ""}\n${result.stderr ?? ""}`,
    );
  }
}

function sql(command) {
  wrangler(["--command", command, "-y"]);
}

async function waitForServer(child) {
  const deadline = Date.now() + 420_000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js dev server exited with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(`${baseUrl}/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(300_000),
      });
      if (response.status < 500) return;
      lastError = `status ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  throw new Error(`Timed out waiting for dev server. Last error: ${lastError}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const token = randomBytes(32).toString("hex");
const sessionId = createHash("sha256").update(token).digest("hex");
const cookie = `iif_session=${token}`;
const expiresAt = Date.now() + 60 * 60 * 1000;

let child;
let passed = 0;

try {
  console.log("Preparing a local test session...");
  sql(
    `INSERT OR REPLACE INTO sessions (id, user_id, last_seen_at, expires_at, created_at) VALUES ('${sessionId}', '${memberId}', ${Date.now()}, ${expiresAt}, ${Date.now()});`,
  );

  console.log("Starting Next.js dev server...");
  child = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
    cwd: process.cwd(),
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += chunk.toString();
    if (logs.length > 20_000) logs = logs.slice(-20_000);
  });
  child.stderr.on("data", (chunk) => {
    logs += chunk.toString();
    if (logs.length > 20_000) logs = logs.slice(-20_000);
  });

  await waitForServer(child);

  async function patch(path, body, withCookie) {
    return fetch(`${baseUrl}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Origin: baseUrl,
        ...(withCookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    });
  }

  const anonymous = await patch(
    `/api/admin/members/${adminId}`,
    { action: "approve" },
    false,
  );
  assert(
    anonymous.status === 401,
    `Expected anonymous admin call to return 401, got ${anonymous.status}.`,
  );
  passed += 1;
  console.log("PASS  Anonymous admin API call is rejected with 401.");

  const forbiddenAdminAction = await patch(
    `/api/admin/members/${adminId}`,
    { action: "approve" },
    true,
  );
  assert(
    forbiddenAdminAction.status === 403,
    `Expected member admin call to return 403, got ${forbiddenAdminAction.status}.`,
  );
  passed += 1;
  console.log("PASS  Member calling an admin endpoint receives 403.");

  const departmentChange = await patch(
    "/api/member/profile",
    {
      name: "Test Member",
      phone: "+10000000000",
      departmentId: "dept_media",
    },
    true,
  );
  assert(
    departmentChange.status === 403,
    `Expected self department change to return 403, got ${departmentChange.status}.`,
  );
  passed += 1;
  console.log("PASS  Member cannot change their own department via profile API.");

  const validProfileUpdate = await patch(
    "/api/member/profile",
    {
      name: "Test Member",
      phone: "+10000000000",
      showPhone: false,
      showEmail: false,
      showLastSeen: false,
    },
    true,
  );
  assert(
    validProfileUpdate.status === 200,
    `Expected a valid profile update to return 200, got ${validProfileUpdate.status}.`,
  );
  passed += 1;
  console.log("PASS  Valid profile updates still succeed for the member.");

  const anonymousChat = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Origin: baseUrl },
  });
  assert(
    anonymousChat.status === 401,
    `Expected anonymous chat access to return 401, got ${anonymousChat.status}.`,
  );
  passed += 1;
  console.log("PASS  Anonymous chat access is rejected with 401.");

  const memberChat = await fetch(`${baseUrl}/api/chat/conversations`, {
    headers: { Origin: baseUrl, Cookie: cookie },
  });
  assert(
    memberChat.status === 200,
    `Expected authenticated chat list to return 200, got ${memberChat.status}.`,
  );
  passed += 1;
  console.log("PASS  Authenticated members can load their conversations.");

  const crossOriginChat = await fetch(`${baseUrl}/api/chat/conversations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "null",
      Cookie: cookie,
    },
    body: JSON.stringify({ userId: adminId }),
  });
  assert(
    crossOriginChat.status === 403,
    `Expected an unverifiable chat origin to return 403, got ${crossOriginChat.status}.`,
  );
  passed += 1;
  console.log("PASS  Chat creation with an unverifiable origin is blocked.");

  console.log(`\nAll ${passed} security checks passed.`);
} catch (error) {
  console.error(`\nSECURITY TEST FAILED: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  try {
    sql(`DELETE FROM sessions WHERE id = '${sessionId}';`);
  } catch {
    // Cleanup is best-effort.
  }
  if (child) {
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
      });
    } else {
      child.kill("SIGTERM");
    }
  }
}

process.exit(process.exitCode ?? 0);
