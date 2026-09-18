import { useEffect, useRef } from "react";
import type { ActivityLog } from "../platform/types";

export function useLearningTime(
  enabled: boolean,
  identity: { userId: string; courseId: string; assignmentId: string },
  onEvent: (event: ActivityLog) => void,
) {
  const callback = useRef(onEvent);
  callback.current = onEvent;
  useEffect(() => {
    if (!enabled) return;
    let lastInput = Date.now(),
      lastTick = Date.now(),
      seconds = 0;
    const touch = () => {
      lastInput = Date.now();
    };
    const flush = () => {
      if (seconds < 1) return;
      callback.current({
        ...identity,
        kind: "editor_change",
        durationSeconds: Math.floor(seconds),
        metadata: { activity: "active_learning", changes: 0 },
      });
      seconds = 0;
    };
    const timer = setInterval(() => {
      const now = Date.now(),
        elapsed = Math.min(5, (now - lastTick) / 1000);
      lastTick = now;
      if (!document.hidden && document.hasFocus() && now - lastInput < 90000)
        seconds += elapsed;
      if (seconds >= 30) flush();
    }, 5000);
    for (const event of ["pointerdown", "keydown", "scroll"])
      window.addEventListener(event, touch, { passive: true });
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(timer);
      flush();
      window.removeEventListener("pagehide", flush);
      for (const event of ["pointerdown", "keydown", "scroll"])
        window.removeEventListener(event, touch);
    };
  }, [enabled, identity.userId, identity.courseId, identity.assignmentId]);
}
