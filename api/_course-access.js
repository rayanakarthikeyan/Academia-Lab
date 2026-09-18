import { isTester } from "./_shared.js";

export function matchesPublishedCohort(row, actor) {
  if (row.target_audience === "all") return true;
  if (row.target_audience !== "cohort") return false;
  return (
    (!row.department || row.department === actor.department) &&
    (!row.academic_year || String(row.academic_year) === String(actor.year)) &&
    (!row.sections?.length || row.sections.includes(actor.section))
  );
}
export async function studentCourseAccess(db, actor, requireEnrollment = true) {
  if (actor.role !== "student" || isTester(actor)) return null;
  const [
    { data: cohorts, error },
    { data: enrollments, error: enrollmentError },
  ] = await Promise.all([
    db.from("course_cohorts").select("*"),
    db.from("enrollments").select("course_id,status").eq("user_id", actor.id),
  ]);
  if (error) throw error;
  if (enrollmentError) throw enrollmentError;
  return new Set(
    (cohorts || [])
      .filter(
        (row) =>
          matchesPublishedCohort(row, actor) &&
          (!requireEnrollment ||
            (enrollments || []).some(
              (e) =>
                e.course_id === row.course_id &&
                ["active", "completed"].includes(e.status),
            )),
      )
      .map((row) => row.course_id),
  );
}
export async function requireResourceAccess(db, actor, resource) {
  const allowed = await studentCourseAccess(db, actor);
  if (
    !resource ||
    (actor.role === "student" &&
      (resource.is_published !== true ||
        (allowed && !allowed.has(resource.course_id))))
  )
    throw Object.assign(
      new Error(
        "This resource is not available in your published course cohort.",
      ),
      { statusCode: 403 },
    );
}
