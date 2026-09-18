# Experivio

Live beta: [experivio.vercel.app](https://experivio.vercel.app).

Students can use the contextual AI Tutor in labs, practice and resources; faculty can review saved chats, shared work and tutor-usage insights. See [AI Tutor and student insights](docs/ai-tutor.md) for context handling, privacy, learning-time measurement and testing.

## Beta release

Experivio **1.0.0-beta.1** is a supervised teaching beta. See [beta release notes and verification](docs/beta-release.md) and [the 31-experiment compatibility audit](docs/syllabus-coverage.md). All syllabus experiments have a learning path, but Java GUI/Applet activities use labeled simulations and SQL uses SQLite/PostgreSQL rather than Oracle. No Docker or system runtime installation is required.

The workspace now has instructions on the left, code and personal input in the middle, and output/sample checks on the right (stacked on smaller screens). Sample checks compare exact reference output; faculty must provide console output including SQL headings, rather than descriptive observations, for meaningful comparisons. They are client-reported checks, not authoritative grading.

Telemetry is stored in IndexedDB until acknowledged, retried with stable IDs, and checked against the authenticated student's assignment/resource access. Faculty can inspect the latest 100 records for a selected student, including execution errors, source fingerprints and sample-check results. Student sync status shows pending/rejected events and warns when durable browser storage is unavailable. Run `npm run test:ide` with the local preview and Playwright available to verify layout, sample checking and telemetry recovery.

## Resource practice and visual labs

Faculty can attach up to 20 Java, DBMS (SQL), or HTML/JavaScript practice questions to a resource. Students can filter by language and open questions in the existing coding workspace below the study material, with editable input. These questions are ungraded; drafts remain on the student's device.

Select **Visual canvas (HTML / JavaScript)** when publishing a lab to render an interactive, sandboxed preview. The traffic-light starter demonstrates buttons and canvas drawing. This mode runs browser code; it does not execute Java Swing or legacy Java Applets. Java console programs continue to use the real browser Java compiler. Visual results require faculty review.

Before deploying this update to an existing database, apply `supabase/migrations/20260911000012_resource_practice_visual.sql`. Fresh databases use the updated `supabase/schema.sql`. For the existing hosted portal, preserve the configured database and coursework; do not reseed production.

The default platform name lives in `shared/brand.json`. Set `VITE_APP_NAME` for a build-time override; server prompts also accept `APP_NAME` (keep it consistent with the frontend). Rebuild after changing branding.

The editor and its worker are bundled locally and loaded when a coding workspace opens, so editing does not depend on a third-party CDN. Run `npm run test:features` with a local development server and Playwright installed (or set `PLAYWRIGHT_MODULE` to its module URL) to check publishing, question filters, code editing, custom Java input and visual previews.

Full-stack academic learning and lab assessment platform for JAVA and DBMS theory/lab tracks. The application combines external learning resources, engagement telemetry, proctored assessments, and a Monaco-based coding workspace in one role-aware interface.

## Included modules

- Student self-registration and separate student/faculty portals
- Signed bearer sessions, PBKDF2-SHA512 password hashing, server-side RBAC, and inactive-account enforcement
- JAVA and DBMS course enrollment with theory and lab tracks
- Unit-wise Academic JAVA/DBMS theory and lab catalog loaded from the supplied curriculum
- Faculty assignment composer for theory, practice, proctored assessments, and lab experiments with deadlines and explicit student targeting
- Student draft/final submission workflow with assignment status and deadline enforcement
- YouTube playback tracking through the IFrame Player API
- Focused PDF/Google Drive reading-time tracking using viewport, focus, and visibility state
- Proctored exams with fullscreen enforcement, focus-loss detection, warning/auto-submit policy, timer recovery, and autosave
- Monaco Java/SQL editor with run/submit controls, expected/actual output comparison, paste detection, error logging, and debugging timelines
- Faculty resource manager, assessment manager, cohort health table, and per-student activity timeline
- Zero-storage resource architecture: only external URLs and metadata are stored
- One-minute engagement batching and capped roster rendering for 500-student cohorts
- Light/dark themes and responsive desktop/mobile layouts

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS 4 and custom design tokens
- Monaco Editor, Lucide React, Framer Motion
- Vercel Node API functions
- Supabase PostgreSQL with RLS enabled and server-mediated access

## Local development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The local API runs on `http://127.0.0.1:8787` and uses `server/db.seed.json` when valid Supabase credentials are not configured.

Students create their own accounts from the registration screen. The local baseline contains the faculty profile only; set `FACULTY_PASSWORD` in ignored `.env.local` to enable local faculty login. `npm run seed:supabase` preserves existing account passwords, users and coursework; new faculty accounts require `FACULTY_PASSWORD`.

## Database setup

For a new project, run [supabase/schema.sql](supabase/schema.sql) in the Supabase SQL editor. For an existing portal database, apply the migrations in order, including [20260824_academic_platform.sql](supabase/migrations/20260824_academic_platform.sql), [20260824_kgr25_subjects.sql](supabase/migrations/20260824_kgr25_subjects.sql), and [20260826_unit_coursework_and_scale.sql](supabase/migrations/20260826_unit_coursework_and_scale.sql).

The production tables are:

- `users`
- `courses`
- `enrollments`
- `resources`
- `assessments`
- `submissions`
- `activity_logs`

`subjects`, `assignments`, and `learning_records` hold the unit coursework and student responses. Anonymous policies are removed by the platform migration; API functions use the service role only after signed-session and role validation.

## Environment

Copy `.env.example` to `.env.local` and provide:

```dotenv
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="server-only-service-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_ANON_KEY="public-anon-key"
AUTH_SECRET="at-least-32-random-bytes"
```

`SUPABASE_SERVICE_ROLE_KEY` and `AUTH_SECRET` must never use a `VITE_` prefix or be exposed to the browser.

## Built-in Java and DBMS compilers

Use the existing Java/DBMS lab and coursework editors. There is no new IDE page, API key, Docker installation, compiler server, or daily execution quota. The website serves the compiler files; students' browsers do the compilation and execution.

### Java labs

Java labs **1–9 and 11–15** use the real browser Java runtime, including H2 JDBC for lab 15. Lab 1 includes guided checkpoint debugging. Labs **10 and 16–21** have interactive learning simulations; they do not execute original Swing/Applet code.

The bundled Eclipse compiler (ECJ) compiles Java 8 source into bytecode, and DoppioJVM executes it with OpenJDK class libraries. This is real compilation and execution, not AI output or prewritten experiment answers.

- Use a public entry class with `public static void main(String[] args)`. Other classes/interfaces can be declared in the same editor. Java 9+ syntax and separate source-file uploads are not supported.
- Enter your own values in **Your input (stdin)** before Run. Change them and run again to test another case. Scanner and buffered input receive a finite UTF-8 stream with normal end-of-file behavior.
- First use downloads about 35 MB of bundled assets. Later runs reuse the download. The compiler operates inside a worker in an opaque-origin iframe with network access disabled. Student source is not sent to a compiler service.
- **Stop execution** cancels a run. Loading is limited to 2 minutes, compilation to 60 seconds, execution to 15 seconds (60 seconds for JDBC/H2 initialization), and output to 100 KB. Limits apply to each run, not to the number of runs.
- File labs use `java.io` streams and `java.io.File`; `java.nio.file` operations are not supported by this runtime. Files created by a program are temporary browser files and are discarded after the run; they cannot access the student's computer. Students can upload input files and download generated output files. Permissions are virtual filesystem permissions.
- Original GUI/Swing windows and legacy applets require a desktop Java environment; the assigned interactive tools are labeled browser simulations. JDBC uses embedded H2, and lab 1 supports explicit checkpoint debugging.

The bundled runtime is an older Java 8 implementation selected for these teaching programs. It is not a full replacement for a current desktop JDK, and unsupported native/runtime APIs can fail explicitly. Do not remove the iframe sandbox or its network restrictions. Execution results are student-side feedback, not trusted server-side grading evidence.

### DBMS

SQLite and PostgreSQL (PGlite) execute locally in disposable browser workers. Each run starts with an empty database; include setup and data in the same script. PostgreSQL supports procedures, cursors and triggers using PostgreSQL syntax. Oracle PL/SQL is not supported. ER design and normalization have interactive tools with faculty-reviewed evidence.

### Deployment

Run `npm run build` and deploy the existing project to Vercel as usual. `public/java` is copied into `dist/java` as static assets; nothing needs to be kept awake. Keep all Java runtime files and license notices in the deployment. Normal website hosting/bandwidth quotas still apply, even though execution has no per-run fee. No production deployment was performed as part of this change.

The old `/api/code-runner` endpoint remains for separately configured integrations; the built-in editors no longer call it. It does not simulate Java with AI or fall back to a paid compiler service.

Java runtime attribution, source locations, and local modifications are in [public/java/NOTICE.md](public/java/NOTICE.md).

### Browser compiler tests

With the development server running on port 5173, install Playwright in your development environment and its Chromium browser, then run `npm run test:java`. `PLAYWRIGHT_MODULE` may point to an existing Playwright ES module (for example, the Codex desktop bundled runtime); `TEST_BASE_URL` can select another development URL. These tests exercise real compilation, lab features, failures, isolation and cancellation through the same browser runner used by students.

## Verification

```bash
npm run typecheck
npm run build
npm audit
```

Vercel is the configured deployment target. Add the server-only environment variables in the Vercel project before deployment and apply the Supabase migration first.

## Academic Curriculum And Cohorts (2026-08-30)

- Apply `supabase/migrations/20260830_curriculum_profiles.sql` before deploying this release. It adds profile fields, assignment hints, atomic dual-course enrollment, and compact faculty analytics functions. Existing students are enrolled in both courses without deleting their work.
- Registration collects name, email, Indian mobile number, department (CSE/CSM/CSD), section (A-E), roll number and password. The college is fixed to the configured platform name.
- `server/curriculum-templates.js` has all 31 syllabus experiments and 10 unit practice templates, each with two editable MCQs and one coding activity. Tasks, fixtures and hints are teaching examples added to the syllabus, not official answer keys.
- Faculty loads a unit/experiment, edits questions, sample input, expected output/observations and hints, chooses a deadline and recipients, then explicitly enables/publishes it. The template API is faculty-only. Published work is editable until a student saves an attempt; after that, publish a new copy.
- ER design, normalization and Java visual labs include interactive learning tools inside assigned experiments. Faculty enables these after the manual lab. Tester/faculty draft previews remain available. See the compatibility audit for original-code limitations.
- Faculty can filter recipients and reports by department/section. Reports preview the complete filtered roster or one student's insights before printing/saving as PDF. Roster screens render 50 students at a time.
- Analytics use database aggregates and load source code only for the selected student. This reduces transfer size; it is not a measured guarantee of 500 concurrent students. Size and stress-test the isolated runner separately.
- `npm test` runs local, in-memory registration, enrollment, access-control, template and grading tests without touching production.

Production database migration `20260830_curriculum_profiles` was applied and verified on 2026-08-30, including dual-course enrollment and both analytics functions. Deploy this source only after that migration. No temporary migration endpoint or credential is retained in the repository.
