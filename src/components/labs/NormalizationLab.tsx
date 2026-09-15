import { useState } from "react";
import { quote } from "./lab-utils";
import type { LabEvent } from "./lab-utils";
import { SqlExercise } from "./SqlExercise";
type Row = {
  studentId: string;
  student: string;
  courseId: string;
  course: string;
};
export function normalizationSql(rows: Row[], normalized: boolean) {
  if (
    !rows.length ||
    rows.some((row) => Object.values(row).some((value) => !value.trim()))
  )
    throw new Error("Fill every cell in at least one row.");
  const students = new Map<string, string>(),
    courses = new Map<string, string>(),
    keys = new Set<string>();
  for (const row of rows) {
    if (
      students.has(row.studentId) &&
      students.get(row.studentId) !== row.student
    )
      throw new Error(
        "Functional dependency violated: one student ID has different names.",
      );
    if (courses.has(row.courseId) && courses.get(row.courseId) !== row.course)
      throw new Error(
        "Functional dependency violated: one course ID has different titles.",
      );
    const key = JSON.stringify([row.studentId, row.courseId]);
    if (keys.has(key))
      throw new Error(
        "Duplicate enrollment key: student ID + course ID must be unique.",
      );
    keys.add(key);
    students.set(row.studentId, row.student);
    courses.set(row.courseId, row.course);
  }
  let sql =
    "CREATE TABLE original(student_id TEXT, student_name TEXT, course_id TEXT, course_title TEXT, PRIMARY KEY(student_id, course_id));\nINSERT INTO original VALUES\n" +
    rows
      .map(
        (row) =>
          "(" +
          [row.studentId, row.student, row.courseId, row.course]
            .map(quote)
            .join(",") +
          ")",
      )
      .join(",\n") +
    ";\n";
  if (!normalized)
    return (
      sql +
      "SELECT * FROM original ORDER BY student_id, course_id;\n-- student_id -> student_name and course_id -> course_title are partial dependencies."
    );
  return (
    sql +
    `CREATE TABLE students(student_id TEXT PRIMARY KEY, student_name TEXT NOT NULL);
CREATE TABLE courses(course_id TEXT PRIMARY KEY, course_title TEXT NOT NULL);
CREATE TABLE enrollments(student_id TEXT REFERENCES students, course_id TEXT REFERENCES courses, PRIMARY KEY(student_id, course_id));
INSERT INTO students SELECT DISTINCT student_id, student_name FROM original;
INSERT INTO courses SELECT DISTINCT course_id, course_title FROM original;
INSERT INTO enrollments SELECT student_id, course_id FROM original;
CREATE VIEW reconstructed AS SELECT student_id, student_name, course_id, course_title FROM enrollments JOIN students USING(student_id) JOIN courses USING(course_id);
SELECT * FROM reconstructed ORDER BY student_id, course_id;
SELECT COUNT(*) AS missing_or_extra_rows FROM ((SELECT * FROM original EXCEPT SELECT * FROM reconstructed) UNION ALL (SELECT * FROM reconstructed EXCEPT SELECT * FROM original)) AS differences;
-- Zero differences checks this dataset. The stated dependencies and keys justify the lossless decomposition; sample data alone is not a general proof.`
  );
}
export function NormalizationLab({ onEvent }: { onEvent: LabEvent }) {
  const [rows, setRows] = useState<Row[]>([
    { studentId: "S1", student: "Asha", courseId: "J1", course: "Java" },
    { studentId: "S1", student: "Asha", courseId: "D1", course: "DBMS" },
    { studentId: "S2", student: "Ravi", courseId: "J1", course: "Java" },
  ]);
  const [sql, setSql] = useState(""),
    [feedback, setFeedback] = useState(""),
    [answer, setAnswer] = useState("");
  return (
    <section className="panel p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-semibold">
        Normalization workshop · Repair the enrollment table
      </h2>
      <p className="text-sm">
        The key is (student_id, course_id). Dependencies: student_id →
        student_name; course_id → course_title. Discover repeated facts, split
        the relations, and execute a reconstruction check.
      </p>
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((row, i) => (
          <fieldset
            className="rounded-xl border border-[var(--line)] p-3 grid grid-cols-2 gap-2"
            key={i}
          >
            <legend>Enrollment {i + 1}</legend>
            {(Object.keys(row) as (keyof Row)[]).map((key) => (
              <label className="text-xs min-w-0" key={key}>
                {key}
                <input
                  aria-label={`Row ${i + 1} ${key}`}
                  className="input-field"
                  maxLength={60}
                  value={row[key]}
                  onChange={(e) => {
                    setRows(
                      rows.map((r, j) =>
                        j === i ? { ...r, [key]: e.target.value } : r,
                      ),
                    );
                    setSql("");
                  }}
                />
              </label>
            ))}
            <button
              className="secondary-button"
              onClick={() => {
                setRows(rows.filter((_, j) => i !== j));
                setSql("");
              }}
            >
              Remove row {i + 1}
            </button>
          </fieldset>
        ))}
      </div>
      <button
        className="secondary-button"
        disabled={rows.length >= 10}
        onClick={() => {
          setRows([
            ...rows,
            { studentId: "", student: "", courseId: "", course: "" },
          ]);
          setSql("");
        }}
      >
        Add enrollment
      </button>
      <div className="rounded-xl bg-[var(--surface-2)] p-4 space-y-2">
        <label className="block">
          Which dependency causes repeated student names?
          <select
            aria-label="Dependency prediction"
            className="input-field"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          >
            <option value="">Choose a dependency</option>
            <option value="student">student_id → student_name</option>
            <option value="course">course_id → course_title</option>
            <option value="reverse">student_name → student_id</option>
          </select>
        </label>
        <button
          className="secondary-button"
          disabled={!answer}
          onClick={() => {
            const matched = answer === "student";
            setFeedback(
              matched
                ? "Correct. Student name depends on only part of the composite key, so it belongs in Students."
                : "Look at which part of the composite key determines the student name.",
            );
            onEvent("normalization_prediction", { matched });
          }}
        >
          Check dependency
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {[false, true].map((normalized) => (
          <button
            key={String(normalized)}
            className={normalized ? "primary-button" : "secondary-button"}
            onClick={() => {
              try {
                setSql(normalizationSql(rows, normalized));
                setFeedback(
                  normalized
                    ? "Three relations generated: Students, Courses and Enrollments. Run the SQL; missing_or_extra_rows should be zero. Explain how primary and foreign keys preserve the join."
                    : "Flat table generated. Run it and identify facts repeated across rows.",
                );
                onEvent("normalization_design", {
                  normalized,
                  rowCount: rows.length,
                  status: "passed",
                });
              } catch (error) {
                setSql("");
                setFeedback(String(error));
                onEvent("normalization_design", {
                  status: "error",
                  error: String(error),
                });
              }
            }}
          >
            {normalized ? "Decompose and verify" : "Run original design"}
          </button>
        ))}
      </div>
      <p role="status">{feedback}</p>
      {sql && <SqlExercise key={sql} initialSql={sql} onEvent={onEvent} />}
      <p className="text-xs text-[var(--muted)]">
        This exercise covers the stated dependency set. General normalization
        proofs and other dependency sets require faculty review.
      </p>
    </section>
  );
}
