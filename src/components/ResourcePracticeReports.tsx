import { useEffect, useState } from "react";
import { tutorRequest } from "./AiTutor";
import type { LearningRecord } from "../platform/types";
export function ResourcePracticeReports({
  token,
  resourceId,
  onClose,
}: {
  token: string;
  resourceId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<LearningRecord[]>([]);
  const [people, setPeople] = useState<
    { id: string; name: string; roll_number?: string }[]
  >([]);
  const [offset, setOffset] = useState(0),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    setOffset(0);
  }, [resourceId]);
  useEffect(() => {
    let active = true;
    setBusy(true);
    setRows([]);
    setError("");
    tutorRequest(
      token,
      `platform?entity=resource-practice&resourceId=${encodeURIComponent(resourceId)}&offset=${offset}`,
    )
      .then((data) => {
        if (active) {
          setRows(data.records);
          setPeople(data.people);
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
  }, [token, resourceId, offset, revision]);
  const render = (row: LearningRecord) => (
    <details key={row.id} className="border-t border-[var(--line)] py-3">
      <summary className="cursor-pointer">
        {people.find((p) => p.id === row.author_id)?.name || "Student"} ·{" "}
        {String(row.metadata.questionTitle || "Practice")} · Submitted{" "}
        {row.created_at ? new Date(row.created_at).toLocaleString() : "Saved"}
      </summary>
      <p className="mt-2 whitespace-pre-wrap">
        {String(row.metadata.prompt || "")}
      </p>
      <h4 className="mt-3 font-semibold">Submitted code</h4>
      <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">
        {row.body}
      </pre>
      <h4 className="mt-3 font-semibold">Student input</h4>
      <pre className="whitespace-pre-wrap break-words text-xs">
        {String(row.metadata.input || "No input")}
      </pre>
      <h4 className="mt-3 font-semibold">Student-reported output</h4>
      <pre className="whitespace-pre-wrap break-words text-xs">
        {String(row.metadata.output || "No run output")}
      </pre>
    </details>
  );
  return (
    <section
      className="panel p-5 space-y-3 min-w-0"
      aria-label="Resource practice submissions"
    >
      <div className="flex flex-wrap gap-3">
        <h3 className="font-semibold">Practice submissions · ungraded</h3>
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh submissions
        </button>
        <button className="secondary-button" onClick={onClose}>
          Close submissions
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {busy && <p>Loading submissions…</p>}
      {!busy && !rows.filter((r) => !r.metadata.isTester).length && (
        <p>No student submissions on this page.</p>
      )}
      {rows.filter((r) => !r.metadata.isTester).map(render)}
      {rows.some((r) => r.metadata.isTester) && (
        <details>
          <summary>Tester submissions · separate from students</summary>
          {rows.filter((r) => r.metadata.isTester).map(render)}
        </details>
      )}
      <div className="flex gap-2">
        <button
          className="secondary-button"
          disabled={busy || offset === 0}
          onClick={() => setOffset((v) => Math.max(0, v - 50))}
        >
          Newer submissions
        </button>
        <button
          className="secondary-button"
          disabled={busy || !more}
          onClick={() => setOffset((v) => v + 50)}
        >
          Older submissions
        </button>
      </div>
    </section>
  );
}
