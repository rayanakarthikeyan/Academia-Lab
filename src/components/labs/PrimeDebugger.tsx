import { useEffect, useRef, useState } from "react";
import Editor from "../CodeEditor";
import { runCode } from "../../platform/api";
import { sourceDigest } from "../../platform/run-evidence";
import type { LabEvent } from "./lab-utils";

export const primeDebugSource = `import java.util.Scanner;
public class PrimeDebugger {
  static void trace(String stage, int n, int candidate, int divisor, boolean prime) {
    System.out.println("@trace|" + stage + "|" + n + "|" + candidate + "|" + divisor + "|" + prime);
    AsterDebug.pause(stage, n, candidate, divisor, prime);
  }
  public static void main(String[] args) {
    int n = new Scanner(System.in).nextInt();
    if (n < 1 || n > 200) throw new IllegalArgumentException("Use a limit from 1 to 200");
    for (int candidate = 2; candidate <= n; candidate++) {
      boolean prime = true;
      int divisor = 2;
      trace("candidate", n, candidate, divisor, prime);
      while (divisor * divisor <= candidate) {
        trace("compare", n, candidate, divisor, prime);
        if (candidate % divisor == 0) {
          prime = false;
          trace("composite", n, candidate, divisor, prime);
          break;
        }
        divisor++;
      }
      trace("decision", n, candidate, divisor, prime);
      if (prime) System.out.println(candidate);
    }
  }
}`;
type Snapshot = {
  stage: string;
  n: number;
  candidate: number;
  divisor: number;
  prime: boolean;
};
export function PrimeDebugger({
  onEvent,
  theme,
}: {
  onEvent: LabEvent;
  theme: "light" | "dark";
}) {
  const [code, setCode] = useState(primeDebugSource);
  const [input, setInput] = useState("20");
  const [trace, setTrace] = useState<Snapshot[]>([]);
  const [position, setPosition] = useState(0);
  const [breakpoint, setBreakpoint] = useState("composite");
  const [output, setOutput] = useState("");
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");
  const [recorded, setRecorded] = useState("");
  const [prediction, setPrediction] = useState("");
  const [feedback, setFeedback] = useState("");
  const controller = useRef<AbortController | null>(null);
  const resume = useRef<(() => void) | null>(null);
  const continuing = useRef<string | null>(null);
  const liveTrace = useRef<Snapshot[]>([]);
  const [paused, setPaused] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  const snapshot = trace[position];
  const stale = recorded !== code + "\0" + input;
  async function record() {
    controller.current = new AbortController();
    setBusy(true);
    setTrace([]);
    setFeedback("");
    setRecorded(code + "\0" + input);
    liveTrace.current = [];
    continuing.current = null;
    resume.current = null;
    setPaused(false);
    try {
      const result = await runCode(
        "",
        { language: "java", code, stdin: input },
        {
          signal: controller.current.signal,
          onProgress: setPhase,
          debug: true,
          onDebugSnapshot: (snapshot, advance) => {
            if (liveTrace.current.length >= 3000) {
              controller.current?.abort();
              return;
            }
            liveTrace.current.push(snapshot);
            if (continuing.current && continuing.current !== snapshot.stage) {
              advance();
              return;
            }
            continuing.current = null;
            resume.current = advance;
            setTrace([...liveTrace.current]);
            setPosition(liveTrace.current.length - 1);
            setPaused(true);
            setPhase("Paused at " + snapshot.stage);
            onEvent("debug_pause", {
              ...snapshot,
              position: liveTrace.current.length - 1,
            });
          },
        },
      );
      const snapshots: Snapshot[] = [];
      const lines = result.stdout.split("\n").filter((line) => {
        if (!line.startsWith("@trace|")) return true;
        const [, stage, n, candidate, divisor, prime] = line.split("|");
        if (
          snapshots.length < 3000 &&
          [n, candidate, divisor].every((value) =>
            Number.isFinite(Number(value)),
          )
        )
          snapshots.push({
            stage,
            n: Number(n),
            candidate: Number(candidate),
            divisor: Number(divisor),
            prime: prime === "true",
          });
        return false;
      });
      setTrace(snapshots.length ? snapshots : [...liveTrace.current]);
      setPosition(0);
      setRecorded(code + "\0" + input);
      setOutput(
        lines.join("\n").trim() + (result.stderr ? "\n" + result.stderr : ""),
      );
      onEvent("debug_record", {
        status: result.status,
        snapshots: snapshots.length,
        durationMs: result.durationMs,
        sourceDigest: await sourceDigest(code),
        inputDigest: await sourceDigest(input),
      });
    } catch (error) {
      setOutput(String(error));
    } finally {
      setBusy(false);
      setPaused(false);
      resume.current = null;
    }
  }
  function step(next: number, action: string) {
    setPosition(next);
    setFeedback("");
    onEvent(action, {
      position: next,
      stage: trace[next]?.stage,
      candidate: trace[next]?.candidate,
    });
  }
  return (
    <section className="panel p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-semibold">
        Prime investigation · live Java debugger
      </h2>
      <p className="text-sm text-[var(--muted)]">
        Edit the Java program and supply a limit. The JVM pauses at trace calls:
        Step resumes to the next checkpoint, and Continue runs to your chosen
        breakpoint. Inspect the actual variables, then review the recorded trace
        after execution. This guided debugger supports one thread and explicit
        checkpoints; add trace calls where you need to inspect the prime
        algorithm. Sessions are limited to five minutes.
      </p>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
        <div className="min-w-0">
          <Editor
            height="440px"
            language="java"
            value={code}
            onChange={(value) => setCode(value || "")}
            theme={theme === "dark" ? "vs-dark" : "light"}
            options={{
              readOnly: busy,
              minimap: { enabled: false },
              wordWrap: "on",
              automaticLayout: true,
            }}
          />
          <label className="block mt-3">
            Prime limit
            <input
              aria-label="Prime limit"
              className="input-field"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={busy}
            />
          </label>
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void record()}
            >
              Start Java debugger
            </button>
            {busy && (
              <button
                className="secondary-button"
                onClick={() => controller.current?.abort()}
              >
                Stop
              </button>
            )}
            <button
              className="secondary-button"
              disabled={busy}
              onClick={() => {
                setCode(primeDebugSource);
                setTrace([]);
              }}
            >
              Reset example
            </button>
          </div>
          {busy && <p role="status">{phase}</p>}
        </div>
        <aside className="min-w-0 space-y-3">
          <h3 className="font-semibold">Variables and checkpoints</h3>
          {trace.length > 0 && stale && (
            <p role="status">
              Code or input changed. Record again to inspect the current
              program.
            </p>
          )}
          <label className="block">
            Breakpoint
            <select
              aria-label="Breakpoint"
              className="input-field"
              value={breakpoint}
              onChange={(event) => setBreakpoint(event.target.value)}
            >
              {[
                ...new Set([
                  "candidate",
                  "compare",
                  "composite",
                  "decision",
                  ...trace.map((s) => s.stage),
                ]),
              ].map((stage) => (
                <option key={stage}>{stage}</option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="secondary-button"
              disabled={busy || stale || position === 0}
              onClick={() => step(position - 1, "debug_previous")}
            >
              Previous
            </button>
            <button
              className="secondary-button"
              disabled={
                stale ||
                !snapshot ||
                (busy ? !paused : position === trace.length - 1)
              }
              onClick={() => {
                if (busy) {
                  setPaused(false);
                  setPhase("Running to next checkpoint…");
                  onEvent("debug_step", { position });
                  resume.current?.();
                  resume.current = null;
                } else step(position + 1, "debug_step");
              }}
            >
              Step
            </button>
            <button
              className="secondary-button"
              disabled={stale || !snapshot || (busy && !paused)}
              onClick={() => {
                if (busy) {
                  continuing.current = breakpoint;
                  setPaused(false);
                  setPhase("Running to breakpoint…");
                  onEvent("debug_continue", { breakpoint });
                  resume.current?.();
                  resume.current = null;
                  return;
                }
                const next = trace.findIndex(
                  (s, i) => i > position && s.stage === breakpoint,
                );
                step(next < 0 ? trace.length - 1 : next, "debug_continue");
              }}
            >
              Continue to breakpoint
            </button>
            {busy && (
              <button
                className="secondary-button"
                disabled={!paused}
                onClick={() => {
                  continuing.current = "__finish__";
                  setPaused(false);
                  setPhase("Running to completion…");
                  onEvent("debug_finish");
                  resume.current?.();
                  resume.current = null;
                }}
              >
                Run to end
              </button>
            )}
          </div>
          {snapshot && (
            <>
              <p>
                Checkpoint {position + 1} / {trace.length}:{" "}
                <strong>{snapshot.stage}</strong>
              </p>
              <dl className="grid grid-cols-2 gap-2">
                {Object.entries(snapshot)
                  .filter(([key]) => key !== "stage")
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg bg-[var(--surface-2)] p-3"
                    >
                      <dt>{key}</dt>
                      <dd className="font-mono font-bold">{String(value)}</dd>
                    </div>
                  ))}
              </dl>
              <p className="text-sm">
                Predict: is the current candidate prime?
              </p>
              <select
                aria-label="Prime prediction"
                className="input-field"
                value={prediction}
                onChange={(event) => setPrediction(event.target.value)}
              >
                <option value="">Choose</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
              <button
                className="secondary-button"
                disabled={!prediction || stale}
                onClick={() => {
                  const n = snapshot.candidate;
                  const correct =
                    n >= 2 &&
                    !Array.from(
                      { length: Math.max(0, Math.floor(Math.sqrt(n)) - 1) },
                      (_, i) => i + 2,
                    ).some((d) => n % d === 0);
                  const matched = (prediction === "yes") === correct;
                  setFeedback(
                    matched
                      ? "Correct. Follow the comparisons to explain why."
                      : "Try again. Look for a divisor up to the square root.",
                  );
                  onEvent("debug_prediction", { candidate: n, matched });
                }}
              >
                Check prediction
              </button>
            </>
          )}
          <p role="status">{feedback}</p>
          <h3 className="font-semibold">Program output</h3>
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-[var(--surface-2)] p-3 max-h-64 overflow-auto">
            {output || "Record a run to see its output."}
          </pre>
        </aside>
      </div>
    </section>
  );
}
