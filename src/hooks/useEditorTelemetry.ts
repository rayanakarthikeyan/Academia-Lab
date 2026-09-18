import type { editor } from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityLog, AttemptEvent } from "../platform/types";

interface EditorTelemetryOptions {
  userId: string;
  courseId: string;
  challengeId: string;
  onEvent: (event: ActivityLog) => void;
}

function timelineEvent(
  type: AttemptEvent["type"],
  label: string,
  detail: string,
  severity: AttemptEvent["severity"],
): AttemptEvent {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    detail,
    severity,
    timestamp: new Date().toISOString(),
  };
}

export function useEditorTelemetry({
  userId,
  courseId,
  challengeId,
  onEvent,
}: EditorTelemetryOptions) {
  const [timeline, setTimeline] = useState<AttemptEvent[]>([]);
  const changes = useRef(0);
  const pasteCount = useRef(0);
  const lastError = useRef("");
  const lastValue = useRef("");
  const characterDelta = useRef(0);
  const pendingChanges = useRef(0);
  const previousRun = useRef<{ digest?: string; status: string } | null>(null);
  const editsAtRun = useRef(0);

  const log = useCallback(
    (kind: ActivityLog["kind"], metadata: Record<string, unknown>) => {
      onEvent({
        userId,
        courseId,
        assignmentId: challengeId,
        kind,
        metadata: { challengeId, ...metadata },
      });
    },
    [challengeId, courseId, onEvent, userId],
  );

  const flushEdits = useCallback(() => {
    if (!pendingChanges.current) return;
    log("editor_change", {
      changes: pendingChanges.current,
      characterDelta: characterDelta.current,
      afterError: Boolean(lastError.current),
    });
    pendingChanges.current = 0;
    characterDelta.current = 0;
  }, [log]);
  const flushRef = useRef(flushEdits);
  flushRef.current = flushEdits;
  useEffect(() => {
    const flush = () => flushRef.current();
    const timer = setInterval(flush, 5000);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const handleChange = useCallback(
    (value: string | undefined) => {
      const next = value || "";
      changes.current += 1;
      pendingChanges.current += 1;
      const before = lastValue.current;
      let start = 0;
      while (
        start < before.length &&
        start < next.length &&
        before[start] === next[start]
      )
        start++;
      let endBefore = before.length,
        endNext = next.length;
      while (
        endBefore > start &&
        endNext > start &&
        before[endBefore - 1] === next[endNext - 1]
      ) {
        endBefore--;
        endNext--;
      }
      const delta = endBefore - start + endNext - start;
      characterDelta.current += delta;
      lastValue.current = next;
      if (pendingChanges.current >= 25) flushEdits();
      if (lastError.current && changes.current % 10 === 0) {
        setTimeline((items) => [
          ...items.slice(-199),
          timelineEvent(
            "change",
            "Debugging edit",
            `Code changed after: ${lastError.current}`,
            "neutral",
          ),
        ]);
      }
    },
    [flushEdits],
  );

  const handleMount = useCallback(
    (instance: editor.IStandaloneCodeEditor) => {
      lastValue.current = instance.getValue();
      const node = instance.getDomNode();
      if (!node) return;
      const onPaste = (event: ClipboardEvent) => {
        const length = event.clipboardData?.getData("text").length || 0;
        pasteCount.current += 1;
        log("editor_paste", {
          pasteCount: pasteCount.current,
          characterCount: length,
        });
        setTimeline((items) => [
          ...items.slice(-199),
          timelineEvent(
            "paste",
            "Paste detected",
            `${length} characters inserted from clipboard`,
            "warning",
          ),
        ]);
      };
      node.addEventListener("paste", onPaste);
      const onCopy = () => {
        const selection = instance.getSelection();
        log("editor_change", {
          action: "code_copy",
          characterCount: selection
            ? instance.getModel()?.getValueInRange(selection).length || 0
            : 0,
        });
      };
      node.addEventListener("copy", onCopy);
      instance.onDidDispose(() => {
        node.removeEventListener("paste", onPaste);
        node.removeEventListener("copy", onCopy);
      });
    },
    [log],
  );

  const recordRun = useCallback(
    (result: {
      status: "passed" | "failed" | "error";
      stderr?: string;
      durationMs: number;
      sourceDigest?: string;
      inputDigest?: string;
      runtime?: string;
      contextDigest?: string;
    }) => {
      flushEdits();
      const error =
        result.status === "error" || result.status === "failed"
          ? result.stderr?.slice(0, 2000) ||
            (result.status === "failed"
              ? "Output did not match expected result"
              : "Execution failed")
          : "";
      log("code_run", {
        status: result.status,
        durationMs: result.durationMs,
        error,
        sourceDigest: result.sourceDigest,
        inputDigest: result.inputDigest,
        runtime: result.runtime,
        contextDigest: result.contextDigest,
        logicCheck: "not-checked",
        previousRunStatus: previousRun.current?.status,
        previousSourceDigest: previousRun.current?.digest,
        sourceChanged: Boolean(
          previousRun.current?.digest &&
          result.sourceDigest &&
          previousRun.current.digest !== result.sourceDigest,
        ),
        recoveredAfterError: Boolean(lastError.current && !error),
        editsSincePreviousRun: changes.current - editsAtRun.current,
        sourceSnapshot: lastValue.current.slice(0, 3000),
        sourceTruncated: lastValue.current.length > 3000,
      });
      previousRun.current = {
        digest: result.sourceDigest,
        status: result.status,
      };
      editsAtRun.current = changes.current;
      if (error) {
        lastError.current = error;
        setTimeline((items) => [
          ...items.slice(-199),
          timelineEvent("error", "Run failed", error, "error"),
        ]);
      } else {
        const wasDebugging = Boolean(lastError.current);
        lastError.current = "";
        setTimeline((items) => [
          ...items.slice(-199),
          timelineEvent(
            wasDebugging ? "resolved" : "run",
            wasDebugging ? "Error resolved" : "Run completed",
            `${result.durationMs} ms execution`,
            "success",
          ),
        ]);
      }
    },
    [log, flushEdits],
  );

  const recordSubmit = useCallback(() => {
    flushEdits();
    log("code_submit", {
      changes: changes.current,
      pasteCount: pasteCount.current,
      timelineLength: timeline.length,
    });
    setTimeline((items) => [
      ...items.slice(-199),
      timelineEvent(
        "submit",
        "Solution submitted",
        `${changes.current} edits, ${pasteCount.current} paste events`,
        "success",
      ),
    ]);
  }, [log, timeline.length, flushEdits]);

  return { timeline, handleChange, handleMount, recordRun, recordSubmit };
}
