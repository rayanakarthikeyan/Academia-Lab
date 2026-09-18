import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import { FacultyResourceManager } from "../../src/components/FacultyResourceManager";
import { ResourcePractice } from "../../src/components/ResourcePractice";
import { loadStudentOverview } from "../../src/platform/api";
import type { LearningResource } from "../../src/platform/types";
import "../../src/styles.css";
function Fixture() {
  const student = location.search.includes("student");
  const [resources, setResources] = useState<LearningResource[]>([]);
  useEffect(() => {
    void loadStudentOverview(student ? "student" : "faculty").then((data) =>
      setResources(data.resources),
    );
  }, [student]);
  return student ? (
    resources[0] ? (
      <ResourcePractice
        resource={resources[0]}
        session={{
          token: "student",
          user: {
            id: "student-test",
            name: "Test Student",
            email: "student@example.invalid",
            role: "student",
          },
        }}
        theme="light"
        onEvent={() => undefined}
      />
    ) : (
      <p>No published resources</p>
    )
  ) : (
    <FacultyResourceManager
      token="faculty"
      resources={resources}
      onChange={setResources}
    />
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
