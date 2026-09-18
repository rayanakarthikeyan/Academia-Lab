import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ResourcePractice } from "../../src/components/ResourcePractice";
import { AssignmentWorkspace } from "../../src/components/CourseworkManager";
import { FacultyResourceManager } from "../../src/components/FacultyResourceManager";
import { FacultyLabWorkspace } from "../../src/components/FacultyLabWorkspace";
import { FacultyInteractiveLabs } from "../../src/components/FacultyInteractiveLabs";
import { visualStarter } from "../../src/platform/visual-labs";
import type { AuthSession, LearningResource } from "../../src/platform/types";
import "../../src/styles.css";
import { logActivity } from "../../src/platform/api";
const session: AuthSession = {
  token: "test",
  user: {
    id: "student-test",
    name: "Student",
    email: "student@example.invalid",
    role: "student",
  },
};
const resource: LearningResource = {
  id: "resource-test",
  courseId: "course-java",
  title: "Study",
  topic: "Basics",
  type: "pdf",
  externalUrl: "https://example.invalid/study.pdf",
  durationMinutes: 10,
  completion: 0,
  activeLearners: 0,
  publishedAt: "",
  curriculumItemId: "java-theory-1",
  courseCode: "JAVA",
  unitNumber: 1,
  dueDate: "",
  assignedUserIds: [],
  practiceQuestions: [
    {
      id: "sql",
      language: "sql",
      title: "SQL sum",
      prompt: "Compute a sum",
      input: "",
      starterCode: "SELECT 2 + 3 AS total;",
      expectedOutput: "5",
    },
    {
      id: "java",
      language: "java",
      title: "Java input",
      prompt: "Read an integer",
      input: "4",
      starterCode:
        "import java.util.Scanner; public class Main { public static void main(String[] args) { System.out.println(new Scanner(System.in).nextInt() * 2); } }",
      expectedOutput: "8",
    },
    {
      id: "visual",
      language: "visual",
      title: "Traffic signal",
      prompt: "Switch the signal",
      input: "",
      starterCode: visualStarter,
      expectedOutput: "The selected lamp lights up",
    },
  ],
};
function Harness() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  if (location.hash === "#assigned-lab")
    return (
      <AssignmentWorkspace
        session={session}
        theme="light"
        onEvent={(e) => void logActivity(session.token, e)}
        onBack={() => undefined}
        onSaved={() => undefined}
        assignment={{
          id: "assigned-java-16",
          interactive_enabled: !location.search.includes("disabled=1"),
          curriculum_item_id: "java-lab-16",
          title: "Assigned traffic signal experiment",
          description: "Select the signal and explain your observations.",
          course_code: "JAVA",
          unit_number: 4,
          starter_code: "// Explain the traffic signal behavior",
          assignment_type: "lab",
          work_mode: "ide",
          execution_environment: "external",
          subject_id: "java-subject",
          due_date: "2099-12-31",
          max_marks: 10,
          assigned_user_ids: [],
          assigned: 1,
          submitted: 0,
          pending: 1,
          reviewed: 0,
          questions: [],
          hints: [],
          test_cases: [],
          duration_minutes: 60,
        }}
      />
    );
  if (location.hash === "#faculty")
    return (
      <FacultyResourceManager
        token="test"
        resources={resources}
        onChange={setResources}
      />
    );
  if (location.hash === "#labs")
    return (
      <FacultyLabWorkspace
        session={{ ...session, user: { ...session.user, role: "faculty" } }}
      />
    );
  if (location.hash === "#interactive")
    return (
      <FacultyInteractiveLabs
        session={{ ...session, user: { ...session.user, role: "faculty" } }}
        theme="light"
      />
    );
  return (
    <ResourcePractice
      resource={resource}
      session={session}
      theme="light"
      onEvent={(event) => {
        if (location.search.includes("telemetry=1"))
          void logActivity(session.token, event);
      }}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
