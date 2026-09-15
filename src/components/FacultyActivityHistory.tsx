import { useCallback, useEffect, useState } from "react";
import { loadStudentActivity } from "../platform/api";
import type { AssignmentRecord } from "../platform/types";

export function FacultyActivityHistory({
  token,
  userId,
  assignments,
}: {
  token: string;
  userId: string;
  assignments: AssignmentRecord[];
}) {
  const [events, setEvents] = useState<
    Awaited<ReturnType<typeof loadStudentActivity>>
  >([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    setEvents([]);
    setError("");
    setLoading(true);
    void loadStudentActivity(token, userId)
      .then((rows) => {
        if (active) setEvents(rows);
      })
      .catch((caught) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : "Activity could not load",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, userId, revision]);
  return (
    <section className="mt-6 border-t border-[var(--line)] pt-4">
      <div className="flex justify-between items-center gap-2">
        <h4 className="text-sm font-semibold">Recent student activity</h4>
        <button
          type="button"
          className="secondary-button"
          disabled={loading}
          onClick={refresh}
        >
          Refresh activity
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Latest 100 records. Student-reported activity supports review; it is not
        a correctness grade or proof of misconduct.
      </p>
      {loading && <p className="mt-3 text-xs">Loading activity…</p>}
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-600">
          {error}
        </p>
      )}
      {!loading && !error && !events.length && (
        <p className="mt-3 text-xs">No synced activity yet.</p>
      )}
      <div className="max-h-80 overflow-y-auto">
        {events.map((event) => (
          <details
            key={event.id}
            className="border-b border-[var(--line)] py-3 text-xs"
          >
            <summary className="cursor-pointer">
              <strong>{event.kind.replaceAll("_", " ")}</strong> ·{" "}
              {new Date(event.occurred_at).toLocaleString()}
              <span className="block text-[var(--muted)]">
                {assignments.find((a) => a.id === event.assignment_id)?.title ||
                  (event.resource_id
                    ? "Resource practice / study"
                    : "Learning activity")}
              </span>
            </summary>
            {event.metadata.runType === "sample-check" ? (
              <p className="mt-2">
                Sample cases matched: {String(event.metadata.samplePassed)} /{" "}
                {String(event.metadata.sampleTotal)}
              </p>
            ) : event.kind === "code_run" ? (
              <p className="mt-2">
                {event.metadata.status === "passed"
                  ? "Execution completed; logic not graded."
                  : "Execution error or interrupted run."}
              </p>
            ) : null}
            {typeof event.metadata.changes === "number" && (
              <p>Edits in this batch: {event.metadata.changes}</p>
            )}
            {typeof event.metadata.runtime === "string" && (
              <p>Runtime: {event.metadata.runtime}</p>
            )}
            {typeof event.metadata.contextDigest === "string" && (
              <p className="mt-2 break-all">
                Runtime and files fingerprint: {event.metadata.contextDigest}
              </p>
            )}
            {typeof event.metadata.error === "string" &&
              event.metadata.error && (
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {event.metadata.error}
                </pre>
              )}
            {typeof event.metadata.sourceDigest === "string" && (
              <p className="mt-2 break-all">
                Source fingerprint: {event.metadata.sourceDigest}
              </p>
            )}
            {typeof event.metadata.clientOccurredAt === "string" && (
              <p className="mt-2">
                Device time: {event.metadata.clientOccurredAt}. Server receipt
                time is shown above.
              </p>
            )}
          </details>
        ))}
      </div>
    </section>
  );
}
