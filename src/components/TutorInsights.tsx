import { useEffect, useMemo, useState } from "react";
import { StudentIdeHistory } from "./StudentIdeHistory";
import type { AuthSession, SessionUser } from "../platform/types";
import { tutorRequest, TutorExchange, type TutorRecord } from "./AiTutor";

type Counts = {
  userId: string;
  requests: number;
  answered: number;
  failed: number;
};
type TimeEvent = { user_id: string; kind: string; duration_seconds?: number };
export function TutorHistory({
  token,
  studentId,
}: {
  token: string;
  studentId: string;
}) {
  const [rows, setRows] = useState<TutorRecord[]>([]),
    [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setRows([]);
    tutorRequest(
      token,
      `ai-chat-logs?userId=${encodeURIComponent(studentId)}&offset=${offset}`,
    )
      .then((data) => {
        if (active) {
          setRows(data.records || []);
          setMore(data.hasMore);
        }
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
  }, [token, studentId, offset, revision]);
  return (
    <section className="space-y-3 min-w-0">
      <div className="flex flex-wrap gap-2 items-center">
        <h4 className="font-semibold">Chat history</h4>
        <button
          className="secondary-button"
          disabled={loading}
          onClick={() => setRevision((x) => x + 1)}
        >
          Refresh chats
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Newest first. Each question includes the instructions and work shared at
        that moment. Older conversations remain available through pagination.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading && <p>Loading conversations…</p>}
      {!loading && !error && !rows.length && (
        <p>No tutor conversations recorded.</p>
      )}
      {rows.map((row) => (
        <TutorExchange key={row.id} row={row} faculty />
      ))}
      <div className="flex flex-wrap gap-3">
        <button
          className="secondary-button"
          disabled={loading || offset === 0}
          onClick={() => setOffset((x) => Math.max(0, x - 20))}
        >
          Newer conversations
        </button>
        <button
          className="secondary-button"
          disabled={loading || !more}
          onClick={() => setOffset((x) => x + 20)}
        >
          Older conversations
        </button>
      </div>
    </section>
  );
}
export function TutorInsights({
  session,
  students,
  activities,
}: {
  session: AuthSession;
  students: SessionUser[];
  activities: TimeEvent[];
}) {
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0),
    [selected, setSelected] = useState(""),
    [tab, setTab] = useState<"overview" | "chats" | "ide">("overview"),
    [counts, setCounts] = useState<Counts[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const filtered = students.filter(
    (s) =>
      !s.isTester &&
      `${s.name} ${s.rollNumber} ${s.department} ${s.section}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const slice = filtered.slice(page * 50, page * 50 + 50),
    ids = slice.map((s) => s.id).join(",");
  useEffect(() => {
    let active = true;
    setCounts([]);
    setError("");
    if (!ids) {
      setLoading(false);
      return;
    }
    setLoading(true);
    tutorRequest(
      session.token,
      `ai-chat-logs?summary=1&userIds=${encodeURIComponent(ids)}`,
    )
      .then((data) => {
        if (active) setCounts(data.summaries);
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
  }, [session.token, ids, revision]);
  const time = useMemo(() => {
    const result = new Map<string, number>();
    for (const event of activities)
      if (["video_progress", "pdf_dwell", "editor_change"].includes(event.kind))
        result.set(
          event.user_id,
          (result.get(event.user_id) || 0) +
            Number(event.duration_seconds || 0),
        );
    return result;
  }, [activities]);
  const summary = (id: string) => {
    const row = counts.find((c) => c.userId === id),
      seconds = time.get(id) || 0;
    const rate =
      row && seconds >= 1800 ? row.answered / (seconds / 3600) : null;
    return {
      row,
      minutes: Math.round(seconds / 60),
      rate,
      label: !row
        ? "Unavailable"
        : row.answered === 0
          ? "No answered chats"
          : rate === null
            ? "Not enough tracked time"
            : rate <= 2
              ? "Low use"
              : rate <= 5
                ? "Moderate use"
                : "Frequent use",
    };
  };
  const person = slice.find((s) => s.id === selected),
    info = person ? summary(person.id) : null;
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex-1 min-w-0">
          Find a student
          <input
            className="input-field mt-2 w-full"
            placeholder="Name, roll number, department or section"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
              setSelected("");
            }}
          />
        </label>
        <button
          className="secondary-button"
          onClick={() => setRevision((x) => x + 1)}
          disabled={loading}
        >
          Refresh AI usage
        </button>
      </div>
      <p className="text-sm text-[var(--muted)]">
        AI dependency indicator = answered tutor questions per tracked learning
        hour. Low: up to 2; moderate: over 2 to 5; frequent: over 5. At least 30
        tracked minutes are required. This measures help usage, not ability,
        misconduct or understanding.
      </p>
      <p className="text-xs text-[var(--muted)]">
        Learning time combines recorded video, document and active workspace
        time; idle workspaces stop counting after 90 seconds. Browser activity
        may overlap and is not a verified attendance measure. Historical lab
        time starts from this update.
      </p>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
      {loading && <p>Loading tutor usage…</p>}
      <div className="overflow-x-auto panel">
        <table className="data-table min-w-[600px]">
          <thead>
            <tr>
              <th>Student</th>
              <th>Learning time</th>
              <th>AI questions / replies</th>
              <th>AI dependency indicator</th>
              <th>Report</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => {
              const row = summary(s.id);
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <small>{s.rollNumber || s.email}</small>
                  </td>
                  <td>{row.minutes} min</td>
                  <td>
                    {row.row
                      ? `${row.row.requests} / ${row.row.answered}`
                      : "—"}
                  </td>
                  <td>
                    {row.label}
                    {row.rate !== null && (
                      <small>{row.rate.toFixed(1)} replies/hour</small>
                    )}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setSelected(s.id);
                        setTab("overview");
                      }}
                    >
                      Open report
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!slice.length && <p>No students match this search.</p>}
      <div className="flex gap-3 items-center">
        <button
          className="secondary-button"
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous students
        </button>
        <span>Page {page + 1}</span>
        <button
          className="secondary-button"
          disabled={(page + 1) * 50 >= filtered.length}
          onClick={() => setPage((p) => p + 1)}
        >
          Next students
        </button>
      </div>
      {person && info && (
        <section className="panel p-4 space-y-4 min-w-0">
          <h3 className="text-lg font-semibold">
            {person.name} · Individual report
          </h3>
          <div
            className="flex flex-wrap gap-2"
            role="tablist"
            aria-label="Student report"
          >
            <button
              role="tab"
              aria-selected={tab === "overview"}
              className="secondary-button"
              onClick={() => setTab("overview")}
            >
              Overview
            </button>
            <button
              role="tab"
              aria-selected={tab === "chats"}
              className="secondary-button"
              onClick={() => setTab("chats")}
            >
              Chat history
            </button>
            <button
              role="tab"
              aria-selected={tab === "ide"}
              className="secondary-button"
              onClick={() => setTab("ide")}
            >
              IDE activity
            </button>
          </div>
          {tab === "ide" ? (
            <StudentIdeHistory
              key={person.id}
              token={session.token}
              studentId={person.id}
            />
          ) : tab === "chats" ? (
            <TutorHistory
              key={person.id}
              token={session.token}
              studentId={person.id}
            />
          ) : (
            <div className="space-y-2">
              <p>Tracked learning: {info.minutes} minutes</p>
              <p>AI dependency indicator: {info.label}</p>
              <p>
                Tutor questions: {info.row?.requests ?? "Unavailable"} ·
                Answered: {info.row?.answered ?? "Unavailable"} · Provider
                failures: {info.row?.failed ?? "Unavailable"}
              </p>
              <p className="text-sm text-[var(--muted)]">
                Review the student's reasoning, attempts and chat context before
                drawing conclusions. Frequent help-seeking can be productive.
              </p>
            </div>
          )}
        </section>
      )}
    </section>
  );
}
