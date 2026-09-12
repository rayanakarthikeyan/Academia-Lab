import { createRoot } from "react-dom/client";
import { useState } from "react";
import { ResourcePractice } from "../../src/components/ResourcePractice";
import { FacultyResourceManager } from "../../src/components/FacultyResourceManager";
import { FacultyLabWorkspace } from "../../src/components/FacultyLabWorkspace";
import { visualStarter } from "../../src/platform/visual-labs";
import type { AuthSession, LearningResource } from "../../src/platform/types";
import "../../src/styles.css";
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
  return (
    <ResourcePractice
      resource={resource}
      session={session}
      theme="light"
      onEvent={() => undefined}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
