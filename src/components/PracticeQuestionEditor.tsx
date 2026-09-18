import type { PracticeQuestion } from "../platform/types";
import { visualStarter } from "../platform/visual-labs";

export function PracticeQuestionEditor({
  questions,
  onChange,
  course,
}: {
  questions: PracticeQuestion[];
  onChange: (questions: PracticeQuestion[]) => void;
  course: "JAVA" | "DBMS";
}) {
  const update = (id: string, patch: Partial<PracticeQuestion>) =>
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  return (
    <section className="border-b border-[var(--line)] p-5 space-y-4">
      <h3 className="font-semibold">Practice after this module</h3>
      <p className="text-sm text-[var(--muted)]">
        Attach {course === "JAVA" ? "Java" : "DBMS (SQL)"} questions. Students
        can enter their own input. Samples are optional; choose whether each
        question requires a submission. Practice is ungraded.
      </p>
      {questions.map((q, i) => (
        <fieldset key={q.id} className="panel p-4 grid gap-3">
          <legend>Question {i + 1}</legend>
          <label>
            Language
            <select
              value={q.language}
              onChange={(e) =>
                update(q.id, {
                  language: e.target.value as PracticeQuestion["language"],
                })
              }
            >
              {course === "JAVA" ? (
                <option value="java">Java</option>
              ) : (
                <option value="sql">DBMS (SQL)</option>
              )}
              {q.language === "visual" && (
                <option value="visual">
                  Visual canvas (existing question)
                </option>
              )}
            </select>
          </label>
          {q.language === "visual" && (
            <button
              type="button"
              className="secondary-button"
              onClick={() => update(q.id, { starterCode: visualStarter })}
            >
              Use traffic light example
            </button>
          )}
          <label>
            Title
            <input
              required
              maxLength={200}
              value={q.title}
              onChange={(e) => update(q.id, { title: e.target.value })}
            />
          </label>
          <label>
            Task
            <textarea
              required
              maxLength={10000}
              value={q.prompt}
              onChange={(e) => update(q.id, { prompt: e.target.value })}
            />
          </label>
          <label>
            Starter code
            <textarea
              rows={7}
              maxLength={100000}
              className="font-mono"
              value={q.starterCode}
              onChange={(e) => update(q.id, { starterCode: e.target.value })}
            />
          </label>
          <label>
            Sample input (optional)
            <textarea
              maxLength={10000}
              value={q.input}
              onChange={(e) => update(q.id, { input: e.target.value })}
            />
          </label>
          <label>
            Expected output / visual observations (optional)
            <textarea
              maxLength={10000}
              value={q.expectedOutput}
              onChange={(e) => update(q.id, { expectedOutput: e.target.value })}
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={q.requireSubmission === true}
              onChange={(e) =>
                update(q.id, { requireSubmission: e.target.checked })
              }
            />
            Require student submission
          </label>
          <button
            type="button"
            className="secondary-button"
            onClick={() =>
              onChange(questions.filter((item) => item.id !== q.id))
            }
          >
            Remove question
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary-button"
        disabled={questions.length >= 20}
        onClick={() =>
          onChange([
            ...questions,
            {
              id: crypto.randomUUID(),
              title: "",
              prompt: "",
              language: course === "JAVA" ? "java" : "sql",
              starterCode:
                course === "JAVA"
                  ? "public class Main {\n  public static void main(String[] args) {\n    // Write your solution\n  }\n}"
                  : "-- Write your SQL here",
              input: "",
              expectedOutput: "",
            },
          ])
        }
      >
        Add practice question
      </button>
    </section>
  );
}
