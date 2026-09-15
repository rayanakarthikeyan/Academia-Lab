import { useState } from "react";
import type { LabEvent } from "./lab-utils";
import { identifier, downloadText } from "./lab-utils";
import { SqlExercise } from "./SqlExercise";
type Entity = { name: string; attributes: string; primaryKey: string };
type Relation = {
  from: string;
  to: string;
  foreignKey: string;
  cardinality: "1:N" | "1:1";
};
export function erSql(entities: Entity[], relations: Relation[]) {
  const names = new Set(entities.map((e) => e.name));
  if (names.size !== entities.length)
    throw new Error("Entity names must be unique.");
  const columns = new Map<string, string[]>();
  const statements = entities.map((entity) => {
    const fields = entity.attributes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (
      !fields.length ||
      fields.length > 12 ||
      new Set(fields).size !== fields.length ||
      !fields.includes(entity.primaryKey)
    )
      throw new Error(
        `${entity.name}: include one primary key among unique attributes (up to 12).`,
      );
    columns.set(entity.name, fields);
    return `CREATE TABLE ${identifier(entity.name)} (${fields.map((field) => `${identifier(field)} TEXT${field === entity.primaryKey ? " PRIMARY KEY" : ""}`).join(", ")});`;
  });
  for (const [index, relation] of relations.entries()) {
    if (relation.from === relation.to)
      throw new Error(
        "This introductory challenge uses relationships between different entities.",
      );
    const parent = entities.find((e) => e.name === relation.from);
    if (!parent || !columns.get(relation.to)?.includes(relation.foreignKey))
      throw new Error(
        "Choose an existing parent, child and child foreign-key attribute.",
      );
    statements.push(
      `ALTER TABLE ${identifier(relation.to)} ADD CONSTRAINT fk_${index} FOREIGN KEY (${identifier(relation.foreignKey)}) REFERENCES ${identifier(parent.name)} (${identifier(parent.primaryKey)});`,
    );
    if (relation.cardinality === "1:1")
      statements.push(
        `ALTER TABLE ${identifier(relation.to)} ADD UNIQUE (${identifier(relation.foreignKey)});`,
      );
  }
  return (
    statements.join("\n") +
    "\nSELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position;"
  );
}
export function ErStudio({ onEvent }: { onEvent: LabEvent }) {
  const [entities, setEntities] = useState<Entity[]>([
    { name: "members", attributes: "member_id, name", primaryKey: "member_id" },
    { name: "books", attributes: "book_id, title", primaryKey: "book_id" },
  ]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [feedback, setFeedback] = useState("");
  const [sql, setSql] = useState("");
  function update(index: number, field: keyof Entity, value: string) {
    setEntities((current) =>
      current.map((entity, i) =>
        i === index ? { ...entity, [field]: value } : entity,
      ),
    );
    setSql("");
  }
  function validate() {
    try {
      const generated = erSql(entities, relations);
      setSql(generated);
      const hasLoan = entities.some(
        (e) =>
          e.name === "loans" &&
          ["loan_id", "member_id", "book_id"].every((name) =>
            e.attributes
              .split(",")
              .map((s) => s.trim())
              .includes(name),
          ) &&
          e.primaryKey === "loan_id",
      );
      const linked = ["members", "books"].every((name) =>
        relations.some(
          (r) =>
            r.from === name &&
            r.to === "loans" &&
            r.foreignKey === (name === "members" ? "member_id" : "book_id") &&
            r.cardinality === "1:N",
        ),
      );
      const complete = hasLoan && linked;
      setFeedback(
        complete
          ? "Library mission complete: loans connects members and books using two one-to-many relationships. Now run the SQL and explain why a direct many-to-many column would be insufficient."
          : "Your schema is valid. To complete the library mission, add loans(loan_id, member_id, book_id), then connect members → loans and books → loans as 1:N.",
      );
      onEvent("er_validation", {
        status: "passed",
        missionComplete: complete,
        entities,
        relations,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setFeedback(message);
      setSql("");
      onEvent("er_validation", { status: "error", error: message });
    }
  }
  return (
    <section className="panel p-4 sm:p-6 space-y-4">
      <h2 className="text-xl font-semibold">ER architect · Library mission</h2>
      <p className="text-sm text-[var(--muted)]">
        Build a library lending system. A member can borrow many books over
        time, and a book can appear in many loans. Model the borrowing event as
        an entity. This editor supports single-column keys and 1:1 / 1:N
        relationships; represent N:M using a junction entity.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-3 min-w-0">
          {entities.map((entity, i) => (
            <fieldset
              key={i}
              className="rounded-xl border border-[var(--line)] p-3 grid gap-2"
            >
              <legend>Entity {i + 1}</legend>
              <label>
                Name
                <input
                  aria-label={`Entity ${i + 1} name`}
                  className="input-field"
                  maxLength={31}
                  value={entity.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                />
              </label>
              <label>
                Attributes, comma separated
                <input
                  aria-label={`Entity ${i + 1} attributes`}
                  className="input-field"
                  maxLength={300}
                  value={entity.attributes}
                  onChange={(e) => update(i, "attributes", e.target.value)}
                />
              </label>
              <label>
                Primary key
                <input
                  aria-label={`Entity ${i + 1} primary key`}
                  className="input-field"
                  maxLength={31}
                  value={entity.primaryKey}
                  onChange={(e) => update(i, "primaryKey", e.target.value)}
                />
              </label>
              <button
                className="secondary-button"
                onClick={() => {
                  setEntities(entities.filter((_, j) => j !== i));
                  setRelations(
                    relations.filter(
                      (r) => r.from !== entity.name && r.to !== entity.name,
                    ),
                  );
                  setSql("");
                }}
              >
                Remove entity {i + 1}
              </button>
            </fieldset>
          ))}
          <button
            className="secondary-button"
            disabled={entities.length >= 8}
            onClick={() => {
              setEntities([
                ...entities,
                {
                  name: "entity" + (entities.length + 1),
                  attributes: "id",
                  primaryKey: "id",
                },
              ]);
              setSql("");
            }}
          >
            Add entity
          </button>
          {relations.map((r, i) => (
            <fieldset
              key={i}
              className="rounded-xl border border-[var(--line)] p-3 space-y-2"
            >
              <legend>Relationship {i + 1}</legend>
              {(["from", "to"] as const).map((field) => (
                <label className="block" key={field}>
                  {field === "from" ? "Parent entity (one)" : "Child entity"}
                  <select
                    aria-label={`Relationship ${i + 1} ${field}`}
                    className="input-field"
                    value={r[field]}
                    onChange={(e) => {
                      setRelations(
                        relations.map((row, j) =>
                          j === i ? { ...row, [field]: e.target.value } : row,
                        ),
                      );
                      setSql("");
                    }}
                  >
                    <option value="">Choose</option>
                    {entities.map((entity, k) => (
                      <option value={entity.name} key={k}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label>
                Child foreign key
                <input
                  aria-label={`Relationship ${i + 1} foreign key`}
                  className="input-field"
                  value={r.foreignKey}
                  maxLength={31}
                  onChange={(e) => {
                    setRelations(
                      relations.map((row, j) =>
                        j === i ? { ...row, foreignKey: e.target.value } : row,
                      ),
                    );
                    setSql("");
                  }}
                />
              </label>
              <label>
                Cardinality
                <select
                  aria-label={`Relationship ${i + 1} cardinality`}
                  className="input-field"
                  value={r.cardinality}
                  onChange={(e) => {
                    setRelations(
                      relations.map((row, j) =>
                        j === i
                          ? {
                              ...row,
                              cardinality: e.target
                                .value as Relation["cardinality"],
                            }
                          : row,
                      ),
                    );
                    setSql("");
                  }}
                >
                  <option>1:N</option>
                  <option>1:1</option>
                </select>
              </label>
              <button
                className="secondary-button"
                onClick={() => {
                  setRelations(relations.filter((_, j) => i !== j));
                  setSql("");
                }}
              >
                Remove relationship {i + 1}
              </button>
            </fieldset>
          ))}
          <button
            className="secondary-button"
            disabled={relations.length >= 12 || entities.length < 2}
            onClick={() => {
              setRelations([
                ...relations,
                { from: "", to: "", foreignKey: "", cardinality: "1:N" },
              ]);
              setSql("");
            }}
          >
            Add relationship
          </button>
        </div>
        <aside className="min-w-0">
          <h3 className="font-semibold mb-2">Live diagram</h3>
          <svg
            role="img"
            aria-label="ER diagram"
            viewBox={`0 0 520 ${Math.max(220, Math.ceil(entities.length / 2) * 160)}`}
            className="w-full rounded-xl bg-slate-950"
          >
            {relations.map((r, i) => {
              const from = entities.findIndex((e) => e.name === r.from),
                to = entities.findIndex((e) => e.name === r.to);
              if (from < 0 || to < 0) return null;
              const x1 = 130 + (from % 2) * 260,
                y1 = 80 + Math.floor(from / 2) * 160,
                x2 = 130 + (to % 2) * 260,
                y2 = 80 + Math.floor(to / 2) * 160;
              return (
                <g key={i}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#fbbf24"
                    strokeWidth="3"
                  />
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 8}
                    fill="#fbbf24"
                    textAnchor="middle"
                    fontSize="12"
                  >
                    {r.cardinality}
                  </text>
                </g>
              );
            })}
            {entities.map((e, i) => (
              <g
                key={i}
                transform={`translate(${20 + (i % 2) * 260},${20 + Math.floor(i / 2) * 160})`}
              >
                <rect
                  width="220"
                  height="120"
                  rx="12"
                  fill="#172033"
                  stroke="#67e8f9"
                />
                <text x="12" y="25" fill="white" fontSize="15">
                  {e.name.slice(0, 23)}
                </text>
                <text x="12" y="48" fill="#67e8f9" fontSize="12">
                  PK: {e.primaryKey.slice(0, 23)}
                </text>
                {e.attributes
                  .split(",")
                  .slice(0, 3)
                  .map((field, j) => (
                    <text
                      key={j}
                      x="12"
                      y={70 + j * 16}
                      fill="#cbd5e1"
                      fontSize="11"
                    >
                      {field.trim().slice(0, 29)}
                    </text>
                  ))}
              </g>
            ))}
          </svg>
          <ul className="mt-3 text-sm">
            {relations.map((r, i) => (
              <li key={i}>
                {r.from || "Parent"} → {r.to || "Child"}: {r.cardinality}, FK{" "}
                {r.foreignKey || "not selected"}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="primary-button" onClick={validate}>
              Validate design
            </button>
            <button
              className="secondary-button"
              onClick={() =>
                downloadText(
                  "er-design.json",
                  JSON.stringify({ entities, relations }, null, 2),
                )
              }
            >
              Export design
            </button>
          </div>
          <p role="status" className="mt-3 text-sm">
            {feedback}
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Keep entity names stable after linking. Export your design before
            leaving; this workspace is not a graded submission.
          </p>
        </aside>
      </div>
      {sql && <SqlExercise key={sql} initialSql={sql} onEvent={onEvent} />}
    </section>
  );
}
