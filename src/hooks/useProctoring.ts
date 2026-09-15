import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ActivityLog } from "../platform/types";

interface ProctoringOptions {
  userId: string;
  courseId: string;
  assessmentId?: string;
  assignmentId?: string;
  durationMinutes: number;
  maxViolations?: number;
  onEvent: (event: ActivityLog) => void;
  onAutoSubmit: () => void;
  completed?: boolean;
}

export function useProctoring({
  userId,
  courseId,
  assessmentId,
  assignmentId,
  durationMinutes,
  maxViolations = 2,
  onEvent,
  onAutoSubmit,
  completed = false,
}: ProctoringOptions) {
  const activityId = assessmentId || assignmentId || "assessment";
  const storageKey = `exam-${activityId}-${userId}`;
  const [started, setStarted] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    durationMinutes * 60,
  );
  const [violations, setViolations] = useState(0);
  const [warning, setWarning] = useState("");
  const lastViolationAt = useRef(0);
  const submittedRef = useRef(false);
  const deadlineRef = useRef<number | null>(null);
  const violationsRef = useRef(0);
  const completedRef = useRef(completed);
  completedRef.current = completed;
  const saveRecovery = useCallback(() => {
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          deadline: deadlineRef.current,
          violations: violationsRef.current,
        }),
      );
    } catch {
      /* Proctoring remains active when recovery storage is unavailable. */
    }
  }, [storageKey]);
  useEffect(() => {
    if (!completed) return;
    submittedRef.current = true;
    setStarted(false);
    setWarning("");
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Storage may be disabled. */
    }
  }, [completed, storageKey]);

  const emit = useCallback(
    (kind: ActivityLog["kind"], metadata: Record<string, unknown>) => {
      onEvent({ userId, courseId, assessmentId, assignmentId, kind, metadata });
    },
    [assessmentId, assignmentId, courseId, onEvent, userId],
  );

  const submitOnce = useCallback(() => {
    if (submittedRef.current || completedRef.current) return;
    submittedRef.current = true;
    onAutoSubmit();
  }, [onAutoSubmit]);

  const registerViolation = useCallback(
    (reason: string) => {
      const now = Date.now();
      if (
        !started ||
        completedRef.current ||
        submittedRef.current ||
        now - lastViolationAt.current < 1200
      )
        return;
      lastViolationAt.current = now;
      const next = violationsRef.current + 1;
      violationsRef.current = next;
      setViolations(next);
      setWarning(`${reason}. Violation ${next} of ${maxViolations}.`);
      emit("exam_violation", { reason, count: next });
      saveRecovery();
      if (next >= maxViolations) window.setTimeout(submitOnce, 100);
    },
    [emit, maxViolations, started, submitOnce, saveRecovery],
  );

  useEffect(() => {
    if (!started || completed) return;
    const onVisibility = () => {
      if (document.hidden) registerViolation("Tab switch detected");
    };
    const onBlur = () => registerViolation("Exam window lost focus");
    const onFullscreen = () => {
      if (!document.fullscreenElement)
        registerViolation("Fullscreen mode exited");
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("blur", onBlur);
    };
  }, [registerViolation, started, completed]);

  useEffect(() => {
    if (!started || submittedRef.current || completed) return;
    let previousAutosave = -1;
    const timer = window.setInterval(() => {
      if (submittedRef.current || completedRef.current) return;
      const next = Math.max(
        0,
        Math.ceil(((deadlineRef.current || Date.now()) - Date.now()) / 1000),
      );
      setRemainingSeconds(next);
      if (next % 60 === 0 && next !== previousAutosave) {
        previousAutosave = next;
        saveRecovery();
        emit("exam_autosave", { remainingSeconds: next, violations });
      }
      if (next === 0) submitOnce();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    emit,
    started,
    storageKey,
    submitOnce,
    violations,
    completed,
    saveRecovery,
  ]);

  const begin = useCallback(async () => {
    if (completedRef.current || started) return;
    submittedRef.current = false;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(storageKey);
    } catch {
      /* Start without recovery if storage is unavailable. */
    }
    let deadline = Date.now() + durationMinutes * 60000;
    if (saved) {
      try {
        const state = JSON.parse(saved) as {
          remainingSeconds?: number;
          violations?: number;
          deadline?: number;
        };
        if (
          typeof state.deadline === "number" &&
          Number.isFinite(state.deadline)
        )
          deadline = Math.min(deadline, state.deadline);
        else if (
          typeof state.remainingSeconds === "number" &&
          Number.isFinite(state.remainingSeconds)
        )
          deadline = Math.min(
            deadline,
            Date.now() + Math.max(0, state.remainingSeconds) * 1000,
          );
        if (
          typeof state.violations === "number" &&
          Number.isFinite(state.violations)
        ) {
          violationsRef.current = Math.max(0, state.violations);
          setViolations(violationsRef.current);
        }
      } catch {
        /* Ignore malformed local recovery state. */
      }
    }
    deadlineRef.current = deadline;
    setRemainingSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    saveRecovery();
    setStarted(true);
    emit("exam_started", { durationMinutes, fullscreenRequested: true });
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      setWarning("Fullscreen could not be started. Keep this window focused.");
    }
    if (deadline <= Date.now() || violationsRef.current >= maxViolations)
      submitOnce();
  }, [
    durationMinutes,
    emit,
    storageKey,
    started,
    saveRecovery,
    maxViolations,
    submitOnce,
  ]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (remainingSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remainingSeconds]);

  return {
    started,
    begin,
    remainingSeconds,
    formattedTime,
    violations,
    warning,
    clearWarning: () => setWarning(""),
  };
}
