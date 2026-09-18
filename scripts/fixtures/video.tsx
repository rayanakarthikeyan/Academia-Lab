import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { ResourceViewer } from "../../src/components/ResourceViewer";
import { logActivity } from "../../src/platform/api";
import "../../src/styles.css";
const user = {
  id: "video-student",
  name: "Video Student",
  email: "video@example.invalid",
  role: "student" as const,
};
function Fixture() {
  const [show, setShow] = useState(true);
  const [revision, setRevision] = useState(0);
  return (
    <>
      <button onClick={() => setShow((v) => !v)}>Toggle resource</button>
      <button onClick={() => setRevision((v) => v + 1)}>
        Rerender {revision}
      </button>
      {show && (
        <ResourceViewer
          user={user}
          session={{ user, token: "video-test" }}
          theme="light"
          resources={[
            {
              id: "video-resource",
              courseId: "course-java",
              courseCode: "JAVA",
              unitNumber: 1,
              title: "Video lesson test",
              topic: "Java",
              type: "youtube",
              externalUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
              durationMinutes: 5,
              dueDate: "",
              practiceQuestions: [],
            },
          ]}
          onEvent={(event) => {
            void logActivity("video-test", event);
          }}
        />
      )}
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Fixture />
  </StrictMode>,
);
