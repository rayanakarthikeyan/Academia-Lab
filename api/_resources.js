import { normalizePracticeQuestions } from "./_practice.js";
const invalid = (message) => {
  throw Object.assign(new Error(message), { statusCode: 400 });
};
export function resourceFields(body, existing = {}) {
  if (body.isPublished !== undefined && typeof body.isPublished !== "boolean")
    invalid("Choose a valid publication status");
  const value = (key, column, fallback) =>
    body[key] === undefined ? (existing[column] ?? fallback) : body[key];
  const published = value("isPublished", "is_published", true) === true;
  const courseCode = String(value("courseCode", "course_code", ""));
  const courseId = String(value("courseId", "course_id", ""));
  if (
    !["JAVA", "DBMS"].includes(courseCode) ||
    courseId !== (courseCode === "JAVA" ? "course-java" : "course-dbms")
  )
    invalid("Choose a matching course");
  const title = String(value("title", "title", "")).trim();
  if (!title || title.length > 200)
    invalid("Enter a resource title (up to 200 characters)");
  const type = value("type", "type", "youtube");
  if (!["youtube", "pdf"].includes(type)) invalid("Choose a video or PDF");
  const url = String(value("externalUrl", "external_url", "")).trim();
  if (url.length > 4000) invalid("Resource URL is too long");
  if (published) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      invalid("Enter a valid resource URL before publishing");
    }
    if (!["http:", "https:"].includes(parsed.protocol))
      invalid("Use an HTTP(S) resource URL");
  }
  const minutes = Number(value("durationMinutes", "duration_minutes", 15));
  if (!Number.isFinite(minutes) || minutes < 1 || minutes > 240)
    invalid("Study duration must be between 1 and 240 minutes");
  const due = String(value("dueDate", "due_date", "") || "");
  if (
    due &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(due) ||
      !Number.isFinite(Date.parse(due)) ||
      new Date(due).toISOString().slice(0, 10) !== due)
  )
    invalid("Enter a valid deadline");
  return {
    title,
    type,
    course_code: courseCode,
    course_id: courseId,
    topic: String(value("topic", "topic", "")),
    external_url: url,
    duration_minutes: minutes,
    curriculum_item_id: String(
      value("curriculumItemId", "curriculum_item_id", ""),
    ),
    unit_number: Math.min(
      5,
      Math.max(1, Number(value("unitNumber", "unit_number", 1)) || 1),
    ),
    due_date: due || null,
    assigned_user_ids: [],
    is_published: published,
    practice_questions: normalizePracticeQuestions(
      value("practiceQuestions", "practice_questions", []),
      courseCode,
      !published,
    ),
  };
}
