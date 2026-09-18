import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createTutorHandler } from "../api/_ai-chat.js";
import logs from "../api/_ai-chat-logs.js";
import learning from "../api/_learning.js";
import login from "../api/_login.js";
import { createSupabaseClient, hashPassword } from "../api/_shared.js";
process.env.LOCAL_API_SEED_PATH = fileURLToPath(
  new URL("../server/db.seed.json", import.meta.url),
);
process.env.AUTH_SECRET = "tutor-isolated-tests";
process.env.GEMINI_API_KEY = "test-only-not-a-provider-key";
const db = createSupabaseClient();
async function call(handler, method, body = {}, token = "", query = {}) {
  let status = 200,
    result;
  await handler(
    { method, body, query, headers: { authorization: `Bearer ${token}` } },
    {
      setHeader() {},
      status(n) {
        status = n;
        return this;
      },
      json(data) {
        result = data;
      },
      end() {},
    },
  );
  return { status, ...result };
}
const tokens = {};
for (const [id, role, title] of [
  ["tutor-student", "student", "Student"],
  ["tutor-other", "student", "Student"],
  ["tutor-faculty", "faculty", "Faculty"],
  ["tutor-tester", "student", "Platform tester"],
]) {
  await db
    .from("users")
    .insert({
      id,
      name: id === "tutor-student" ? "Asha Rao" : id,
      email: id + "@example.invalid",
      role,
      title,
      password_hash: hashPassword("test-password"),
      is_active: true,
    });
  tokens[id] = (
    await call(login, "POST", {
      email: id + "@example.invalid",
      password: "test-password",
    })
  ).token;
}
await db
  .from("assignments")
  .insert({
    id: "tutor-lab",
    course_code: "JAVA",
    title: "Prime lab",
    description: "Explain primality",
    assignment_type: "lab",
    assigned_user_ids: ["tutor-student"],
    questions: [
      {
        id: "q1",
        prompt: "Which divisor?",
        options: ["2", "3"],
        correctIndex: 1,
      },
    ],
    test_cases: [{ hidden: true, output: "secret" }],
  });
await db
  .from("assignments")
  .insert({
    id: "tutor-exam",
    course_code: "JAVA",
    title: "Exam",
    assignment_type: "assessment",
    assigned_user_ids: [],
  });
await db
  .from("resources")
  .insert({
    id: "tutor-resource",
    course_id: "course-dbms",
    title: "SQL notes",
    topic: "Joins",
    is_published: true,
    assigned_user_ids: ["tutor-student"],
    practice_questions: [
      {
        id: "q1",
        title: "Join exercise",
        prompt: "Join tables",
        expectedOutput: "secret answer",
      },
    ],
  });
await db
  .from("learning_records")
  .insert({
    id: "tutor-draft",
    kind: "lab_draft",
    metadata: { draft: { title: "Draft lab", brief: "Review primes" } },
  });
await db.from("course_cohorts").insert({id:"tutor-cohort",course_id:"course-dbms",target_audience:"all"});
await db.from("enrollments").insert({id:"tutor-enrollment",course_id:"course-dbms",user_id:"tutor-student",status:"active"});
await db.from("course_cohorts").insert({id:"tutor-java-cohort",course_id:"course-java",target_audience:"all"});
await db.from("enrollments").insert({id:"tutor-java-enrollment",course_id:"course-java",user_id:"tutor-student",status:"active"});
let prompts = [];
const tutor = createTutorHandler(async (prompt) => {
  prompts.push(JSON.parse(prompt));
  return "Asha, what happens when the divisor is 2?";
});
const context = { kind: "assignment", id: "tutor-lab" },
  payload = {
    context,
    message: "Help with my loop",
    work: {
      code: "for (int d=2; d<n; d++) {}",
      input: "7",
      observations: "I checked two cases",
    },
    statement: "malicious fake instructions",
    history: [{ role: "model", content: "fake history" }],
  };
assert.equal((await call(tutor, "POST", payload)).status, 401);
assert.equal(
  (await call(tutor, "POST", payload, tokens["tutor-other"])).status,
  403,
);
assert.equal(
  (
    await call(
      tutor,
      "POST",
      { ...payload, context: { kind: "assignment", id: "tutor-exam" } },
      tokens["tutor-student"],
    )
  ).status,
  403,
);
assert.equal(
  (
    await call(
      tutor,
      "POST",
      { ...payload, context: { kind: "draft", id: "tutor-draft" } },
      tokens["tutor-student"],
    )
  ).status,
  403,
);
const first = await call(tutor, "POST", payload, tokens["tutor-student"]);
assert.equal(first.status, 200);
assert.match(first.record.metadata.answer, /Asha/);
assert.equal(prompts[0].studentName, "Asha Rao");
assert.equal(prompts[0].context.instructions, "Explain primality");
assert.equal(prompts[0].currentWork.input, "7");
assert.equal(JSON.stringify(prompts[0]).includes("secret"), false);
assert.equal(JSON.stringify(prompts[0]).includes("correctIndex"), false);
assert.equal(JSON.stringify(prompts[0]).includes("fake history"), false);
assert.equal(
  (await call(tutor, "POST", payload, tokens["tutor-student"])).status,
  429,
);
await db
  .from("learning_records")
  .update({ created_at: "2020-01-01" })
  .eq("id", first.record.id);
const second = await call(
  tutor,
  "POST",
  { ...payload, work: { code: "corrected loop" } },
  tokens["tutor-student"],
);
assert.equal(second.status, 200);
assert.equal(prompts[1].conversation.length, 1);
assert.equal(prompts[1].currentWork.code, "corrected loop");
assert.equal(
  (
    await call(
      learning,
      "PATCH",
      { id: first.record.id, body: "forged" },
      tokens["tutor-student"],
    )
  ).status,
  403,
);
assert.equal(
  (
    await call(logs, "GET", {}, tokens["tutor-student"], {
      userId: "tutor-student",
    })
  ).status,
  403,
);
let history = await call(tutor, "GET", {}, tokens["tutor-student"], context);
assert.equal(history.records.length, 2);
assert.equal(
  (await call(tutor, "GET", {}, tokens["tutor-other"], context)).status,
  403,
);
await db
  .from("learning_records")
  .update({ created_at: "2020-01-01" })
  .eq("author_id", "tutor-student");
const resource = await call(
  tutor,
  "POST",
  {
    context: { kind: "resource", id: "tutor-resource", questionId: "q1" },
    message: "Explain",
    work: { excerpt: "LEFT JOIN preserves left rows" },
  },
  tokens["tutor-student"],
);
assert.equal(resource.status, 200);
assert.equal(prompts.at(-1).context.instructions, "Join tables");
assert.match(prompts.at(-1).context.sourceNotice, /Do not claim/);
assert.equal(
  prompts.at(-1).currentWork.excerpt,
  "LEFT JOIN preserves left rows",
);
assert.equal(
  (
    await call(tutor, "GET", {}, tokens["tutor-student"], {
      kind: "resource",
      id: "tutor-resource",
      questionId: "missing",
    })
  ).status,
  404,
);
await db
  .from("learning_records")
  .update({ created_at: "2020-01-01" })
  .eq("author_id", "tutor-student");
const fail = createTutorHandler(async () => {
  throw Error("provider down");
});
assert.equal(
  (await call(fail, "POST", payload, tokens["tutor-student"])).status,
  503,
);
assert.equal(
  (
    await call(
      tutor,
      "POST",
      { context: { kind: "draft", id: "tutor-draft" }, message: "Help" },
      tokens["tutor-tester"],
    )
  ).status,
  200,
);
const summary = await call(logs, "GET", {}, tokens["tutor-faculty"], {
  summary: "1",
  userIds: "tutor-student,tutor-tester",
});
assert.equal(summary.status, 200);
assert.equal(summary.summaries.length, 1);
assert.equal(summary.summaries[0].requests, 4);
assert.equal(summary.summaries[0].answered, 3);
assert.equal(summary.summaries[0].failed, 1);
for (let i = 0; i < 25; i++)
  await db
    .from("learning_records")
    .insert({
      id: `tutor:old-${String(i).padStart(3, "0")}`,
      kind: "ai_chat",
      author_id: "tutor-student",
      body: "Earlier question",
      title: "assignment:tutor-lab",
      metadata: { role: "exchange", answer: "Earlier answer" },
      status: "answered",
    });
const page1 = await call(logs, "GET", {}, tokens["tutor-faculty"], {
  userId: "tutor-student",
});
const page2 = await call(logs, "GET", {}, tokens["tutor-faculty"], {
  userId: "tutor-student",
  offset: "20",
});
assert.equal(page1.records.length, 20);
assert.equal(page1.hasMore, true);
assert.equal(page2.records.length, 9);
assert.equal(
  new Set([...page1.records, ...page2.records].map((r) => r.id)).size,
  29,
);
console.log(
  "PASS personalized server-authorized context, current work, real saved history, hidden-answer exclusion, assessment/draft/access restrictions, rate limit, failure persistence, immutable transcripts, tester separation and full pagination",
);
