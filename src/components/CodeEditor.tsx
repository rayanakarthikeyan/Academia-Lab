import { lazy, Suspense } from "react";
import type { EditorProps } from "@monaco-editor/react";

const LocalCodeEditor = lazy(() => import("./LocalCodeEditor"));

export default function CodeEditor(props: EditorProps) {
  return (
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
      <LocalCodeEditor {...props} />
    </Suspense>
  );
}
