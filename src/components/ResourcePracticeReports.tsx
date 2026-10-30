import { useEffect, useState } from "react";
import { tutorRequest, TutorExchange, type TutorRecord } from "./AiTutor";
import type { LearningRecord } from "../platform/types";

type Student = {
  id: string;
  name: string;
  roll_number?: string;
  department?: string;
  year?: string;
  section?: string;
  submissionCount?: number;
  resourceSeconds?: number;
  practiceSeconds?: number;
};
type Detail = {
  student: Student;
  records: LearningRecord[];
  resourceSeconds: number;
  practiceSeconds: number;
  hasMore: boolean;
  chats: TutorRecord[];
  hasMoreChats: boolean;
};
function time(seconds = 0) {
  return seconds
    ? `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`
    : "No recorded time";
}
export function ResourcePracticeReports({
  token,
  resourceId,
  resourceTitle,
  onClose,
}: {
  token: string;
  resourceId: string;
  resourceTitle?: string;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [recordOffset, setRecordOffset] = useState(0);
  const [chatOffset, setChatOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    setSelected("");
    setOffset(0);
    setSearch("");
  }, [resourceId]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setError("");
    setDetail(null);
    setStudents([]);
    const query = new URLSearchParams({
      entity: "resource-practice",
      resourceId,
    });
    if (selected) {
      query.set("studentId", selected);
      query.set("offset", String(recordOffset));
      query.set("chatOffset", String(chatOffset));
    } else {
      query.set("roster", "1");
      query.set("search", search);
      query.set("offset", String(offset));
    }
    tutorRequest(token, `platform?${query}`)
      .then((data) => {
        if (!active) return;
        if (selected) setDetail(data);
        else {
          setStudents(data.students || []);
          setTotal(data.total || 0);
          setMore(data.hasMore);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [
    token,
    resourceId,
    selected,
    search,
    offset,
    recordOffset,
    chatOffset,
    revision,
  ]);
  return (
    <section
      className="panel p-5 space-y-4 min-w-0"
      aria-label="Resource practice submissions"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold">Practice submissions · ungraded</h3>
        <button
          type="button"
          className="secondary-button"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh submissions
        </button>
        <button type="button" className="secondary-button" onClick={onClose}>
          Close submissions
        </button>
      </div>
      {resourceTitle && (
        <p className="font-semibold">Resource: {resourceTitle}</p>
      )}
      {selected && (
        <button
          type="button"
          className="secondary-button"
          onClick={() => {
            setSelected("");
            setRecordOffset(0);
            setChatOffset(0);
          }}
        >
          Back to students
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Loading submissions…</p>}
      {!selected && (
        <>
          <label className="block text-sm">
            Search students by name, roll number or cohort
            <input
              className="input-field"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
            />
          </label>
          <p className="text-sm text-[var(--muted)]">
            {total} students · Enrolled students and previous submitters.
            Students without submissions are included. Tester accounts are
            excluded.
          </p>
          {!busy && !error && !students.length && <p>No matching students.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="p-3">Student</th>
                  <th className="p-3">Resource learning time</th>
                  <th className="p-3">Submissions</th>
                  <th className="p-3">Review</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="border-t border-[var(--line)]"
                  >
                    <td className="p-3">
                      <strong>{student.name}</strong>
                      <span className="block text-xs text-[var(--muted)]">
                        {[
                          student.roll_number,
                          student.department,
                          student.year && `Year ${student.year}`,
                          student.section,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </td>
                    <td className="p-3">{time(student.resourceSeconds)}</td>
                    <td className="p-3">
                      {student.submissionCount
                        ? `${student.submissionCount} submitted`
                        : "Not submitted"}
                    </td>
                    <td className="p-3">
                      <button
                        type="button"
                        className="secondary-button"
                        aria-label={`Open submissions for ${student.name}`}
                        onClick={() => {
                          setRecordOffset(0);
                          setChatOffset(0);
                          setSelected(student.id);
                        }}
                      >
                        Open submissions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="secondary-button"
              disabled={busy || offset === 0}
              onClick={() => setOffset((v) => Math.max(0, v - 50))}
            >
              Previous students
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !more}
              onClick={() => setOffset((v) => v + 50)}
            >
              Next students
            </button>
          </div>
        </>
      )}
      {selected && detail && (
        <>
          <h4 className="text-lg font-semibold">{detail.student.name}</h4>
          <p className="text-sm">
            {[
              detail.student.roll_number,
              detail.student.department,
              detail.student.section,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel p-3">
              <strong>Resource learning time</strong>
              <p>{time(detail.resourceSeconds)}</p>
              <p className="text-xs text-[var(--muted)]">
                Recorded video playback / focused document reading.
              </p>
            </div>
            <div className="panel p-3">
              <strong>Active practice time</strong>
              <p>{time(detail.practiceSeconds)}</p>
              <p className="text-xs text-[var(--muted)]">
                Recorded active time in this resource’s coding workspace.
              </p>
            </div>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Times reflect synced browser activity; missing records do not prove
            that a student did not study. Submitted output is student-reported.
          </p>
          {!detail.records.length && (
            <p>No practice submissions for this student.</p>
          )}
          {detail.records.map((row) => (
            <article
              key={row.id}
              className="border-t border-[var(--line)] py-4 space-y-2 min-w-0"
            >
              <h4 className="font-semibold">
                {String(row.metadata.questionTitle || "Practice")}
              </h4>
              <p className="text-xs text-[var(--muted)]">
                Submitted{" "}
                {row.created_at
                  ? new Date(row.created_at).toLocaleString()
                  : ""}{" "}
                · {String(row.metadata.language || "")}
              </p>
              <p className="whitespace-pre-wrap break-words">
                {String(row.metadata.prompt || "")}
              </p>
              <h5 className="font-semibold">Submitted code</h5>
              <pre className="rounded border border-[var(--line)] bg-[var(--surface-2)] p-3 max-h-96 overflow-auto whitespace-pre-wrap break-words text-sm">
                {row.body}
              </pre>
              <h5 className="font-semibold">Student input</h5>
              <pre className="whitespace-pre-wrap break-words text-sm">
                {String(row.metadata.input || "No input")}
              </pre>
              <h5 className="font-semibold">Student-reported output</h5>
              <pre className="whitespace-pre-wrap break-words text-sm">
                {String(row.metadata.output || "No run output")}
              </pre>
            </article>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className="secondary-button"
              disabled={busy || recordOffset === 0}
              onClick={() => setRecordOffset((v) => Math.max(0, v - 50))}
            >
              Newer submissions
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={busy || !detail.hasMore}
              onClick={() => setRecordOffset((v) => v + 50)}
            >
              Older submissions
            </button>
          </div>
          <section
            className="space-y-3 min-w-0"
            aria-label="Resource AI tutor history"
          >
            <h4 className="font-semibold">AI tutor · this resource</h4>
            <p className="text-xs text-[var(--muted)]">
              Saved questions, replies and work shared with the tutor for this
              resource and its practice questions.
            </p>
            {!detail.chats.length && (
              <p>No tutor conversations recorded for this resource.</p>
            )}
            {detail.chats.map((row) => (
              <TutorExchange key={row.id} row={row} faculty />
            ))}
            <div className="flex gap-2">
              <button
                type="button"
                className="secondary-button"
                disabled={busy || chatOffset === 0}
                onClick={() => setChatOffset((v) => Math.max(0, v - 20))}
              >
                Newer tutor chats
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={busy || !detail.hasMoreChats}
                onClick={() => setChatOffset((v) => v + 20)}
              >
                Older tutor chats
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
