import { randomUUID } from "node:crypto";
import {
  createSupabaseClient,
  requireUser,
  getBody,
  getQuery,
  isTester,
} from "./_shared.js";
import {
  requireResourceAccess,
  matchesPublishedCohort,
} from "./_course-access.js";

async function readAll(makeQuery) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await makeQuery().range(offset, offset + 999);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < 1000) return rows;
  }
}

function learningTime(events) {
  let resourceSeconds = 0,
    practiceSeconds = 0;
  for (const event of events) {
    const seconds = Math.max(0, Number(event.duration_seconds) || 0);
    if (event.kind.startsWith("video_") || event.kind === "pdf_dwell")
      resourceSeconds += seconds;
    if (
      event.kind === "editor_change" &&
      event.metadata?.activity === "active_learning"
    )
      practiceSeconds += seconds;
  }
  return { resourceSeconds, practiceSeconds };
}

export async function resourcePractice(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const db = createSupabaseClient({ requirePrivileged: true });
  const actor = await requireUser(db, req);
  const body = getBody(req),
    query = getQuery(req);
  const resourceId = String(body.resourceId || query.resourceId || "");
  if (!resourceId || resourceId.length > 250)
    return res.status(400).json({ error: "Choose a resource" });
  const { data: resources, error } = await db
    .from("resources")
    .select("*")
    .eq("id", resourceId)
    .limit(1);
  if (error) throw error;
  const resource = resources?.[0];
  await requireResourceAccess(db, actor, resource);
  if (req.method === "GET" && (query.roster === "1" || query.studentId)) {
    if (actor.role === "student")
      return res.status(403).json({ error: "Faculty access is required" });
    const offset = Math.max(
      0,
      Math.min(1000000, parseInt(query.offset, 10) || 0),
    );
    const studentId = String(query.studentId || "");
    if (studentId) {
      const { data: people, error: personError } = await db
        .from("users")
        .select("id,name,roll_number,department,year,section,role,title")
        .eq("id", studentId)
        .limit(1);
      if (personError) throw personError;
      const person = people?.[0];
      if (!person || person.role !== "student" || isTester(person))
        return res.status(404).json({ error: "Student not found" });
      const [records, events, chats] = await Promise.all([
        db
          .from("learning_records")
          .select("*")
          .eq("kind", "resource_practice")
          .eq("title", resourceId)
          .eq("author_id", studentId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + 50),
        readAll(() =>
          db
            .from("activity_logs")
            .select("user_id,kind,duration_seconds,metadata")
            .eq("resource_id", resourceId)
            .eq("user_id", studentId)
            .order("id"),
        ),
        db
          .from("learning_records")
          .select("*")
          .eq("kind", "ai_chat")
          .eq("author_id", studentId)
          .ilike("title", `resource:${resourceId.replace(/[\\%_]/g, "\\$&")}:%`)
          .order("id", { ascending: false })
          .range(
            Math.max(0, Math.min(1000000, parseInt(query.chatOffset, 10) || 0)),
            Math.max(
              0,
              Math.min(1000000, parseInt(query.chatOffset, 10) || 0),
            ) + 20,
          ),
      ]);
      if (records.error) throw records.error;
      if (chats.error) throw chats.error;
      return res.status(200).json({
        student: person,
        records: (records.data || []).slice(0, 50),
        hasMore: (records.data || []).length > 50,
        ...learningTime(events),
        chats: (chats.data || []).slice(0, 20),
        hasMoreChats: (chats.data || []).length > 20,
      });
    }
    const [users, enrollments, cohorts, submissions] = await Promise.all([
      readAll(() =>
        db
          .from("users")
          .select(
            "id,name,roll_number,department,year,section,role,title,is_active",
          )
          .eq("role", "student")
          .order("id"),
      ),
      readAll(() =>
        db
          .from("enrollments")
          .select("user_id,status")
          .eq("course_id", resource.course_id)
          .order("id"),
      ),
      readAll(() =>
        db
          .from("course_cohorts")
          .select("*")
          .eq("course_id", resource.course_id)
          .order("id"),
      ),
      readAll(() =>
        db
          .from("learning_records")
          .select("author_id")
          .eq("kind", "resource_practice")
          .eq("title", resourceId)
          .order("id"),
      ),
    ]);
    const submitted = new Map();
    for (const row of submissions)
      submitted.set(row.author_id, (submitted.get(row.author_id) || 0) + 1);
    const enrolled = new Set(
      enrollments
        .filter((e) => ["active", "completed"].includes(e.status))
        .map((e) => e.user_id),
    );
    const search = String(query.search || "")
      .trim()
      .toLowerCase();
    const roster = users
      .filter(
        (p) =>
          !isTester(p) &&
          ((p.is_active !== false &&
            enrolled.has(p.id) &&
            cohorts.some((c) => matchesPublishedCohort(c, p))) ||
            submitted.has(p.id)),
      )
      .filter((p) =>
        `${p.name} ${p.roll_number || ""} ${p.department || ""} ${p.section || ""}`
          .toLowerCase()
          .includes(search),
      )
      .sort((a, b) =>
        `${a.roll_number || ""} ${a.name}`.localeCompare(
          `${b.roll_number || ""} ${b.name}`,
        ),
      );
    const page = roster.slice(offset, offset + 50);
    const events = page.length
      ? await readAll(() =>
          db
            .from("activity_logs")
            .select("user_id,kind,duration_seconds,metadata")
            .eq("resource_id", resourceId)
            .in(
              "user_id",
              page.map((p) => p.id),
            )
            .order("id"),
        )
      : [];
    return res.status(200).json({
      students: page.map((p) => ({
        ...p,
        submissionCount: submitted.get(p.id) || 0,
        ...learningTime(events.filter((e) => e.user_id === p.id)),
      })),
      total: roster.length,
      hasMore: offset + 50 < roster.length,
    });
  }
  if (req.method === "GET") {
    const offset = Math.max(
      0,
      Math.min(1000000, parseInt(query.offset, 10) || 0),
    );
    let request = db
      .from("learning_records")
      .select("*")
      .eq("kind", "resource_practice")
      .eq("title", resourceId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
    if (actor.role === "student") request = request.eq("author_id", actor.id);
    const { data, error: readError } = await request.range(offset, offset + 50);
    if (readError) throw readError;
    const rows = (data || []).slice(0, 50);
    let people = [];
    if (actor.role !== "student" && rows.length) {
      const result = await db
        .from("users")
        .select("id,name,roll_number,title,role")
        .in("id", [...new Set(rows.map((row) => row.author_id))]);
      if (result.error) throw result.error;
      people = result.data || [];
    }
    return res
      .status(200)
      .json({ records: rows, people, hasMore: (data || []).length > 50 });
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (actor.role !== "student")
    return res.status(403).json({ error: "Only students can submit practice" });
  const question = (resource.practice_questions || []).find(
    (q) => q.id === body.questionId,
  );
  if (!question?.requireSubmission)
    return res.status(400).json({
      error: "Faculty has not requested a submission for this question",
    });
  const code = typeof body.code === "string" ? body.code : "";
  const input = typeof body.input === "string" ? body.input : "";
  if (!code.trim() || code.length > 100000 || input.length > 10000)
    return res.status(400).json({
      error:
        "Enter code under 100,000 characters and input under 10,000 characters",
    });
  const id = `practice:${actor.id}:${resourceId}:${question.id}`;
  const { data: existing, error: existingError } = await db
    .from("learning_records")
    .select("*")
    .eq("id", id)
    .limit(1);
  if (existingError) throw existingError;
  if (existing?.length) return res.status(200).json({ record: existing[0] });
  const record = {
    id,
    kind: "resource_practice",
    author_id: actor.id,
    assignment_id: null,
    title: resourceId,
    body: code,
    status: "submitted",
    created_at: new Date().toISOString(),
    metadata: {
      resourceId,
      resourceTitle: resource.title,
      questionId: question.id,
      questionTitle: question.title,
      prompt: question.prompt,
      language: question.language,
      input,
      output: String(body.output || "").slice(0, 8000),
      runtime: String(body.runtime || "").slice(0, 30),
      evidenceSource: "student-client",
      isTester: isTester(actor),
      receipt: randomUUID(),
    },
  };
  const { data, error: saveError } = await db
    .from("learning_records")
    .insert(record)
    .select("*")
    .single();
  if (saveError?.code === "23505") {
    const retry = await db
      .from("learning_records")
      .select("*")
      .eq("id", id)
      .single();
    if (retry.error) throw retry.error;
    return res.status(200).json({ record: retry.data });
  }
  if (saveError) throw saveError;
  return res.status(201).json({ record: data });
}
