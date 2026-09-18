import { createRoot } from "react-dom/client";
import { TutorInsights } from "../../src/components/TutorInsights";
import { AiTutor } from "../../src/components/AiTutor";
import "../../src/styles.css";
const student = {
  id: "student-test",
  name: "Asha Rao",
  email: "asha@example.invalid",
  role: "student" as const,
};
const session = { token: "test", user: student };
createRoot(document.getElementById("root")!).render(
  location.search.includes("faculty") ? (
    <TutorInsights
      session={{ ...session, user: { ...student, role: "faculty" } }}
      students={[
        student,
        { ...student, id: "tester", name: "Tester", isTester: true },
      ]}
      activities={[
        { user_id: student.id, kind: "editor_change", duration_seconds: 3600 },
      ]}
    />
  ) : (
    <AiTutor
      session={session}
      context={{ kind: "resource", id: "resource-test" }}
    />
  ),
);
