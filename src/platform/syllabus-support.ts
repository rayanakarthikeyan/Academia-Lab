export function syllabusSupport(id: string): string | null {
  if (/^java-lab-(10|16|17|18|19|20|21)$/.test(id))
    return "Original Java GUI or Applet execution needs a compatible graphics runtime. It is not installed in this phase. HTML previews are not substitutes for this Java experiment.";
  if (id === "java-lab-15")
    return "JDBC runs with the built-in H2 database. Use org.h2.Driver and jdbc:h2:mem:lab (user sa, empty password). Each run starts fresh. Oracle/MySQL drivers, remote connections and vendor-specific SQL are not supported.";
  if (id === "java-lab-1")
    return "Prime-number programs run here. The syllabus also requires step debugging and IDE tooling; those are not yet implemented in this workspace.";
  if (/^java-lab-(13|14)$/.test(id))
    return "Upload your data files below and use their filenames in Java. Each run gets temporary copies; download generated files from Output. Folders and arbitrary access to your computer are not supported.";
  if (/^dbms-lab-(9|10)$/.test(id))
    return "Select PostgreSQL below to run real procedures and cursors using PL/pgSQL. Reference programs are included. Oracle PL/SQL syntax is not supported or automatically translated.";
  if (id === "dbms-lab-6")
    return "Select PostgreSQL below for ANY/ALL comparisons as well as IN, EXISTS, UNION and INTERSECT. SQLite does not support quantified ANY/ALL comparisons.";
  if (/^dbms-lab-(1|3)$/.test(id))
    return "This is a database-design experiment. Explain entities, relationships or normalization steps; SQL output alone cannot demonstrate these design requirements.";
  if (id.startsWith("dbms-lab-"))
    return "Choose SQLite or PostgreSQL below. Each run starts with a fresh database; include table setup and data. Use the chosen engine's syntax; Oracle-specific syntax is not supported.";
  return null;
}
