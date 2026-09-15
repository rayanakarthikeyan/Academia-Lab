export function syllabusSupport(id: string): string | null {
  if (/^java-lab-(10|15|16|17|18|19|20|21)$/.test(id))
    return "Original Java GUI, JDBC or Applet execution needs the isolated local Java/database runtime. It is not installed in this phase. HTML previews are not substitutes for this Java experiment.";
  if (id === "java-lab-1")
    return "Prime-number programs run here. The syllabus also requires step debugging and IDE tooling; those are not yet implemented in this workspace.";
  if (/^java-lab-(13|14)$/.test(id))
    return "Browser Java uses a temporary virtual filesystem. Files must be created by the program; access to your computer's files is not available.";
  if (/^dbms-lab-(9|10)$/.test(id))
    return "Original stored procedures and cursors require the local database runtime. SQLite does not execute Oracle PL/SQL.";
  if (id === "dbms-lab-6")
    return "This browser runs SQLite. IN, EXISTS, UNION and INTERSECT work; the syllabus ANY/ALL queries need the full database runtime.";
  if (/^dbms-lab-(1|3)$/.test(id))
    return "This is a database-design experiment. Explain entities, relationships or normalization steps; SQL output alone cannot demonstrate these design requirements.";
  if (id.startsWith("dbms-lab-"))
    return "SQL runs in SQLite with a fresh database for each run. Include table setup and data in your script; Oracle-specific syntax requires the local database runtime.";
  return null;
}
