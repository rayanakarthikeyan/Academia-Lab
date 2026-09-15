import { createRoot } from "react-dom/client";
import { LearningStudio } from "../../src/components/LearningStudio";
import { TesterActivity } from "../../src/components/TesterActivity";
import { logActivity } from "../../src/platform/api";
import "../../src/styles.css";
const session = {
  token: "test",
  user: {
    id: "tester-fixture",
    role: "student" as const,
    name: "Tester",
    email: "tester@example.invalid",
    isTester: true,
  },
};
createRoot(document.getElementById("root")!).render(
  location.search.includes("faculty=1") ? (
    <TesterActivity token="faculty-test" assignments={[]} />
  ) : (
    <LearningStudio
      session={session}
      theme="light"
      onEvent={(event) => void logActivity(session.token, event)}
    />
  ),
);
