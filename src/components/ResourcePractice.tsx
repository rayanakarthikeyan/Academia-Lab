import { useEffect, useState } from "react";
import { tutorRequest } from "./AiTutor";
import { AssignmentWorkspace } from "./CourseworkManager";
import type {
  ActivityLog,
  AssignmentRecord,
  AuthSession,
  LearningResource,
  PracticeQuestion,
  LearningRecord,
} from "../platform/types";

export function ResourcePractice({
  resource,
  session,
  theme,
  onEvent,
}: {
  resource: LearningResource;
  session: AuthSession;
  theme: "light" | "dark";
  onEvent: (event: ActivityLog) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [selectedId, setSelectedId] = useState("");
  const [submissions, setSubmissions] = useState<LearningRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const questions = resource.practiceQuestions || [];
  const requiresSubmissions = questions.some((q) => q.requireSubmission);
  useEffect(() => {
    let active = true;
    setSubmissions([]);
    setError("");
    if (!requiresSubmissions) {
      setLoading(false);
      return;
    }
    setLoading(true);
    tutorRequest(
      session.token,
      `platform?entity=resource-practice&resourceId=${encodeURIComponent(resource.id)}`,
    )
      .then((data) => {
        if (active) setSubmissions(data.records || []);
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
  }, [resource.id, session.token, requiresSubmissions, revision]);
  const selected = questions.find((q) => q.id === selectedId);
  if (!questions.length) return null;
  const assignmentFor = (q: PracticeQuestion): AssignmentRecord => ({
    id: `resource-${resource.id}-${q.id}`,
    title: q.title,
    subject_id: "",
    due_date: "",
    max_marks: 0,
    description: q.prompt,
    starter_code: q.starterCode,
    test_cases:
      q.expectedOutput?.trim() || q.input?.trim()
        ? [{ input: q.input || "", output: q.expectedOutput, hidden: false }]
        : [],
    assigned_user_ids: [],
    assigned: 0,
    submitted: 0,
    pending: 0,
    reviewed: 0,
    assignment_type: "practice",
    curriculum_item_id: "",
    course_code: q.language === "sql" ? "DBMS" : "JAVA",
    unit_number: resource.unitNumber,
    duration_minutes: 30,
    work_mode: "ide",
    questions: [],
    hints: [],
    execution_environment: q.language === "visual" ? "visual" : "runner",
  });
  return (
    <section className="mt-5 panel p-4 space-y-4">
      <h3 className="font-semibold">
        Finished studying? Try these practice questions
      </h3>
      <p className="text-xs text-[var(--muted)]">
        Ungraded practice. Enter your own input and run your code.{" "}
        {requiresSubmissions
          ? "Submit questions marked submission required for faculty review."
          : "Your code is saved on this device; no submission is required."}
      </p>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            className="secondary-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry practice history
          </button>
        </p>
      )}
      {loading && <p>Loading saved practice…</p>}
      {selected && !loading && !error ? (
        <AssignmentWorkspace
          key={
            selected.id +
            (submissions.find((r) => r.metadata.questionId === selected.id)
              ?.id || "")
          }
          practiceOnly
          submission={submissions.find(
            (r) => r.metadata.questionId === selected.id,
          )}
          onPracticeSubmit={
            selected.requireSubmission
              ? async (work) => {
                  const data = await tutorRequest(
                    session.token,
                    "platform?entity=resource-practice",
                    {
                      resourceId: resource.id,
                      questionId: selected.id,
                      ...work,
                    },
                  );
                  return data.record as LearningRecord;
                }
              : undefined
          }
          tutorContext={{
            kind: "resource",
            id: resource.id,
            questionId: selected.id,
          }}
          assignment={assignmentFor(selected)}
          session={session}
          theme={theme}
          onEvent={(event) =>
            onEvent({
              ...event,
              assignmentId: undefined,
              resourceId: resource.id,
              courseId: resource.courseId,
              metadata: { ...event.metadata, practiceQuestionId: selected.id },
            })
          }
          onBack={() => setSelectedId("")}
          onSaved={(record) =>
            setSubmissions((rows) => [
              record,
              ...rows.filter((r) => r.id !== record.id),
            ])
          }
        />
      ) : (
        <>
          <label>
            Practice language
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All questions</option>
              {questions.some((q) => q.language === "java") && (
                <option value="java">Java</option>
              )}
              {questions.some((q) => q.language === "sql") && (
                <option value="sql">DBMS (SQL)</option>
              )}
              {questions.some((q) => q.language === "visual") && (
                <option value="visual">Visual canvas</option>
              )}
            </select>
          </label>
          {questions
            .filter((q) => filter === "all" || q.language === filter)
            .map((q) => (
              <button
                key={q.id}
                type="button"
                className="secondary-button block w-full text-left"
                onClick={() => setSelectedId(q.id)}
              >
                {q.title} · {q.language === "sql" ? "DBMS (SQL)" : q.language}
                {q.requireSubmission
                  ? " · Submission required"
                  : " · Practice only"}
              </button>
            ))}
          {!questions.some(
            (q) => filter === "all" || q.language === filter,
          ) && <p>No questions in this language for this module.</p>}
        </>
      )}
    </section>
  );
}
