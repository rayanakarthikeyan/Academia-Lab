import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, readFile, rmdir, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Run the built frontend against real HTTP handlers and disposable local data.
// Never load .env.local or connect these fixtures to the hosted database.
for (const key of Object.keys(process.env)) {
  if (key.includes("SUPABASE")) delete process.env[key];
}
const directory = await mkdtemp(join(tmpdir(), "cognixplore-fullstack-"));
process.env.LOCAL_API_SEED_PATH = join(directory, "seed.json");
process.env.AUTH_SECRET = randomBytes(32).toString("hex");
const { hashPassword, createSessionToken } = await import("../api/_shared.js");
const { default: router } = await import("../api/index.js");
const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE || "playwright"
);
const password = randomBytes(18).toString("hex");
const passwordHash = hashPassword(password);
const faculty = {
  id: "readiness-faculty",
  name: "Readiness Faculty",
  email: "faculty@example.invalid",
  role: "faculty",
  is_active: true,
  password_hash: passwordHash,
};
const students = Array.from({ length: 500 }, (_, index) => ({
  id: `load-student-${index}`,
  name: `Load Student ${index}`,
  email: `student-${index}@example.invalid`,
  roll_number: `LOAD${String(index).padStart(4, "0")}`,
  role: "student",
  department: "CSE",
  year: "2",
  section: "A",
  is_active: true,
  password_hash: passwordHash,
}));
const seed = JSON.parse(
  await readFile(new URL("../server/db.seed.json", import.meta.url), "utf8"),
);
seed.users = [faculty, ...students];
seed.course_cohorts = ["course-java", "course-dbms"].map((course_id) => ({
  id: `cohort-${course_id}`,
  course_id,
  target_audience: "cohort",
  department: "CSE",
  academic_year: "2",
  sections: ["A"],
}));
seed.enrollments = students.flatMap((student) =>
  ["course-java", "course-dbms"].map((course_id) => ({
    id: `${student.id}-${course_id}`,
    user_id: student.id,
    course_id,
    status: "active",
    tracks: ["theory", "lab"],
  })),
);
await writeFile(process.env.LOCAL_API_SEED_PATH, JSON.stringify(seed));
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".wasm": "application/wasm",
  ".json": "application/json",
  ".ttf": "font/ttf",
};
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      request.body = chunks.length
        ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
        : {};
      request.query = Object.fromEntries(url.searchParams);
      await router(request, {
        setHeader: (name, value) => response.setHeader(name, value),
        status(code) {
          response.statusCode = code;
          return this;
        },
        json(value) {
          response.setHeader("Content-Type", "application/json");
          response.end(JSON.stringify(value));
        },
        end: () => response.end(),
      });
      return;
    }
    const path = resolve(dist, "." + decodeURIComponent(url.pathname));
    assert.ok(path.startsWith(resolve(dist) + sep) || path === resolve(dist));
    const file = extname(path) ? path : join(dist, "index.html");
    response.setHeader(
      "Content-Type",
      types[extname(file)] || "application/octet-stream",
    );
    response.end(await readFile(file));
  } catch (error) {
    response.statusCode = 500;
    response.end(JSON.stringify({ error: error.message }));
  }
});
let browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  const failures = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(base + "/api/") && response.status() >= 500)
      failures.push(`${response.status()} ${new URL(response.url()).pathname}`);
  });
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(base + "/")
      ? route.continue()
      : route.abort(),
  );
  await page.goto(base);
  await page.getByLabel("Email address").fill(faculty.email);
  await page.locator('input[type="password"]').fill("incorrect-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText("Invalid email or password", { exact: true }).waitFor();
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).waitFor();
  await page
    .getByRole("button", { name: "Enrollment management", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Enrollment management", exact: true })
    .waitFor();
  await page.getByTitle("Sign out", { exact: true }).click();
  await page
    .getByRole("button", { name: "Create an account", exact: true })
    .click();
  await page.getByLabel("Full name").fill("Readiness Student");
  await page.getByLabel("Roll number").fill("READINESS001");
  await page
    .getByLabel("Email address")
    .fill("readiness-student@example.invalid");
  await page.getByLabel("Contact number").fill("9876543210");
  await page.getByRole("combobox", { name: /^Department/ }).selectOption("CSE");
  await page.getByRole("combobox", { name: /^Year/ }).selectOption("2");
  await page.getByRole("combobox", { name: /^Section/ }).selectOption("A");
  await page.locator('input[type="password"]').fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByRole("navigation", { name: "Primary navigation" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Enrollment management", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "Lab (21 Exp)", exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Lab (21 Exp)", exact: true })
    .waitFor();
  await page.getByTitle("Sign out", { exact: true }).click();
  await page
    .getByLabel("Email address")
    .fill("readiness-student@example.invalid");
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("button", { name: "Lab (21 Exp)", exact: true })
    .waitFor();
  const studentToken = await page.evaluate(
    () => JSON.parse(localStorage.getItem("academia-session-v2")).token,
  );
  assert.equal(
    (
      await fetch(base + "/api/users", {
        headers: { authorization: `Bearer ${studentToken}` },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/login", {
        headers: { authorization: `Bearer ${studentToken}invalid` },
      })
    ).status,
    401,
  );
  assert.equal((await fetch(base + "/api/assignments")).status, 401);
  await page.getByTitle("Sign out", { exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Sign in", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  console.log(
    "PASS built app: faculty/student sign-in, invalid password, registration, role-specific navigation, session restoration, sign-out and unauthorized API denial; no mocked API responses",
  );

  const paths = [
    "/api/login",
    "/api/platform?entity=enrollment",
    "/api/assignments",
    "/api/platform?entity=resource",
  ];
  const jobs = students.flatMap((student) =>
    paths.map((path) => ({ student, path })),
  );
  const durations = [];
  let next = 0;
  const started = performance.now();
  await Promise.all(
    Array.from({ length: 25 }, async () => {
      while (next < jobs.length) {
        const { student, path } = jobs[next++];
        const at = performance.now();
        const response = await fetch(base + path, {
          headers: { authorization: `Bearer ${createSessionToken(student)}` },
          signal: AbortSignal.timeout(10000),
        });
        assert.equal(response.status, 200, path);
        const data = await response.json();
        if (path === "/api/login") {
          assert.equal(data.user.id, student.id);
          assert.equal(data.user.password_hash, undefined);
        }
        if (path.includes("entity=enrollment")) {
          assert.equal(data.enrollments.length, 2);
          assert.ok(
            data.enrollments.every((row) => row.user_id === student.id),
          );
        }
        durations.push(performance.now() - at);
      }
    }),
  );
  durations.sort((a, b) => a - b);
  const report = {
    users: students.length,
    requests: jobs.length,
    concurrency: 25,
    elapsedMs: Math.round(performance.now() - started),
    p95Ms: Math.round(durations[Math.ceil(durations.length * 0.95) - 1]),
    maxMs: Math.round(durations.at(-1)),
    errors: 0,
    scope:
      "local HTTP handlers and in-memory data; not hosted Supabase/Vercel capacity",
  };
  console.log("PASS local authenticated read load", JSON.stringify(report));
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  await unlink(process.env.LOCAL_API_SEED_PATH);
  await rmdir(directory);
}
