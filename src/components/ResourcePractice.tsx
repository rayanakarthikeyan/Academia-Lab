import { useState } from "react";
import { AssignmentWorkspace } from "./CourseworkManager";
import type {
  ActivityLog,
  AssignmentRecord,
  AuthSession,
  LearningResource,
  PracticeQuestion,
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
  const questions = resource.practiceQuestions || [];
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
    test_cases: [{ input: q.input, output: q.expectedOutput, hidden: false }],
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
        Ungraded practice. Your code is saved on this device.
      </p>
      {selected ? (
        <AssignmentWorkspace
          key={selected.id}
          practiceOnly
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
          onSaved={() => undefined}
        />
      ) : (
        <>
          <label>
            Practice language
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All questions</option>
              <option value="java">Java</option>
              <option value="sql">DBMS (SQL)</option>
              <option value="visual">Visual canvas</option>
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
