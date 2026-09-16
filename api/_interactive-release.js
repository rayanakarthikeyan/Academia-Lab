export function supportsInteractive(assignment) {
  return (
    assignment?.assignment_type === "lab" &&
    /^(java-lab-(1|10|16|17|18|19|20|21)|dbms-lab-(1|3))$/.test(
      assignment.curriculum_item_id || "",
    )
  );
}
export async function interactiveEnabled(db, id) {
  const { data, error } = await db
    .from("learning_records")
    .select("metadata")
    .eq("id", `interactive-release:${id}`)
    .eq("kind", "lab_release")
    .limit(1);
  if (error) throw error;
  return data?.[0]?.metadata?.enabled === true;
}
export async function setInteractiveRelease(db, actor, assignment, enabled) {
  const id = `interactive-release:${assignment.id}`;
  const { data: rows, error: readError } = await db
    .from("learning_records")
    .select("id")
    .eq("id", id)
    .limit(1);
  if (readError) throw readError;
  const payload = {
    kind: "lab_release",
    author_id: actor.id,
    assignment_id: assignment.id,
    title: "Interactive lab availability",
    body: "Faculty-controlled release after the manual lab",
    status: "active",
    metadata: { enabled },
    updated_at: new Date().toISOString(),
  };
  const { error } = await (rows?.length
    ? db.from("learning_records").update(payload).eq("id", id)
    : db.from("learning_records").insert({ id, ...payload }));
  if (error) throw error;
}
