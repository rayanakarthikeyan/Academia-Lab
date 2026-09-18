import { useEffect, useState } from "react";
import { draftRequest, type SavedLabDraft } from "../platform/lab-drafts";
import type {
  ActivityLog,
  AssignmentRecord,
  AuthSession,
} from "../platform/types";
import { AssignmentWorkspace } from "./CourseworkManager";
export function TesterDrafts({
  session,
  theme,
  onEvent,
}: {
  session: AuthSession;
  theme: "light" | "dark";
  onEvent: (e: ActivityLog) => void;
}) {
  const [rows, setRows] = useState<SavedLabDraft[]>([]),
    [selected, setSelected] = useState<SavedLabDraft | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    draftRequest(session.token)
      .then((data) => {
        if (active) setRows(data.drafts || []);
      })
      .catch((e) => {
        if (active) setError(String(e.message));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session.token, revision]);
  if (selected) {
    const d = selected.draft;
    const assignment: AssignmentRecord = {
      id: "draft-" + selected.id,
      curriculum_item_id: d.id,
      title: d.title,
      description: d.brief,
      course_code: d.courseCode,
      unit_number: d.unit,
      starter_code: d.starterCode,
      assignment_type: "practice",
      work_mode: "ide",
      execution_environment: d.environment || "runner",
      subject_id: "",
      due_date: "",
      max_marks: d.suggestedMarks,
      assigned_user_ids: [],
      assigned: 0,
      submitted: 0,
      pending: 0,
      reviewed: 0,
      questions: [],
      hints: d.outcomes,
      test_cases: d.expectedOutput
        ? [{ input: "", output: d.expectedOutput, hidden: false }]
        : [],
      duration_minutes: 60,
    };
    return (
      <section className="space-y-3">
        <p className="panel p-4 text-sm">
          Unpublished faculty draft · tester preview · saved{" "}
          {new Date(selected.updated_at).toLocaleString()}. Practice only; this
          does not publish or submit the experiment.
        </p>
        <AssignmentWorkspace
          key={selected.id + selected.updated_at}
          practiceOnly
          tutorContext={{ kind: "draft", id: selected.id }}
          assignment={assignment}
          session={session}
          theme={theme}
          onBack={() => setSelected(null)}
          onSaved={() => undefined}
          onEvent={(event) =>
            onEvent({
              ...event,
              assignmentId: undefined,
              courseId: d.courseCode === "JAVA" ? "course-java" : "course-dbms",
              metadata: {
                ...event.metadata,
                draftId: selected.id,
                draftSavedAt: selected.updated_at,
                curriculumItemId: d.id,
                workspace: "faculty-draft-preview",
              },
            })
          }
        />
      </section>
    );
  }
  return (
    <section className="panel p-5 space-y-3">
      <div className="flex flex-wrap gap-3 justify-between">
        <h3 className="font-semibold">
          Unpublished faculty drafts · tester only
        </h3>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => setRevision((r) => r + 1)}
        >
          Refresh faculty drafts
        </button>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Faculty must use “Save draft for tester” to share the current version
        here. Unsaved edits remain in their browser.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>Loading drafts…</p>
      ) : !rows.length && !error ? (
        <p>No saved faculty drafts yet.</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <button
            key={row.id}
            className="panel p-4 text-left"
            onClick={() => setSelected(row)}
          >
            <span className="tag neutral">Draft · {row.draft.courseCode}</span>
            <strong className="block mt-2">{row.draft.title}</strong>
            <span className="text-xs">Open tester preview</span>
          </button>
        ))}
      </div>
    </section>
  );
}
