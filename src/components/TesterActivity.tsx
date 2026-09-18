import { useEffect, useState } from "react";
import { FacultyActivityHistory } from "./FacultyActivityHistory";
import { TutorHistory } from "./TutorInsights";
import type { AssignmentRecord } from "../platform/types";
export function TesterActivity({
  token,
  assignments,
}: {
  token: string;
  assignments: AssignmentRecord[];
}) {
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/users?testers=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Tester accounts could not load");
        return r.json();
      })
      .then((data) => {
        if (active) setUsers(data.users || []);
      })
      .catch((e) => {
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [token]);
  return (
    <details className="panel p-4">
      <summary className="font-semibold cursor-pointer">
        Tester activity · separate from student roster
      </summary>
      <p className="mt-2 text-xs text-[var(--muted)]">
        Testing accounts do not appear in student lists or the student analytics
        below. Their activity remains available here for verification.
      </p>
      {error && <p role="alert">{error}</p>}
      {!error && !users.length && (
        <p className="mt-2 text-sm">No tester accounts.</p>
      )}
      {users.map((user) => (
        <section key={user.id} className="mt-4">
          <h3 className="font-semibold">{user.name} · Tester</h3>
          <FacultyActivityHistory
            token={token}
            userId={user.id}
            assignments={assignments}
          />
          <details className="mt-3">
            <summary>Tester tutor conversations</summary>
            <TutorHistory token={token} studentId={user.id} />
          </details>
        </section>
      ))}
    </details>
  );
}
