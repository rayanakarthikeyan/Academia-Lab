import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
for (const key of Object.keys(process.env))
  if (key.includes("SUPABASE")) delete process.env[key];
await mkdir("tmp", { recursive: true });
await writeFile("tmp/resource-test-seed.json", "{}");
process.env.LOCAL_API_SEED_PATH = resolve("tmp/resource-test-seed.json");
process.env.AUTH_SECRET = "resource-test-only";
const { createSupabaseClient, createSessionToken } =
  await import("../api/_shared.js");
const { default: platform } = await import("../api/_platform.js");
const { default: register } = await import("../api/_register.js");
const { default: learning } = await import("../api/_learning.js");
const { tutorContext } = await import("../api/_tutor-context.js");
const db = createSupabaseClient();
const faculty = {
  id: "resource-faculty",
  role: "faculty",
  name: "Faculty",
  is_active: true,
};
await db.from("users").insert(faculty);
const ft = createSessionToken(faculty);
async function call(handler, method, body = {}, token = ft, query = {}) {
  let status = 200,
    data;
  await handler(
    { method, body, query, headers: { authorization: `Bearer ${token}` } },
    {
      setHeader() {},
      status(v) {
        status = v;
        return this;
      },
      json(v) {
        data = v;
      },
      end() {},
    },
  );
  return { status, ...data };
}
const resourceCall = (method, body, token = ft) =>
  call(platform, method, body, token, { entity: "resource" });
const question = {
  id: "sql-q",
  language: "sql",
  title: "Add two numbers",
  prompt: "Read your chosen values and add them with SQL",
  starterCode: "SELECT 2+3;",
  requireSubmission: true,
};
let resource = await resourceCall("POST", {
  courseId: "course-dbms",
  courseCode: "DBMS",
  title: "Module",
  type: "pdf",
  isPublished: false,
  practiceQuestions: [{ ...question, title: "", prompt: "" }],
});
assert.equal(resource.status, 201, JSON.stringify(resource));
const id = resource.resource.id;
assert.equal(
  (await resourceCall("PATCH", { id, isPublished: true })).status,
  400,
);
resource = await resourceCall("PATCH", {
  id,
  externalUrl: "https://example.invalid/study.pdf",
  practiceQuestions: [question],
  isPublished: true,
});
assert.equal(resource.status, 200);
assert.equal(resource.resource.practice_questions[0].input, "");
assert.equal(resource.resource.practice_questions[0].expectedOutput, "");
assert.equal(
  (
    await resourceCall("PATCH", {
      id,
      practiceQuestions: [{ ...question, language: "java" }],
    })
  ).status,
  400,
);
await call(
  platform,
  "POST",
  {
    courseId: "course-dbms",
    target: {
      audience: "cohort",
      department: "CSE",
      year: "2",
      sections: ["A", "B"],
    },
  },
  ft,
  { entity: "course-publish" },
);
const signup = async (name, section, year = "2") =>
  call(
    register,
    "POST",
    {
      name,
      email: `${name}@example.invalid`,
      rollNumber: `ROLL-${name}`,
      contactNumber: "9876543210",
      department: "CSE",
      year,
      section,
      password: "TestOnly123",
    },
    "",
  );
const a = await signup("StudentA", "A"),
  b = await signup("StudentB", "B"),
  c = await signup("StudentC", "C"),
  wrongYear = await signup("StudentYear", "A", "1");
for (const student of [a, b, c, wrongYear])
  assert.equal(student.status, 201, JSON.stringify(student));
const list = (token) => resourceCall("GET", {}, token);
assert.equal((await list(a.token)).resources.length, 1);
assert.equal((await list(b.token)).resources.length, 1);
assert.equal((await list(c.token)).resources.length, 0);
assert.equal((await list(wrongYear.token)).resources.length, 0);
const events = {
  resourceId: id,
  kind: "code_run",
  metadata: { status: "passed" },
};
assert.equal(
  (await call(platform, "POST", events, c.token, { entity: "activity" }))
    .status,
  403,
);
await assert.rejects(
  () => tutorContext(db, c.user, { kind: "resource", id }),
  /not available/,
);
await db
  .from("enrollments")
  .delete()
  .eq("user_id", b.user.id)
  .eq("course_id", "course-dbms");
assert.equal((await list(b.token)).resources.length, 0);
assert.equal(
  (
    await call(platform, "POST", { courseId: "course-dbms" }, b.token, {
      entity: "enrollment",
    })
  ).status,
  201,
);
assert.equal((await list(b.token)).resources.length, 1);
assert.equal(
  (
    await call(platform, "POST", { courseId: "course-dbms" }, c.token, {
      entity: "enrollment",
    })
  ).status,
  403,
);
const practice = (method, body, token = a.token, query = {}) =>
  call(platform, method, body, token, {
    entity: "resource-practice",
    resourceId: id,
    ...query,
  });
const work = {
  resourceId: id,
  questionId: "sql-q",
  code: "SELECT 4+9;",
  input: "4 9",
  output: "13",
  runtime: "sqlite",
};
assert.equal((await practice("POST", work, c.token)).status, 403);
const submitted = await practice("POST", work);
assert.equal(submitted.status, 201, JSON.stringify(submitted));
assert.equal(
  (await practice("POST", { ...work, code: "changed" })).record.body,
  work.code,
);
assert.equal((await practice("GET", {}, b.token)).records.length, 0);
const review = await practice("GET", {}, ft);
assert.equal(review.records.length, 1);
assert.equal(review.people[0].id, a.user.id);
assert.equal(review.records[0].metadata.input, "4 9");
assert.equal(
  (
    await call(
      learning,
      "PATCH",
      { id: submitted.record.id, body: "tampered" },
      a.token,
    )
  ).status,
  403,
);
assert.equal(
  (
    await resourceCall("PATCH", {
      id,
      practiceQuestions: [{ ...question, prompt: "Changed task" }],
    })
  ).status,
  409,
);
assert.equal(
  (await resourceCall("PATCH", { id, isPublished: false })).status,
  200,
);
assert.equal((await list(a.token)).resources.length, 0);
assert.equal((await practice("POST", work)).status, 403);
assert.equal(
  (await call(platform, "POST", events, a.token, { entity: "activity" }))
    .status,
  403,
);
await assert.rejects(
  () => tutorContext(db, a.user, { kind: "resource", id }),
  /not published/,
);
assert.equal((await practice("GET", {}, ft)).records.length, 1);
assert.equal(
  (await resourceCall("PATCH", { id, isPublished: true })).status,
  200,
);
assert.equal((await list(a.token)).resources.length, 1);
console.log(
  "PASS drafts, publication without students, optional samples, course languages, late signup/enrollment, department/year/section gates, API/tutor/telemetry denial, submission privacy, idempotency, faculty review and unpublish retention",
);
