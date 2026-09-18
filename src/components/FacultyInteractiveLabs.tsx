import { useEffect, useState } from "react";
import { loadCoursework, updateCourseworkAssignment } from "../platform/api";
import { curriculumCatalog } from "../platform/curriculum";
import type { AssignmentRecord, AuthSession } from "../platform/types";
import { hasLearningTool, LearningTools } from "./labs/LearningTools";

export function FacultyInteractiveLabs({
  session,
  theme,
}: {
  session: AuthSession;
  theme: "light" | "dark";
}) {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [course, setCourse] = useState("all");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    loadCoursework(session.token, true)
      .then((data) => {
        if (active)
          setAssignments(
            data.assignments.filter((a) => a.assignment_type === "lab"),
          );
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.token, revision]);
  async function toggle(lab: AssignmentRecord) {
    if (pending) return;
    setPending(lab.id);
    setError("");
    setNotice("");
    try {
      const updated = await updateCourseworkAssignment(session.token, lab.id, {
        interactiveEnabled: !lab.interactive_enabled,
      });
      setAssignments((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row)),
      );
      setNotice(
        updated.interactive_enabled
          ? "Interactive activity enabled after the manual lab."
          : "Interactive activity disabled for students.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not update interactive availability",
      );
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="panel p-5 space-y-3">
        <h2 className="text-xl font-semibold">Interactive Lab</h2>
        <p className="text-sm text-[var(--muted)]">
          Preview visual activities here. Publish the corresponding experiment
          from Lab Workspace, then enable its interactive activity only after
          students complete the manual lab.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <label>
            Course
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="all">All courses</option>
              <option value="JAVA">Java</option>
              <option value="DBMS">DBMS</option>
            </select>
          </label>
          <button
            type="button"
            className="secondary-button"
            disabled={loading || !!pending}
            onClick={() => setRevision((v) => v + 1)}
          >
            Refresh availability
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="panel p-4 text-rose-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="panel p-4">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Loading interactive labs…</p>
      ) : !error || assignments.length ? (
        curriculumCatalog
          .filter(
            (item) =>
              item.track === "lab" &&
              hasLearningTool(item.id) &&
              (course === "all" || course === item.courseCode),
          )
          .map((item) => {
            const labs = assignments.filter(
              (a) => a.curriculum_item_id === item.id,
            );
            return (
              <article className="panel p-5 space-y-4" key={item.id}>
                <span className="tag neutral">
                  {item.courseCode} · {item.label}
                </span>
                <h3 className="font-semibold">
                  {labs[0]?.title || item.title}
                </h3>
                {labs.length ? (
                  labs.map((lab) => (
                    <div key={lab.id} className="space-y-2">
                      {labs.length > 1 && (
                        <p>
                          {lab.title} · Due {lab.due_date}
                        </p>
                      )}
                      <p className="text-sm">
                        {lab.interactive_enabled
                          ? "Interactive activity is enabled for students."
                          : "Interactive activity is disabled for students. Complete the manual lab before enabling it."}
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={!!pending}
                        onClick={() => void toggle(lab)}
                      >
                        {lab.interactive_enabled
                          ? "Disable interactive activity"
                          : "Manual lab completed — enable interactive activity"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Publish this experiment in Lab Workspace before enabling it
                    for students.
                  </p>
                )}
                <details className="border-t border-[var(--line)] pt-3">
                  <summary className="cursor-pointer font-semibold">
                    Preview interactive lab
                  </summary>
                  <p className="my-3 text-xs text-[var(--muted)]">
                    Faculty preview only. Student access requires the enable
                    control above.
                  </p>
                  <LearningTools
                    id={item.id}
                    theme={theme}
                    onEvent={() => undefined}
                  />
                </details>
              </article>
            );
          })
      ) : null}
    </div>
  );
}
