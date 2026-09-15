# Original syllabus execution audit

Scope reviewed: the four supplied Java and DBMS theory/lab PDFs. The application uses browser runtimes and needs no Docker or system installation. **Not all original experiments execute in the current browser runtimes.** Do not advertise full syllabus compatibility yet.

The IDE now separates instructions, source/input, and output/checks. Student input is executed as supplied. A successful process exit is not a correctness grade. Sample cases provide limited evidence; faculty reviews the algorithm and syllabus requirements.

## Java — 21 experiments

| Lab | Requirement | Current support |
| --- | --- | --- |
| 1 | IDE study, primes, step debugging | Live guided Java debugger: edit code/input, pause at explicit checkpoints, inspect variables, Step, Continue to breakpoint, run to end, and replay trace. Not arbitrary-line or multi-thread debugging; semantic refactoring remains outside scope |
| 2 | Quadratic roots with input | Browser Java console |
| 3 | Matrix multiplication | Browser Java console |
| 4 | Inheritance, final, abstract classes | Browser Java console |
| 5 | Abstract Shape and areas | Browser Java console |
| 6 | Method and constructor overloading | Browser Java console |
| 7 | Method overriding | Browser Java console |
| 8 | Currency converter using interfaces | Browser Java console |
| 9 | User-defined exceptions | Browser Java console |
| 10 | Division GUI and exception dialogs | Interactive division/exception simulation; original Java GUI runtime unsupported |
| 11 | Three threads, random values each second | Browser Java, bounded by execution timeout |
| 12 | Producer-consumer / synchronization | Browser Java, bounded by execution timeout |
| 13 | File splitting | Upload files, split with java.io, download resulting files; fresh virtual filesystem per run |
| 14 | File metadata with filename input | Upload a file and supply its filename; java.io metadata works on the uploaded copy |
| 15 | JDBC CRUD | Real JDBC with embedded H2 works; use org.h2.Driver and jdbc:h2:mem:lab. Oracle/MySQL drivers and server connections remain unsupported |
| 16 | Traffic lights and radio buttons | Traffic safety challenge with radio controls; original Swing runtime unsupported |
| 17 | Mouse events and adapter classes | Pointer event surface and accessible event simulation controls; original Swing runtime unsupported |
| 18 | Keyboard events | Physical key/input event timeline and virtual keypad; original Swing runtime unsupported |
| 19 | Calculator with grid layout | Interactive keypad and operation/error feedback; original Swing runtime unsupported |
| 20 | Message Applet | Interactive lifecycle and message canvas; original Applet runtime unsupported |
| 21 | Factorial Applet with input | Prediction, input validation and stepwise factorial visualization; original Applet runtime unsupported |

HTML/JavaScript examples are explicitly labeled alternatives. They do not establish compatibility with the original Java programs.

JDBC uses the pinned H2 2.2.224 archive inside the existing opaque-origin, network-disabled JVM sandbox. No JDBC server is installed. Reference code accepts a name from stdin and demonstrates prepared statements, creation, insertion, update, query and deletion. Existing assignments marked external offer a “Use built-in H2 JDBC” button. This verifies JDBC concepts, not compatibility with Oracle/MySQL drivers or connection strings. HSQLDB 2.7.4 was also probed but failed initialization in Doppio; it is not shipped.

Java file limits: 10 uploaded data files totaling 1 MB; up to 20 top-level output files totaling 2 MB. Files must be uploaded again after a page reload. Student files are not sent to the server. Arbitrary host filesystem access, directory uploads, java.nio.file, and automatic submission of file contents are not supported. A conventional public entry class (including a package declaration) no longer needs to be renamed Main; a public static main method is required. Multiple source-file projects and general arbitrary-line debugging remain outside scope.

## DBMS — 10 experiments

| Lab | Requirement | Current support |
| --- | --- | --- |
| 1 | E-R conceptual design | ER library mission: editable entities, attributes, primary/foreign keys, 1:1 and 1:N links, live SVG diagram, JSON export and generated PostgreSQL; N:M via junction entity |
| 2 | Relational model | SQL tables and constraints in SQLite or PostgreSQL; design evidence still needs faculty review |
| 3 | Normalization | Editable enrollment dataset, dependency challenge, duplicate/FD validation, executable decomposition and reconstruction check. General proof still needs faculty review |
| 4 | DDL | SQLite or PostgreSQL DDL; not all Oracle DDL |
| 5 | DML | SQLite or PostgreSQL DML |
| 6 | ANY, ALL, IN, EXISTS, set operators, constraints | PostgreSQL executes quantified ANY/ALL; SQLite retains its dialect limits |
| 7 | Aggregates, grouping, HAVING, views | SQLite or PostgreSQL support |
| 8 | Insert/delete/update triggers | SQLite or PostgreSQL trigger syntax; Oracle PL/SQL syntax remains unsupported |
| 9 | Procedures | Real PostgreSQL PL/pgSQL procedures in the browser; Oracle PL/SQL remains unsupported |
| 10 | Cursors | Real PostgreSQL cursors and PL/pgSQL loops in the browser; Oracle PL/SQL remains unsupported |

The existing SQL IDE now offers SQLite and PostgreSQL (PGlite 0.5.8), with procedural reference programs. PostgreSQL is a real WebAssembly database, not a source-code translator. Each run starts an empty in-memory database in a disposable worker; include setup and data. No SQL connects to Supabase or another student's database. Startup is bounded to 60 seconds and execution to 10 seconds; Stop terminates the worker. Output is capped at 100 KB and 1000 rows per result. Large scripts can still exhaust device resources before results are formatted. PostgreSQL-specific programs do not establish original Oracle compatibility.

## Telemetry evidence

- The authenticated API determines the student identity and checks assignment/resource access.
- Stable event IDs make client retries idempotent. New events are append-only, avoiding legacy read-modify-write aggregation races.
- IndexedDB retains unsent metadata across page reloads. A visible status distinguishes pending, rejected and synchronized records; storage-disabled browsers use an explicitly reported in-memory fallback.
- Editing batches flush periodically, on runs/submission, and on workspace exit, including fewer than 25 edits. Timelines are bounded.
- Successful execution is labeled “Run completed,” not “Tests passed.” Run/source/input digests and sample-check evidence remain client-reported evidence, not trusted grading or proof against tampering.
- Runtime choice and a fingerprint of the runtime/file inputs accompany run events; raw file contents are excluded. Changing the engine or uploaded files invalidates earlier run/sample evidence. Faculty can see the runtime and fingerprint in the activity details.
- Server receipt time and client event time are distinct. Offline records may arrive later. Storage loss, closing a storage-disabled browser, or revoked access can still prevent delivery; the UI must not claim otherwise.

## Next compatibility phase — not completed

**Docker-free requirement:** Docker must not be a dependency of the IDE or the future execution service. A native execution service can use a compatible JDK, a database engine and an isolated operating-system account. The existing browser Java/SQLite runners already require no Docker. Native execution still requires runtime software and isolation; removing Docker does not make browser Java support Swing/Applets/JDBC or make SQLite support Oracle PL/SQL. No additional software installation is authorized in the current phase.

Install and test an isolated local Java GUI/Applet runtime plus an appropriate database engine before enabling original-code execution for the unsupported rows. Use per-student workspaces, restricted filesystem/network access, deadlines, concurrency limits and authenticated GUI sessions. Validate all 31 experiments, including invalid input, exceptions, files and interactive events. No such runtime has been installed or deployed in this phase.

## Verification of browser extensions

- `npm run test:runtimes`: PostgreSQL procedure results, explicit cursors/notices, ANY/ALL, triggers, invalid SQL, isolation and cancellation; Java named/package entry class, uploaded file metadata, file splitting, output bytes, and unsafe filename rejection.
- The same suite tests H2 JDBC CRUD with different stdin values, quoted names passed through prepared parameters, and fresh database isolation. `npm run test:runtime-ui` checks engine selection, file upload/download, stale evidence, runtime telemetry and exclusion of uploaded file contents from telemetry.
- `node scripts/postgres-production.test.mjs` against a local production preview: bundled worker and WebAssembly assets plus procedural output.
- Existing workflow, feature, Java and IDE telemetry suites remain applicable. These are compatibility checks, not a production concurrency/load certification.

PGlite documentation and licenses: https://pglite.dev/docs/ and https://github.com/electric-sql/pglite . CheerpJ was evaluated as a GUI runtime candidate, but its free personal/evaluation terms do not establish permission for unrestricted institutional production use: https://cheerpj.com/docs/overview.html . It has not been added.

Source documents: `KGR25 B.Tech Object Oriented Programming Through JAVA-Theory.pdf`, `KGR25 B.Tech Object Oriented Programming Through JAVA-Lab.pdf`, `Database Management Systems-Theory-KGR25.pdf`, `Database Management Systems-Lab-KGR25.pdf` (user-supplied files in Downloads).
