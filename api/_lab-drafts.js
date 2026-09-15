import { cleanText, getBody, getQuery, isTester } from "./_shared.js";

// Reserved learning-record kind; never part of published assignments or grading.
export async function labDrafts(req, res, db, actor) {
  res.setHeader("Cache-Control", "private, no-store");
  const faculty = ["faculty", "admin"].includes(actor.role);
  if (!faculty && !isTester(actor))
    return res
      .status(403)
      .json({
        error: "Draft previews are available only to faculty and testers",
      });
  if (req.method === "GET") {
    let query = db
      .from("learning_records")
      .select("*")
      .eq("kind", "lab_draft")
      .order("updated_at", { ascending: false });
    if (actor.role === "faculty") query = query.eq("author_id", actor.id);
    const { data, error } = await query;
    if (error) throw error;
    return res
      .status(200)
      .json({
        drafts: (data || []).map((row) => ({
          id: row.id,
          faculty_id: row.author_id,
          draft: row.metadata.draft,
          updated_at: row.updated_at,
        })),
      });
  }
  if (!faculty)
    return res.status(403).json({ error: "Only faculty can change drafts" });
  const body = getBody(req);
  const draft = body.draft;
  const key = cleanText(draft?.id || body.draftId || getQuery(req).draftId);
  if (!/^[a-zA-Z0-9_-]{1,120}$/.test(key))
    return res.status(400).json({ error: "Invalid draft identifier" });
  const id = `faculty-draft:${actor.id}:${key}`;
  if (req.method === "DELETE") {
    const { error } = await db
      .from("learning_records")
      .delete()
      .eq("id", id)
      .eq("author_id", actor.id)
      .eq("kind", "lab_draft");
    if (error) throw error;
    return res.status(200).json({ ok: true });
  }
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  if (
    !draft ||
    typeof draft !== "object" ||
    !cleanText(draft.title) ||
    !["JAVA", "DBMS"].includes(draft.courseCode) ||
    JSON.stringify(draft).length > 150000
  )
    return res
      .status(400)
      .json({
        error: "Provide a title, course and a draft smaller than 150 KB",
      });
  const normalized = {
    id: key,
    title: cleanText(draft.title).slice(0, 200),
    courseCode: draft.courseCode,
    label: cleanText(draft.label).slice(0, 100),
    brief: cleanText(draft.brief).slice(0, 20000),
    starterCode: String(draft.starterCode || "").slice(0, 100000),
    expectedOutput: cleanText(draft.expectedOutput).slice(0, 10000),
    suggestedMarks: Math.max(
      0,
      Math.min(1000, Number(draft.suggestedMarks) || 10),
    ),
    outcomes: Array.isArray(draft.outcomes)
      ? draft.outcomes.map(cleanText).slice(0, 20)
      : [],
    unit: Math.max(1, Math.min(5, Number(draft.unit) || 1)),
    isCustom: draft.isCustom === true,
    environment: ["external", "visual"].includes(draft.environment)
      ? draft.environment
      : "runner",
  };
  const { data: existing, error: readError } = await db
    .from("learning_records")
    .select("id")
    .eq("id", id)
    .limit(1);
  if (readError) throw readError;
  const payload = {
    kind: "lab_draft",
    author_id: actor.id,
    title: normalized.title,
    body: "Faculty experiment draft",
    status: "draft",
    metadata: { draft: normalized },
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await (
    existing?.length
      ? db
          .from("learning_records")
          .update(payload)
          .eq("id", id)
          .eq("author_id", actor.id)
      : db.from("learning_records").insert({ id, ...payload })
  )
    .select("*")
    .single();
  if (error) throw error;
  return res
    .status(200)
    .json({
      draft: {
        id: data.id,
        faculty_id: data.author_id,
        draft: data.metadata.draft,
        updated_at: data.updated_at,
      },
    });
}
