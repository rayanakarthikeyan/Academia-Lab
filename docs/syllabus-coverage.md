# Original syllabus execution audit

Scope reviewed: the four supplied Java and DBMS theory/lab PDFs. This phase is local only, with no installations or deployment. **Not all original experiments execute in the current browser runtimes.** Do not advertise full syllabus compatibility yet.

The IDE now separates instructions, source/input, and output/checks. Student input is executed as supplied. A successful process exit is not a correctness grade. Sample cases provide limited evidence; faculty reviews the algorithm and syllabus requirements.

## Java — 21 experiments

| Lab | Requirement | Current support |
| --- | --- | --- |
| 1 | IDE study, primes, step debugging | Prime program works; debugger/refactoring tooling remains incomplete |
| 2 | Quadratic roots with input | Browser Java console |
| 3 | Matrix multiplication | Browser Java console |
| 4 | Inheritance, final, abstract classes | Browser Java console |
| 5 | Abstract Shape and areas | Browser Java console |
| 6 | Method and constructor overloading | Browser Java console |
| 7 | Method overriding | Browser Java console |
| 8 | Currency converter using interfaces | Browser Java console |
| 9 | User-defined exceptions | Browser Java console |
| 10 | Division GUI and exception dialogs | Requires native Java GUI runtime |
| 11 | Three threads, random values each second | Browser Java, bounded by execution timeout |
| 12 | Producer-consumer / synchronization | Browser Java, bounded by execution timeout |
| 13 | File splitting | Java IO works on temporary virtual files; user file import remains missing |
| 14 | File metadata with filename input | Java IO works on temporary virtual files; no host filesystem access |
| 15 | JDBC CRUD | Requires native Java and database runtime |
| 16 | Traffic lights and radio buttons | Requires native Java GUI runtime |
| 17 | Mouse events and adapter classes | Requires native Java GUI runtime |
| 18 | Keyboard events | Requires native Java GUI runtime |
| 19 | Calculator with grid layout | Requires native Java GUI runtime |
| 20 | Message Applet | Requires legacy-compatible Java runtime |
| 21 | Factorial Applet with input | Requires legacy-compatible Java runtime |

HTML/JavaScript examples are explicitly labeled alternatives. They do not establish compatibility with the original Java programs.

## DBMS — 10 experiments

| Lab | Requirement | Current support |
| --- | --- | --- |
| 1 | E-R conceptual design | Design evidence/faculty review; no ER diagram editor yet |
| 2 | Relational model | SQL tables and constraints, with SQLite dialect limits |
| 3 | Normalization | Design evidence/faculty review; execution alone is insufficient |
| 4 | DDL | SQLite subset; not all Oracle DDL |
| 5 | DML | SQLite DML |
| 6 | ANY, ALL, IN, EXISTS, set operators, constraints | Partial: SQLite lacks quantified ANY/ALL comparisons |
| 7 | Aggregates, grouping, HAVING, views | SQLite support |
| 8 | Insert/delete/update triggers | SQLite trigger syntax; Oracle PL/SQL triggers require database runtime |
| 9 | Procedures | Requires original database runtime; no SQL-to-JavaScript simulation |
| 10 | Cursors | Requires original database runtime; no SQL-to-JavaScript simulation |

## Telemetry evidence

- The authenticated API determines the student identity and checks assignment/resource access.
- Stable event IDs make client retries idempotent. New events are append-only, avoiding legacy read-modify-write aggregation races.
- IndexedDB retains unsent metadata across page reloads. A visible status distinguishes pending, rejected and synchronized records; storage-disabled browsers use an explicitly reported in-memory fallback.
- Editing batches flush periodically, on runs/submission, and on workspace exit, including fewer than 25 edits. Timelines are bounded.
- Successful execution is labeled “Run completed,” not “Tests passed.” Run/source/input digests and sample-check evidence remain client-reported evidence, not trusted grading or proof against tampering.
- Server receipt time and client event time are distinct. Offline records may arrive later. Storage loss, closing a storage-disabled browser, or revoked access can still prevent delivery; the UI must not claim otherwise.

## Next compatibility phase — not completed

**Docker-free requirement:** Docker must not be a dependency of the IDE or the future execution service. A native execution service can use a compatible JDK, a database engine and an isolated operating-system account. The existing browser Java/SQLite runners already require no Docker. Native execution still requires runtime software and isolation; removing Docker does not make browser Java support Swing/Applets/JDBC or make SQLite support Oracle PL/SQL. No additional software installation is authorized in the current phase.

Install and test an isolated local Java GUI/Applet runtime plus an appropriate database engine before enabling original-code execution for the unsupported rows. Use per-student workspaces, restricted filesystem/network access, deadlines, concurrency limits and authenticated GUI sessions. Validate all 31 experiments, including invalid input, exceptions, files and interactive events. No such runtime has been installed or deployed in this phase.

Source documents: `KGR25 B.Tech Object Oriented Programming Through JAVA-Theory.pdf`, `KGR25 B.Tech Object Oriented Programming Through JAVA-Lab.pdf`, `Database Management Systems-Theory-KGR25.pdf`, `Database Management Systems-Lab-KGR25.pdf` (user-supplied files in Downloads).
