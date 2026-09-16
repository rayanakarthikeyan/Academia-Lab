import { useEffect, useRef, useState } from "react";
import { runCode } from "../../platform/api";
import { sourceDigest } from "../../platform/run-evidence";
import type { LabEvent } from "./lab-utils";
import Editor from "../CodeEditor";
export function SqlExercise({
  initialSql,
  onEvent,
}: {
  initialSql: string;
  onEvent: LabEvent;
}) {
  const [sql, setSql] = useState(initialSql),
    [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false),
    [phase, setPhase] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  return (
    <details className="mt-4 rounded-xl border border-[var(--line)] p-4" open>
      <summary className="font-semibold">
        Execute your schema · PostgreSQL
      </summary>
      <p className="text-xs my-2">
        The editor is independent of the design above. Regenerate after changing
        your design. Each run uses a fresh browser database.
      </p>
      <button
        className="secondary-button mb-2"
        disabled={busy}
        onClick={() => {
          setSql(initialSql);
          setOutput("");
        }}
      >
        Regenerate SQL from design
      </button>
      <Editor
        height="320px"
        language="sql"
        value={sql}
        options={{ readOnly: busy, ariaLabel: "Design SQL" }}
        onChange={(value) => setSql((value || "").slice(0, 100000))}
      />
      <div className="flex flex-wrap gap-2 mt-3">
        <button
          className="primary-button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            controller.current = new AbortController();
            try {
              const result = await runCode(
                "",
                {
                  language: "sql",
                  sqlEngine: "postgres",
                  code: sql,
                  stdin: "",
                },
                { signal: controller.current.signal, onProgress: setPhase },
              );
              setOutput(result.stdout + "\n" + result.stderr);
              onEvent("design_sql_run", {
                source: sql.slice(0, 5000),
                output: result.stdout.slice(0, 4000),
                status: result.status,
                runtime: "postgres",
                durationMs: result.durationMs,
                sourceDigest: await sourceDigest(sql),
                error: result.stderr.slice(0, 1500),
              });
            } catch (e) {
              setOutput(String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Run design SQL
        </button>
        {busy && (
          <button
            className="secondary-button"
            onClick={() => controller.current?.abort()}
          >
            Stop SQL
          </button>
        )}
      </div>
      {busy && <p role="status">{phase}</p>}
      <pre
        aria-label="Design SQL output"
        className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-sm"
      >
        {output}
      </pre>
    </details>
  );
}
