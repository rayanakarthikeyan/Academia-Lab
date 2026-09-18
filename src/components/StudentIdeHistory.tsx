import { useEffect, useState } from "react";
import { tutorRequest } from "./AiTutor";

type Event = {
  id: string;
  kind: string;
  occurred_at: string;
  assignment_id?: string;
  resource_id?: string;
  metadata: Record<string, unknown>;
};
export function StudentIdeHistory({
  token,
  studentId,
}: {
  token: string;
  studentId: string;
}) {
  const [rows, setRows] = useState<Event[]>([]);
  const [offset, setOffset] = useState(0);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setRows([]);
    setError("");
    tutorRequest(
      token,
      `platform?entity=activity&detail=1&userId=${encodeURIComponent(studentId)}&offset=${offset}`,
    )
      .then((data) => {
        if (active) {
          setRows(data.activity_logs || []);
          setMore(Boolean(data.hasMore));
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
  }, [token, studentId, offset, revision]);
  const events = rows.filter(
    (row) =>
      ["editor_paste", "editor_change", "code_run", "code_submit"].includes(
        row.kind,
      ) && row.metadata?.activity !== "active_learning",
  );
  return (
    <section className="space-y-3 min-w-0" aria-label="IDE activity report">
      <div className="flex flex-wrap gap-2 items-center">
        <h4 className="font-semibold">IDE activity</h4>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => setRevision((x) => x + 1)}
        >
          Refresh activity
        </button>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Recorded browser actions, newest first. Clipboard events do not identify
        the source or prove misconduct. Different code versions do not prove a
        changed approach; review the snapshots and student's explanation. A
        completed run does not prove correct logic. Activity may arrive later
        after an offline session; client timestamps are unverified.
      </p>
      {busy && <p>Loading activity…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && !events.length && (
        <p>No IDE activity on this page. Older activity may be available.</p>
      )}
      {events.map((row) => {
        const m = row.metadata || {};
        const label =
          row.kind === "editor_paste"
            ? "Pasted into editor"
            : row.kind === "editor_change"
              ? m.action === "code_copy"
                ? "Copied from editor"
                : m.afterError
                  ? "Edited after an error"
                  : "Code edited"
              : row.kind === "code_submit"
                ? "Work submitted"
                : m.runType === "sample-check"
                  ? "Sample check"
                  : m.status === "error" || m.status === "failed"
                    ? "Run failed"
                    : "Run completed";
        return (
          <article
            key={row.id}
            className="rounded-lg border border-[var(--line)] p-3 space-y-2 text-sm min-w-0"
          >
            <h5 className="font-semibold">{label}</h5>
            <p className="text-xs text-[var(--muted)]">
              Received {new Date(row.occurred_at).toLocaleString()} · Activity:{" "}
              {row.assignment_id ||
                row.resource_id ||
                String(m.challengeId || "Unlinked")}
            </p>
            {Boolean(m.clientOccurredAt) && (
              <p className="text-xs">
                Browser time: {String(m.clientOccurredAt)}
              </p>
            )}
            {m.characterCount != null && (
              <p>{Number(m.characterCount)} clipboard characters</p>
            )}
            {m.changes != null && (
              <p>
                {Number(m.changes)} edits · {Number(m.characterDelta || 0)}{" "}
                characters changed
              </p>
            )}
            {m.sourceChanged === true && (
              <p>
                Different code version from the previous run in this session.
              </p>
            )}
            {m.recoveredAfterError === true && (
              <p>Run completed after an earlier failure.</p>
            )}
            {m.editsSincePreviousRun != null && (
              <p>
                {Number(m.editsSincePreviousRun)} edits since the previous run
              </p>
            )}
            {m.runType === "sample-check" && (
              <p>
                Sample cases matched: {Number(m.samplePassed || 0)} /{" "}
                {Number(m.sampleTotal || 0)}
              </p>
            )}
            {Boolean(m.error) && (
              <pre className="whitespace-pre-wrap break-words text-rose-600">
                {String(m.error)}
              </pre>
            )}
            {Boolean(m.sourceSnapshot) && (
              <details>
                <summary className="cursor-pointer">
                  Code at this run
                  {m.sourceTruncated ? " (first 3,000 characters)" : ""}
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs">
                  {String(m.sourceSnapshot)}
                </pre>
              </details>
            )}
            <details>
              <summary className="cursor-pointer text-xs">
                Recorded evidence
              </summary>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-all text-xs">
                {JSON.stringify(m, null, 2)}
              </pre>
            </details>
          </article>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button
          className="secondary-button"
          disabled={busy || offset === 0}
          onClick={() => setOffset((x) => Math.max(0, x - 100))}
        >
          Newer activity
        </button>
        <button
          className="secondary-button"
          disabled={busy || !more}
          onClick={() => setOffset((x) => x + 100)}
        >
          Older activity
        </button>
      </div>
    </section>
  );
}
