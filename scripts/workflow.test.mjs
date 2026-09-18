import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import register from "../api/_register.js";
import login from "../api/_login.js";
import assignments from "../api/_assignments.js";
import users from "../api/_users.js";
import platform from "../api/_platform.js";
import learning from "../api/_learning.js";
import runner from "../api/_code-runner.js";
import { activityTemplates } from "../server/curriculum-templates.js";
import { createSupabaseClient, hashPassword } from "../api/_shared.js";
process.env.LOCAL_API_SEED_PATH = fileURLToPath(new URL("../server/db.seed.json", import.meta.url));
process.env.AUTH_SECRET = "local-test-secret";
delete process.env.CODE_RUNNER_URL;

async function call(handler, method = "GET", body = {}, token = "", query = {}) {
  let status = 200, result;
  await handler({ method, body, query, headers: { authorization: token ? "Bearer " + token : "" } }, {
    setHeader() {}, status(value) { status = value; return this; }, json(value) { result = value; }, end() {},
  });
  return { status, ...result };
}
const profile = { name: "Test Student", email: "test-profile@example.invalid", rollNumber: "TEST2026001", contactNumber: "9876543210", department: "CSE", year: "2", section: "A", password: "Test-only-password-123" };

test("catalog has all syllabus labs and editable examples for every theory unit", () => {
  assert.equal(Object.keys(activityTemplates).length, 41);
  for (const [key, template] of Object.entries(activityTemplates)) {
    assert.ok(template.task.length > 40, key);
    assert.ok(template.output.length > 0, key);
    assert.ok(template.hints.length > 0, key);
    if (key.includes("theory")) {
      assert.equal(template.questions.length, 2);
      for (const q of template.questions) assert.ok(q.options[q.correctIndex]);
    }
  }
});

test("registration, publication gate, editing, filtering and grading", async () => {
  assert.equal((await call(login, "POST", { email: "random@example.invalid", password: "randompass" })).status, 401);
  for (const invalid of [{ department: "ECE" }, { section: "Z" }, { contactNumber: "123" }, { name: "" }]) {
    assert.equal((await call(register, "POST", { ...profile, ...invalid })).status, 400);
  }
  const student = await call(register, "POST", profile);
  assert.equal(student.status, 201);
  assert.equal(student.user.department, "CSE");
  assert.equal(student.user.section, "A");
  assert.equal(student.user.contact_number, "9876543210");
  assert.equal(student.user.college, "Experivio");
  assert.equal(student.user.password_hash, undefined);
  assert.equal((await call(register, "POST", profile)).status, 409);
  await createSupabaseClient().from("course_cohorts").insert(["course-java","course-dbms"].map(course_id=>({id:`cohort-${course_id}`,course_id,target_audience:"cohort",department:"CSE",academic_year:"2",sections:["A"]})));
  const enrolled = await call(platform, "GET", {}, student.token, { entity: "enrollment" });
  assert.deepEqual(enrolled.enrollments.map(e => e.course_id).sort(), ["course-dbms", "course-java"]);
  assert.ok(enrolled.enrollments.every(e => e.tracks.includes("theory") && e.tracks.includes("lab")));
  assert.equal((await call(assignments, "GET", {}, student.token, { templates: "1" })).status, 403);
  assert.equal((await call(assignments, "GET", {}, student.token)).assignments.length, 0);
  assert.equal((await call(users, "GET", {}, student.token)).status, 403);

  const facultyCredentials = { email: "faculty-test@example.invalid", password: "Test-only-faculty-123" };
  const { error: facultyError } = await createSupabaseClient({ requirePrivileged: true }).from("users").insert({
    id: "faculty-test", name: "Test Faculty", email: facultyCredentials.email,
    password_hash: hashPassword(facultyCredentials.password), role: "faculty", is_active: true,
  });
  assert.equal(facultyError, null);
  const faculty = await call(login, "POST", facultyCredentials);
  assert.equal(faculty.status, 200);
  assert.equal(Object.keys((await call(assignments, "GET", {}, faculty.token, { templates: "1" })).templates).length, 41);
  const cohort = await call(users, "GET", {}, faculty.token, { department: "CSE", section: "A" });
  assert.equal(cohort.users.length, 1);
  assert.equal((await call(users, "GET", {}, faculty.token, { department: "CSM" })).users.length, 0);
  const outsider = await call(register, "POST", { ...profile, email: "second@example.invalid", rollNumber: "TEST2026002", department: "CSM", section: "B" });
  const questions = activityTemplates["java-theory-1"].questions;
  const payload = { title: "Java practice", subjectId: "sub-java-cse-a", dueDate: "2099-12-31", maxMarks: 99, description: "Practice task", workMode: "mcq", questions, assignedUserIds: [student.user.id], assignmentType: "practice", courseCode: "JAVA", unitNumber: 1, curriculumItemId: "java-theory-1", assigned: 1, hints: ["Try reasoning first"] };
  assert.equal((await call(assignments, "POST", payload, student.token)).status, 403);
  assert.equal((await call(assignments, "POST", { ...payload, dueDate: "invalid" }, faculty.token)).status, 400);
  assert.equal((await call(assignments, "POST", { ...payload, questions: [{ ...questions[0], correctIndex: 9 }] }, faculty.token)).status, 400);
  const created = await call(assignments, "POST", payload, faculty.token);
  assert.equal(created.status, 201, JSON.stringify(created));
  assert.equal(created.assignment.max_marks, 2);
  const id = created.assignment.id;
  assert.equal((await call(assignments, "PATCH", { id, title: "Edited Java practice" }, faculty.token)).status, 200);
  assert.equal((await call(assignments, "GET", {}, outsider.token)).assignments.length, 0);
  const published = (await call(assignments, "GET", {}, student.token)).assignments[0];
  assert.equal(published.questions[0].correctIndex, undefined);
  assert.equal(published.title, "Edited Java practice");
  const answers = { [questions[0].id]: null, [questions[1].id]: questions[1].correctIndex };
  const submitted = await call(learning, "POST", { kind: "submission", assignmentId: id, subjectId: payload.subjectId, title: "Answers", body: JSON.stringify(answers), status: "submitted", score: 999, metadata: { answers, hints_used: [0] } }, student.token);
  assert.equal(submitted.status, 201, JSON.stringify(submitted));
  assert.equal(submitted.record.score, 1);
  assert.equal((await call(learning, "PATCH", { id: submitted.record.id, score: 999 }, student.token)).status, 403);
  assert.equal((await call(assignments, "PATCH", { id, title: "Changed after attempt" }, faculty.token)).status, 409);
  const lab = activityTemplates["java-lab-1"];
  const labWork = await call(assignments, "POST", { ...payload, title: "Prime lab", workMode: "ide", questions: [], assignmentType: "lab", testCases: [{ input: lab.input, output: lab.output }], hints: lab.hints }, faculty.token);
  assert.equal(labWork.status, 201);
  const labSubmission = await call(learning, "POST", { kind: "submission", assignmentId: labWork.assignment.id, title: "Prime solution", body: lab.starterCode, status: "submitted", score: 100 }, student.token);
  assert.equal(labSubmission.record.score, null);
  assert.equal((await call(runner, "POST", { language: "java", code: lab.starterCode }, student.token)).status, 503);
  assert.equal((await call(assignments, "POST", { ...payload, subjectId: "sub-dbms-cse-a" }, faculty.token)).status, 400);
  assert.equal((await call(assignments, "POST", { ...payload, dueDate: "2099-02-31" }, faculty.token)).status, 400);
  const visual = await call(assignments, "POST", { ...payload, assignmentType: "lab", curriculumItemId: "visual-test", workMode: "ide", executionEnvironment: "visual", assignedUserIds: [], testCases: [{ input: "", output: "Canvas changes on click", hidden: false }, { input: "private", output: "secret", hidden: true }] }, faculty.token);
  assert.equal(visual.status, 201);
  const visibleVisual = (await call(assignments, "GET", {}, outsider.token)).assignments.find(a => a.id === visual.assignment.id);
  assert.equal(visibleVisual.execution_environment, "visual");
  assert.equal(visibleVisual.test_cases.length, 1);
  assert.equal((await call(learning, "POST", { kind: "submission", assignmentId: labWork.assignment.id, title: "Unauthorized", body: "code", status: "draft" }, outsider.token)).status, 403);
  const practiceQuestions = ["java", "visual"].map(language => ({ id: language, language, title: `${language} practice`, prompt: "Solve the module task", starterCode: "", input: "4", expectedOutput: "Expected observations" }));
  const resourcePayload = { courseId: "course-java", courseCode: "JAVA", title: "Study and practice", type: "pdf", externalUrl: "https://example.com/lesson.pdf", durationMinutes: 10, assignedUserIds: [student.user.id], practiceQuestions };
  assert.equal((await call(platform, "POST", resourcePayload, student.token, { entity: "resource" })).status, 403);
  assert.equal((await call(platform, "POST", { ...resourcePayload, practiceQuestions: [{ ...practiceQuestions[0], language: "bad" }] }, faculty.token, { entity: "resource" })).status, 400);
  const resource = await call(platform, "POST", resourcePayload, faculty.token, { entity: "resource" });
  assert.equal(resource.status, 201, JSON.stringify(resource));
  assert.equal((await call(platform, "GET", {}, outsider.token, { entity: "resource" })).resources.length, 0);
  assert.deepEqual((await call(platform, "GET", {}, student.token, { entity: "resource" })).resources[0].practice_questions, practiceQuestions);
  const revised = await call(platform, "PATCH", { id: resource.resource.id, practiceQuestions: [practiceQuestions[1]] }, faculty.token, { entity: "resource" });
  assert.equal(revised.status, 200);
  assert.equal(revised.resource.practice_questions[0].language, "visual");
  const event = { eventId: "00000000-0000-4000-8000-000000000001", userId: outsider.user.id, assignmentId: labWork.assignment.id, kind: "code_run", metadata: { status: "passed" } };
  const logged = await call(platform, "POST", event, student.token, { entity: "activity" });
  assert.equal(logged.status, 201, JSON.stringify(logged));
  assert.equal(logged.activity.user_id, student.user.id);
  assert.equal((await call(platform, "POST", event, student.token, { entity: "activity" })).duplicate, true);
  assert.equal((await call(platform, "POST", { ...event, eventId: "00000000-0000-4000-8000-000000000002" }, outsider.token, { entity: "activity" })).status, 403);
  const history = await call(platform, "GET", {}, faculty.token, { entity: "activity", detail: "1", userId: student.user.id });
  assert.equal(history.activity_logs.filter(row => row.id === logged.activity.id).length, 1);
  assert.ok(history.activity_logs.every(row => row.user_id === student.user.id));
  assert.equal((await call(platform, "GET", {}, outsider.token, { entity: "activity", detail: "1", userId: student.user.id })).status, 403);
  const db = createSupabaseClient();
  for (let i = 0; i < 105; i++) {
    await db.from("activity_logs").insert({id:`pagination-${i}`,user_id:student.user.id,kind:"editor_change",metadata:{changes:1},occurred_at:new Date(Date.now()+i*1000).toISOString()});
  }
  const first = await call(platform, "GET", {}, faculty.token, {entity:"activity",detail:"1",userId:student.user.id});
  const second = await call(platform, "GET", {}, faculty.token, {entity:"activity",detail:"1",userId:student.user.id,offset:"100"});
  assert.equal(first.activity_logs.length,100); assert.equal(first.hasMore,true);
  assert.equal(second.hasMore,false); assert.ok(second.activity_logs.length >= 6);
  assert.ok(second.activity_logs.every(row => !first.activity_logs.some(other => other.id === row.id)));
});
