import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useProctoring } from "../../src/hooks/useProctoring";
function Harness() {
  const [completed, setCompleted] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState(0);
  const proctor = useProctoring({
    userId: "test",
    courseId: "test",
    assignmentId: "test",
    durationMinutes: 2,
    completed,
    onEvent: (event) => setEvents((current) => [...current, event.kind]),
    onAutoSubmit: () => {
      setSubmissions((current) => current + 1);
      setCompleted(true);
    },
  });
  return (
    <>
      <button onClick={proctor.begin}>Start</button>
      <button onClick={() => setCompleted(true)}>Complete</button>
      <output id="state">
        {JSON.stringify({
          started: proctor.started,
          violations: proctor.violations,
          remaining: proctor.remainingSeconds,
          submissions,
          events,
        })}
      </output>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Harness />
  </React.StrictMode>,
);
