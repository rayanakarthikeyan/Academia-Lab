import { useState } from "react";
import { curriculumCatalog as curriculum } from "../platform/curriculum";
import type {
  ActivityLog,
  AssignmentRecord,
  AuthSession,
} from "../platform/types";
import { AssignmentWorkspace } from "./CourseworkManager";
import { LearningTools, hasLearningTool } from "./labs/LearningTools";
import { ActivityDeliveryStatus } from "./ActivityDeliveryStatus";
export function LearningStudio({
  session,
  theme,
  onEvent,
}: {
  session: AuthSession;
  theme: "light" | "dark";
  onEvent: (event: ActivityLog) => void;
}) {
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("all");
  const labs = curriculum.filter((item) => item.track === "lab");
  const item = labs.find((row) => row.id === selected);
  if (item) {
    const courseId = item.courseCode === "JAVA" ? "course-java" : "course-dbms";
    const emit = (event: ActivityLog) =>
      onEvent({
        ...event,
        assignmentId: undefined,
        courseId,
        metadata: {
          ...event.metadata,
          curriculumItemId: item.id,
          workspace: "learning-studio",
        },
      });
    const assignment: AssignmentRecord = {
      id: "studio-" + item.id,
      curriculum_item_id: item.id,
      title: item.title,
      description: item.brief,
      course_code: item.courseCode,
      unit_number: item.unit,
      starter_code: item.starterCode,
      assignment_type: "practice",
      work_mode: "ide",
      execution_environment: "runner",
      subject_id: "",
      due_date: "",
      max_marks: 0,
      assigned_user_ids: [],
      assigned: 0,
      submitted: 0,
      pending: 0,
      reviewed: 0,
      questions: [],
      hints: item.outcomes,
      test_cases: [],
      duration_minutes: 60,
    };
    return (
      <div className="space-y-4">
        <button className="secondary-button" onClick={() => setSelected("")}>
          Back to learning studio
        </button>
        <ActivityDeliveryStatus session={session} />
        {hasLearningTool(item.id) ? (
          <LearningTools
            key={item.id}
            id={item.id}
            theme={theme}
            onEvent={(action, evidence = {}) =>
              emit({
                userId: session.user.id,
                kind: "code_run",
                metadata: {
                  ...evidence,
                  runType: "learning-interaction",
                  action,
                  runtime:
                    typeof evidence.runtime === "string"
                      ? evidence.runtime
                      : item.id === "java-lab-1"
                        ? "java8-debug"
                        : "simulation",
                },
              })
            }
          />
        ) : (
          <AssignmentWorkspace
            key={item.id}
            practiceOnly
            assignment={assignment}
            session={session}
            theme={theme}
            onEvent={emit}
            onBack={() => setSelected("")}
            onSaved={() => undefined}
          />
        )}
      </div>
    );
  }
  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <h2 className="text-xl font-semibold">Learning studio</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Explore all 31 syllabus labs. These are ungraded practice spaces;
          submit assessed work through your faculty assignments. Simulations
          explain concepts and do not execute original Swing/Applet code.
        </p>
        {session.user.isTester && (
          <p className="mt-2 font-semibold text-amber-600">
            Tester workspace · activity is labeled separately from students.
          </p>
        )}
        <label className="block mt-4">
          Course
          <select
            aria-label="Studio course"
            className="input-field"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All courses</option>
            <option>JAVA</option>
            <option>DBMS</option>
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {labs
          .filter((item) => filter === "all" || item.courseCode === filter)
          .map((item) => (
            <button
              key={item.id}
              className="panel p-5 text-left hover:border-cyan-500 focus-visible:outline-cyan-500 min-w-0"
              onClick={() => {
                setSelected(item.id);
                onEvent({
                  userId: session.user.id,
                  courseId:
                    item.courseCode === "JAVA" ? "course-java" : "course-dbms",
                  kind: "code_run",
                  metadata: {
                    runType: "learning-interaction",
                    action: "lab_open",
                    curriculumItemId: item.id,
                    workspace: "learning-studio",
                  },
                });
              }}
            >
              <span className="text-xs text-[var(--muted)]">
                {item.courseCode} · Lab {item.sequence}
              </span>
              <h3 className="font-semibold mt-2">{item.title}</h3>
              <p className="mt-2 text-xs">
                {hasLearningTool(item.id)
                  ? "Interactive learning activity"
                  : "Built-in code workspace"}
              </p>
            </button>
          ))}
      </div>
    </section>
  );
}
