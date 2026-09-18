import { isTester } from "./_shared.js";
import { requireResourceAccess } from "./_course-access.js";
import labQuestions from "../src/platform/lab-questions.json" with { type: "json" };
export function tutorError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}
export async function tutorContext(db, actor, input) {
  const kind = input?.kind,
    id = String(input?.id || "");
  if (
    !["assignment", "resource", "draft"].includes(kind) ||
    !id ||
    id.length > 250
  )
    throw tutorError("Choose a lab, practice question or resource.");
  const { data, error } = await db
    .from(
      kind === "draft"
        ? "learning_records"
        : kind === "resource"
          ? "resources"
          : "assignments",
    )
    .select("*")
    .eq("id", id)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw tutorError("This learning activity is unavailable.", 404);
  if (kind === "draft") {
    if (!isTester(actor) || row.kind !== "lab_draft")
      throw tutorError("Draft tutoring is available only to testers.", 403);
    const d = row.metadata.draft;
    return {
      key: `draft:${id}`,
      title: d.title,
      instructions: d.brief,
      syllabusQuestion: labQuestions[d.id],
      hints: d.outcomes,
      course: d.courseCode,
      assignmentId: null,
    };
  }
  if (
    kind === "assignment" &&
    row.assigned_user_ids?.length &&
    !row.assigned_user_ids.includes(actor.id) &&
    !isTester(actor)
  )
    throw tutorError("This activity is not assigned to you.", 403);
  if (kind === "assignment") {
    if (row.assignment_type === "assessment")
      throw tutorError("The tutor is unavailable for assessments.", 403);
    return {
      key: `assignment:${id}`,
      title: row.title,
      instructions: row.description,
      syllabusQuestion:
        row.assignment_type === "lab"
          ? labQuestions[row.curriculum_item_id]
          : undefined,
      questions: (row.questions || []).map((q) => ({
        id: q.id,
        prompt: q.prompt,
        options: q.options,
      })),
      hints: row.hints,
      course: row.course_code,
      assignmentId: id,
    };
  }
  if (row.is_published !== true)
    throw tutorError("This resource is not published.", 403);
  await requireResourceAccess(db, actor, row);
  const questionId = String(input.questionId || ""),
    q = questionId
      ? (row.practice_questions || []).find((q) => q.id === questionId)
      : null;
  if (questionId && !q)
    throw tutorError("This practice question is unavailable.", 404);
  return {
    key: `resource:${id}:${questionId}`,
    title: q?.title || row.title,
    instructions:
      q?.prompt ||
      row.topic ||
      row.description ||
      "Discuss this study resource",
    resourceTitle: row.title,
    resourceUrl: row.external_url,
    course: row.course_code,
    assignmentId: null,
    resourceId: id,
    sourceNotice:
      "Only resource metadata and student-provided excerpts are available. Do not claim to have read the linked PDF, website or video.",
  };
}
export function workSnapshot(value = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) value = {};
  const result = {};
  for (const [key, limit] of Object.entries({
    answer: 16000,
    code: 20000,
    input: 3000,
    output: 5000,
    observations: 8000,
    excerpt: 10000,
    selections: 5000,
    evidence: 8000,
  })) {
    const raw = value[key];
    result[key] = (
      typeof raw === "string" ? raw : raw ? JSON.stringify(raw) : ""
    ).slice(0, limit);
  }
  return result;
}
