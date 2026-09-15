export function syllabusSupport(id: string): string | null {
  if (/^java-lab-(10|16|17|18|19|20|21)$/.test(id))
    return "Open the interactive learning activity above to explore this lab's GUI/Applet concepts. The simulator is not an original Swing/Applet runtime; source-code execution still requires a compatible graphics environment.";
  if (id === "java-lab-15")
    return "JDBC runs with the built-in H2 database. Use org.h2.Driver and jdbc:h2:mem:lab (user sa, empty password). Each run starts fresh. Oracle/MySQL drivers, remote connections and vendor-specific SQL are not supported.";
  if (id === "java-lab-1")
    return "Open the interactive learning activity for the live prime debugger: pause at checkpoints, step the JVM, inspect variables, continue to a breakpoint, and review the trace. This guided debugger uses explicit trace calls, not arbitrary-line Java breakpoints.";
  if (/^java-lab-(13|14)$/.test(id))
    return "Upload your data files below and use their filenames in Java. Each run gets temporary copies; download generated files from Output. Folders and arbitrary access to your computer are not supported.";
  if (/^dbms-lab-(9|10)$/.test(id))
    return "Select PostgreSQL below to run real procedures and cursors using PL/pgSQL. Reference programs are included. Oracle PL/SQL syntax is not supported or automatically translated.";
  if (id === "dbms-lab-6")
    return "Select PostgreSQL below for ANY/ALL comparisons as well as IN, EXISTS, UNION and INTERSECT. SQLite does not support quantified ANY/ALL comparisons.";
  if (/^dbms-lab-(1|3)$/.test(id))
    return "Open the interactive learning activity to design an ER model or decompose the enrollment schema, then run its generated PostgreSQL. Faculty reviews the design reasoning; output alone is not a general proof.";
  if (id.startsWith("dbms-lab-"))
    return "Choose SQLite or PostgreSQL below. Each run starts with a fresh database; include table setup and data. Use the chosen engine's syntax; Oracle-specific syntax is not supported.";
  return null;
}
