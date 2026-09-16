import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EditorProps } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";

const LocalCodeEditor = lazy(() => import("./LocalCodeEditor"));

export default function CodeEditor(props: EditorProps) {
  const instance = useRef<editor.IStandaloneCodeEditor | null>(null);
  const listener = useRef<IDisposable | null>(null);
  const [position, setPosition] = useState({ lineNumber: 1, column: 1 });
  const [wrap, setWrap] = useState(true);
  useEffect(() => () => listener.current?.dispose(), []);
  const language = props.language || "text";
  return (
    <section
      className="min-w-0 overflow-hidden border-y border-[var(--line)]"
      aria-label={`${language} code editor`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--surface-2)] px-3 py-2 text-xs">
        <span className="font-mono font-semibold">
          &lt;/&gt; {language.toUpperCase()} · Source
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-2 py-1 rounded border border-[var(--line)]"
            onClick={() => instance.current?.getAction("actions.find")?.run()}
          >
            Find
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded border border-[var(--line)]"
            aria-pressed={wrap}
            onClick={() => setWrap((v) => !v)}
          >
            Wrap {wrap ? "on" : "off"}
          </button>
        </div>
      </div>
      <Suspense
        fallback={
          <div
            className="grid place-items-center"
            style={{ height: props.height || 430 }}
          >
            Loading editor…
          </div>
        }
      >
        <LocalCodeEditor
          {...props}
          theme={
            props.theme ||
            (document.documentElement.classList.contains("dark")
              ? "vs-dark"
              : "light")
          }
          options={{
            fontFamily: 'Consolas, "Courier New", monospace',
            fontSize: 14,
            lineHeight: 22,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            glyphMargin: false,
            tabSize: 4,
            insertSpaces: true,
            autoIndent: "full",
            matchBrackets: "always",
            renderLineHighlight: "all",
            renderWhitespace: "selection",
            guides: { indentation: true, bracketPairs: true },
            bracketPairColorization: { enabled: true },
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            ...props.options,
            wordWrap: wrap ? "on" : "off",
          }}
          onMount={(editor, monaco) => {
            instance.current = editor;
            listener.current?.dispose();
            listener.current = editor.onDidChangeCursorPosition((e) =>
              setPosition(e.position),
            );
            props.onMount?.(editor, monaco);
          }}
        />
      </Suspense>
      <div
        className="flex flex-wrap justify-between gap-2 px-3 py-1.5 bg-[var(--surface-2)] text-[11px] font-mono text-[var(--muted)]"
        aria-live="off"
      >
        <span>
          Ln {position.lineNumber}, Col {position.column}
        </span>
        <span>
          Spaces: 4 · UTF-8 ·{" "}
          {props.options?.readOnly ? "Read only" : "Editable"}
        </span>
      </div>
    </section>
  );
}
