import { randomUUID } from "node:crypto";
import {
  createSupabaseClient,
  requireUser,
  getBody,
  getQuery,
  isTester,
} from "./_shared.js";
import { requireResourceAccess } from "./_course-access.js";

export async function resourcePractice(req, res) {
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
    return res
      .status(400)
      .json({
        error: "Faculty has not requested a submission for this question",
      });
  const code = typeof body.code === "string" ? body.code : "";
  const input = typeof body.input === "string" ? body.input : "";
  if (!code.trim() || code.length > 100000 || input.length > 10000)
    return res
      .status(400)
      .json({
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
