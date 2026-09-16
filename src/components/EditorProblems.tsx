import { useEffect, useMemo, useRef, useState } from "react";
import type { editor } from "monaco-editor";
import { runJavaInBrowser } from "../platform/java-browser";
import {
  compilerProblems,
  structuralProblems,
} from "../platform/editor-diagnostics";
type Monaco = typeof import("monaco-editor");
export function EditorProblems({
  source,
  language,
  revision,
  readOnly,
  debug,
  instance,
  monaco,
  runDiagnostics,
}: {
  source: string;
  language: string;
  revision: number;
  readOnly?: boolean;
  debug?: boolean;
  instance: editor.IStandaloneCodeEditor | null;
  monaco: Monaco | null;
  runDiagnostics?: { source: string; text: string };
}) {
  const [check, setCheck] = useState<{ source: string; text: string } | null>(
      null,
    ),
    [phase, setPhase] = useState(""),
    [manual, setManual] = useState(0);
  const completed = useRef("");
  useEffect(() => {
    if (language !== "java" || readOnly || (!revision && !manual)) return;
    const key = JSON.stringify([source, revision, manual, debug]);
    if (completed.current === key) return;
    const controller = new AbortController();
    let active = true;
    setPhase("Waiting for typing to pause…");
    const timer = setTimeout(() => {
      setPhase("Checking Java…");
      void runJavaInBrowser(source, "", {
        compileOnly: true,
        debug,
        signal: controller.signal,
        onProgress: (value) => {
          if (active) setPhase(value);
        },
      }).then((result) => {
        if (!active) return;
        completed.current = key;
        setCheck({ source, text: result.stderr });
        setPhase(
          result.status === "passed"
            ? "Java compilation passed. Runtime behavior is checked with Run."
            : "Java check returned errors; see Problems.",
        );
      });
    }, 1800);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [source, language, revision, manual, readOnly, debug]);
  const text =
    runDiagnostics?.source === source && runDiagnostics.text
      ? runDiagnostics.text
      : check?.source === source
        ? check.text
        : "";
  const problems = useMemo(() => {
    const actual = compilerProblems(text, source);
    return actual.length ? actual : structuralProblems(source, language);
  }, [text, source, language]);
  useEffect(() => {
    const model = instance?.getModel();
    if (!model || !monaco) return;
    monaco.editor.setModelMarkers(
      model,
      "lab-problems",
      problems.map((p) => {
        const line = Math.min(model.getLineCount(), Math.max(1, p.line));
        const col = Math.min(
          model.getLineMaxColumn(line),
          Math.max(1, p.column),
        );
        return {
          severity: monaco.MarkerSeverity.Error,
          message: p.message,
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: Math.min(model.getLineMaxColumn(line), col + 1),
        };
      }),
    );
    return () => {
      if (!model.isDisposed())
        monaco.editor.setModelMarkers(model, "lab-problems", []);
    };
  }, [problems, instance, monaco]);
  if (!["java", "sql"].includes(language)) return null;
  return (
    <section
      className="border-t border-[var(--line)] p-3 text-xs"
      aria-label="Editor problems"
    >
      <div className="flex flex-wrap justify-between gap-2">
        <strong>
          Problems · {problems.length}
          {text && !problems.length ? " · output message" : ""}
        </strong>
        {language === "java" && (
          <button
            type="button"
            className="text-cyan-600 underline"
            disabled={readOnly}
            onClick={() => setManual((n) => n + 1)}
          >
            Check Java
          </button>
        )}
      </div>
      <p className="mt-2 text-[var(--muted)]" role="status">
        {language === "java"
          ? phase ||
            "Java checks run after you edit and pause. Checking compiles only; it does not execute your program."
          : "Live checks cover quotes, comments and brackets. Run SQL for database syntax, schema and constraint errors."}
      </p>
      {problems.length > 0 && (
        <ul className="mt-2 max-h-40 overflow-auto space-y-2">
          {problems.map((problem, i) => (
            <li key={i}>
              <button
                type="button"
                className="text-left text-rose-600 break-words"
                onClick={() => {
                  const model = instance?.getModel();
                  if (!model) return;
                  const position = model.validatePosition({
                    lineNumber: problem.line,
                    column: problem.column,
                  });
                  instance?.setPosition(position);
                  instance?.revealLineInCenter(position.lineNumber);
                  instance?.focus();
                }}
              >
                Line {problem.line}: {problem.message}
              </button>
            </li>
          ))}
        </ul>
      )}
      {text && (
        <details className="mt-2" open>
          <summary className="cursor-pointer">
            Compiler / runtime error details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-words max-h-48 overflow-auto">
            {text}
          </pre>
        </details>
      )}
    </section>
  );
}
