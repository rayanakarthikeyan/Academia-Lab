import { useEffect, useRef, useState } from "react";
import type { AuthSession } from "../platform/types";

export type TutorContext = {
  kind: "assignment" | "resource" | "draft";
  id: string;
  questionId?: string;
};
export type TutorRecord = {
  id: string;
  body: string;
  status: string;
  created_at?: string;
  metadata: {
    title?: string;
    answer?: string;
    role?: string;
    context?: Record<string, unknown>;
    work?: Record<string, unknown>;
  };
};
export async function tutorRequest(
  token: string,
  path: string,
  body?: unknown,
) {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || ""}/api/${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The tutor could not be reached.");
  return data;
}
export function TutorExchange({
  row,
  faculty = false,
}: {
  row: TutorRecord;
  faculty?: boolean;
}) {
  return (
    <article className="rounded-lg border border-[var(--line)] p-3 space-y-3 text-sm min-w-0">
      {faculty && (
        <p className="text-xs text-[var(--muted)]">
          {row.metadata.title || "Earlier conversation"} ·{" "}
          {row.created_at
            ? new Date(row.created_at).toLocaleString()
            : "Just now"}
        </p>
      )}
      <p className="whitespace-pre-wrap break-words">
        <strong>{row.metadata.role === "model" ? "Tutor" : "Student"}: </strong>
        {row.body}
      </p>
      {row.metadata.answer && (
        <p className="whitespace-pre-wrap break-words bg-[var(--surface-2)] rounded p-3">
          <strong>Tutor: </strong>
          {row.metadata.answer}
        </p>
      )}
      {row.status === "failed" && (
        <p className="text-amber-600">
          Provider unavailable; question saved without an answer.
        </p>
      )}
      {row.status === "pending" && (
        <p className="text-[var(--muted)]">
          No saved reply yet. Refresh to check its status.
        </p>
      )}
      {faculty && row.metadata.work && (
        <details>
          <summary className="cursor-pointer">
            Instructions and work shared with this question
          </summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-all text-xs">
            {JSON.stringify(
              {
                instructions: row.metadata.context,
                studentWork: row.metadata.work,
              },
              null,
              2,
            )}
          </pre>
        </details>
      )}
    </article>
  );
}
export function AiTutor({
  session,
  context,
  work = {},
}: {
  session: AuthSession;
  context: TutorContext;
  work?: Record<string, unknown>;
}) {
  const [open, setOpen] = useState(false),
    [records, setRecords] = useState<TutorRecord[]>([]),
    [message, setMessage] = useState(""),
    [excerpt, setExcerpt] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [more, setMore] = useState(false);
  const key = JSON.stringify(context),
    currentKey = useRef(key);
  currentKey.current = key;
  const latest = useRef(work);
  latest.current = work;
  const load = async (offset = 0) => {
    setBusy(true);
    setError("");
    try {
      const data = await tutorRequest(
        session.token,
        `ai-chat?${new URLSearchParams({ ...context, offset: String(offset) })}`,
      );
      if (currentKey.current === key) {
        setRecords((rows) =>
          offset ? [...rows, ...data.records] : data.records,
        );
        setMore(data.hasMore);
      }
    } catch (e) {
      if (currentKey.current === key) setError((e as Error).message);
    } finally {
      if (currentKey.current === key) setBusy(false);
    }
  };
  useEffect(() => {
    setRecords([]);
    setMessage("");
    setExcerpt("");
    setError("");
    if (open) void load();
  }, [key, session.token, open]);
  const send = async () => {
    if (!message.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await tutorRequest(session.token, "ai-chat", {
        context,
        message,
        work: { ...latest.current, excerpt },
      });
      if (currentKey.current === key) {
        setRecords((rows) => [data.record, ...rows]);
        setMessage("");
      }
    } catch (e) {
      if (currentKey.current === key) setError((e as Error).message);
    } finally {
      if (currentKey.current === key) setBusy(false);
    }
  };
  return (
    <section className="panel p-4 space-y-3 min-w-0" aria-label="AI Tutor">
      <button
        type="button"
        className="secondary-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        AI Tutor · {open ? "Close" : "Ask for guidance"}
      </button>
      {open && (
        <>
          <p className="text-sm">
            Hi {session.user.name.split(" ")[0]}, let’s work through this
            together.
          </p>
          <p className="text-xs text-[var(--muted)]">
            Your question, current work and instructions are shared with Gemini.
            Conversations and work snapshots are saved for faculty review. AI
            can make mistakes; verify its guidance.
          </p>
          {context.kind === "resource" && (
            <label className="block text-sm">
              Relevant passage from the resource
              <textarea
                className="input-field mt-2 w-full"
                maxLength={10000}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Paste the passage you need help with. The tutor cannot read the linked document or video automatically."
              />
            </label>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="space-y-2"
          >
            <label className="block text-sm">
              Your question
              <textarea
                className="input-field mt-2 w-full"
                maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Explain where you are stuck…"
                disabled={busy}
              />
            </label>
            <button
              className="primary-button"
              disabled={busy || !message.trim()}
            >
              {busy ? "Please wait…" : "Ask tutor"}
            </button>
            <button
              type="button"
              className="secondary-button ml-2"
              disabled={busy}
              onClick={() => void load()}
            >
              Refresh history
            </button>
          </form>
          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}
          <div
            className="max-h-[480px] overflow-auto space-y-3"
            aria-live="polite"
          >
            {records.map((row) => (
              <TutorExchange key={row.id} row={row} />
            ))}
          </div>
          {more && (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => void load(records.length)}
            >
              Load older messages
            </button>
          )}
        </>
      )}
    </section>
  );
}
