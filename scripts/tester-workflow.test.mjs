import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import login from "../api/_login.js";
import users from "../api/_users.js";
import assignments from "../api/_assignments.js";
import platform from "../api/_platform.js";
import autoGrade from "../api/_auto-grade-bulk.js";
import learning from "../api/_learning.js";
import { createSupabaseClient, hashPassword } from "../api/_shared.js";
process.env.LOCAL_API_SEED_PATH = fileURLToPath(
  new URL("../server/db.seed.json", import.meta.url),
);
process.env.AUTH_SECRET = "isolated-tester-check";
async function call(handler, method, body = {}, token = "", query = {}) {
  let status = 200,
    result;
  await handler(
    { method, body, query, headers: { authorization: "Bearer " + token } },
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
const db = createSupabaseClient({ requirePrivileged: true });
await db
  .from("course_cohorts")
  .insert({
    id: "tester-java-cohort",
    course_id: "course-java",
    target_audience: "all",
  });
await db
  .from("enrollments")
  .insert({
    id: "tester-java-enrollment",
    course_id: "course-java",
    user_id: "student-fixture",
    status: "active",
  });
for (const [id, role, title] of [
  ["tester-fixture", "student", "Platform tester"],
  ["student-fixture", "student", "Student"],
  ["faculty-fixture", "faculty", "Faculty"],
]) {
  const { error } = await db.from("users").insert({
    id,
    name: id,
    email: id + "@example.invalid",
    role,
    title,
    password_hash: hashPassword("test123"),
    is_active: true,
  });
  assert.equal(error, null);
}
const signIn = async (id) =>
  await call(login, "POST", {
    email: id + "@example.invalid",
    password: "test123",
  });
const tester = await signIn("tester-fixture"),
  student = await signIn("student-fixture"),
  faculty = await signIn("faculty-fixture");
assert.equal(tester.user.isTester, true);
assert.equal(student.user.isTester, false);
assert.equal(tester.user.password_hash, undefined);
assert.ok(
  !(await call(users, "GET", {}, faculty.token)).users.some(
    (user) => user.id === "tester-fixture",
  ),
);
assert.deepEqual(
  (await call(users, "GET", {}, faculty.token, { testers: "1" })).users.map(
    (user) => user.id,
  ),
  ["tester-fixture"],
);
assert.equal(
  (await call(users, "GET", {}, tester.token, { testers: "1" })).status,
  403,
);
assert.equal(
  (await call(assignments, "GET", {}, tester.token, { templates: "1" })).status,
  403,
);
assert.equal((await call(autoGrade, "POST", {}, tester.token)).status, 403);
await db.from("assignments").insert({
  id: "tester-assignment",
  title: "Targeted lab",
  course_code: "JAVA",
  assigned_user_ids: ["someone-else"],
  questions: [],
  test_cases: [],
});
assert.ok(
  (await call(assignments, "GET", {}, tester.token)).assignments.some(
    (a) => a.id === "tester-assignment",
  ),
);
assert.ok(
  !(await call(assignments, "GET", {}, student.token)).assignments.some(
    (a) => a.id === "tester-assignment",
  ),
);
for (const [actor, spoofed] of [
  [tester, false],
  [student, true],
]) {
  const eventId = crypto.randomUUID();
  const response = await call(
    platform,
    "POST",
    {
      entity: "activity",
      eventId,
      courseId: "course-java",
      kind: "code_run",
      metadata: {
        isTester: spoofed,
        runType: "learning-interaction",
        action: "debug_step",
      },
    },
    actor.token,
  );
  assert.equal(response.status, 201, JSON.stringify(response));
  const rows = (
    await call(platform, "GET", {}, faculty.token, {
      entity: "activity",
      detail: "1",
      userId: actor.user.id,
    })
  ).activity_logs;
  assert.equal(rows[0].metadata.isTester, actor.user.isTester);
}
console.log(
  "PASS tester login, roster separation, targeted lab access, faculty-only restrictions and server-derived telemetry identity",
);

const draftQuery = { drafts: "1" };
const draft = {
  id: "custom-preview",
  title: "Private faculty experiment",
  courseCode: "JAVA",
  brief: "Print a number",
  starterCode: "class Main {}",
  expectedOutput: "",
  unit: 1,
  isCustom: true,
};
assert.equal(
  (await call(assignments, "POST", { draft }, student.token, draftQuery))
    .status,
  403,
);
assert.equal(
  (await call(assignments, "POST", { draft }, tester.token, draftQuery)).status,
  403,
);
const saved = await call(
  assignments,
  "POST",
  { draft },
  faculty.token,
  draftQuery,
);
assert.equal(saved.status, 200);
assert.equal(
  (await call(assignments, "GET", {}, student.token, draftQuery)).status,
  403,
);
assert.equal(
  (await call(assignments, "GET", {}, tester.token, draftQuery)).drafts[0].draft
    .title,
  draft.title,
);
for (const actor of [student, tester, faculty]) {
  const ordinary = await call(learning, "GET", {}, actor.token);
  assert.ok(!ordinary.records.some((row) => row.id === saved.draft.id));
  assert.equal(
    (
      await call(
        learning,
        "PATCH",
        { id: saved.draft.id, body: "overwrite" },
        actor.token,
      )
    ).status,
    403,
  );
}
assert.equal(
  (
    await call(
      assignments,
      "POST",
      { draft: { ...draft, title: "Updated private draft" } },
      faculty.token,
      draftQuery,
    )
  ).status,
  200,
);
assert.equal(
  (await call(assignments, "GET", {}, tester.token, draftQuery)).drafts.length,
  1,
);
assert.equal(
  (
    await call(
      assignments,
      "DELETE",
      { draftId: draft.id },
      tester.token,
      draftQuery,
    )
  ).status,
  403,
);
assert.equal(
  (
    await call(
      assignments,
      "DELETE",
      { draftId: draft.id },
      faculty.token,
      draftQuery,
    )
  ).status,
  200,
);
assert.equal(
  (await call(assignments, "GET", {}, tester.token, draftQuery)).drafts.length,
  0,
);
console.log(
  "PASS private draft create/update/delete, tester read-only preview, student denial and generic API isolation",
);
await db.from("assignments").insert({
  id: "interactive-assigned",
  course_code: "JAVA",
  title: "Signal lab",
  curriculum_item_id: "java-lab-16",
  assignment_type: "lab",
  work_mode: "ide",
  due_date: "2099-12-31",
  max_marks: 10,
  assigned_user_ids: [],
});
const attempt = {
  kind: "submission",
  assignmentId: "interactive-assigned",
  title: "Signal response",
  body: "Signal logic",
  status: "submitted",
  metadata: {},
};
assert.equal(
  (
    await call(assignments, "GET", {}, student.token, {
      id: "interactive-assigned",
    })
  ).assignments[0].interactive_enabled,
  false,
);
for (const actor of [student, tester])
  assert.equal(
    (
      await call(
        assignments,
        "PATCH",
        { id: "interactive-assigned", interactiveEnabled: true },
        actor.token,
      )
    ).status,
    403,
  );
const manualDraft = await call(
  learning,
  "POST",
  { ...attempt, status: "draft" },
  student.token,
);
assert.equal(manualDraft.status, 201);
assert.equal(manualDraft.record.metadata.interactive_lab, false);
assert.equal(
  (
    await call(
      assignments,
      "PATCH",
      { id: "interactive-assigned", interactiveEnabled: true },
      faculty.token,
    )
  ).status,
  200,
);
assert.equal(
  (
    await call(assignments, "GET", {}, student.token, {
      id: "interactive-assigned",
    })
  ).assignments[0].interactive_enabled,
  true,
);
assert.equal(
  (
    await call(
      learning,
      "PATCH",
      {
        id: "interactive-release:interactive-assigned",
        metadata: { enabled: true },
      },
      student.token,
    )
  ).status,
  403,
);
assert.equal(
  (await call(learning, "POST", attempt, student.token)).status,
  400,
);
const completed = await call(
  learning,
  "POST",
  {
    ...attempt,
    metadata: {
      lab_report: "Green permits travel when clear.",
      lab_evidence: { signal_selected: { color: "green" } },
    },
  },
  student.token,
);
assert.equal(completed.status, 200);
assert.equal(completed.record.metadata.interactive_lab, true);
assert.equal(completed.record.status, "submitted");
assert.equal(
  (await call(learning, "POST", attempt, student.token)).status,
  409,
);
console.log(
  "PASS server requires interactive report/evidence and locks final submissions",
);
assert.equal(
  (
    await call(
      assignments,
      "PATCH",
      { id: "interactive-assigned", interactiveEnabled: false },
      faculty.token,
    )
  ).status,
  200,
);
assert.equal(
  (
    await call(assignments, "GET", {}, student.token, {
      id: "interactive-assigned",
    })
  ).assignments[0].interactive_enabled,
  false,
);
assert.ok(
  !(await call(learning, "GET", {}, student.token)).records.some(
    (r) => r.kind === "lab_release",
  ),
);
console.log(
  "PASS default off, faculty-only enable/disable after manual draft, persistent flag and protected release records",
);
