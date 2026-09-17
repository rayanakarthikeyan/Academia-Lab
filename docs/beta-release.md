# AsterLab 1.0.0-beta.1

Release date: 2026-09-17. Intended for a supervised faculty/student pilot, not an assertion of unrestricted production scale or complete desktop IDE compatibility.

## Included workflows

- Faculty saves syllabus drafts, previews experiments, attaches resource practice questions, selects recipients and publishes assignments.
- Students use the built-in editor, their own input, compiler feedback, draft saving and final submission. Faculty receives authorized telemetry and submitted evidence.
- Interactive lab activities start disabled. Faculty confirms the manual lab is complete before enabling them; open workspaces refresh availability. Final submissions remain locked.
- Tester accounts can preview unpublished faculty drafts, remain separate from student rosters, and cannot publish or change faculty release controls.
- The sign-in screen and workspace identify the release as Beta.

## Verification

Release verification: all 15 suites listed below passed, as did the TypeScript/production build and built PostgreSQL worker check. Interrupted local runs were repeated; the JDBC timeout found during testing was fixed and its CRUD, input and isolation checks passed afterward. Production dependency audit: zero findings.

Start `npm run dev:vite`, then run `npm run test:beta` in another terminal. Playwright and Chromium must already be available; use `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` to select an existing installation. The suite fails on the first unsuccessful check.

The 15 suites cover registration, authorization, publishing, tester separation, drafts, resource practice, input/output, telemetry retry and rejection, proctor cleanup, guided debugging, ER/normalization tools, seven visual simulations, interactive release controls, editor diagnostics, Java runtime isolation, JDBC/files, and SQL runtimes. Responsive checks cover 320, 390, 768 and 1440 pixel widths in Chromium; they do not establish compatibility with every browser/device.

Also run `npm run build` and `npm audit --omit=dev`. Test the built PostgreSQL worker with `npm run preview` and `npm run test:runtime-production`. After deployment, verify sign-in, tester draft access and the Beta label on the live site.

## Known limits and follow-up

- See [the syllabus compatibility audit](syllabus-coverage.md): seven Java GUI/Applet experiments use labeled simulations. H2 JDBC and PostgreSQL syntax differ from Oracle/MySQL. Guided debugging uses explicit checkpoints.
- JDBC/H2 receives a bounded 60-second execution window to allow embedded database initialization; ordinary Java keeps its 15-second limit. Java first-load assets are substantial; compilation speed depends on the student's device. Runtime timeouts, output and file limits remain enforced.
- Telemetry and sample results are learning evidence, not tamper-proof grading. Faculty reviews reasoning and simulation reports. Offline delivery needs browser storage and eventual reconnection.
- Production dependency audit is clean after pinning patched DOMPurify and esbuild. The critical deployment-tool tar advisory is patched. The full development-tool audit still reports 29 findings (18 high, 10 moderate, 1 low) in the Vercel CLI dependency tree. These are not bundled student runtime dependencies; resolve the tooling advisories before a general-availability security sign-off. Do not use forced major dependency changes without testing the deployment workflow.
- Load testing, Safari/Firefox and real-device acceptance, backup restoration drills, and a broader security review remain general-availability work. No concurrent-user capacity guarantee is made.

For beta feedback, record the assignment ID, browser/device, steps, expected result and visible error; omit passwords, tokens and other students' work. Faculty should review the first pilot cohort's submissions and telemetry before widening access.

## Deployment and rollback

This beta changes release labels, dependency patches, the JDBC execution budget, documentation and the repeatable test command. It requires no new Supabase migration and does not reseed users, publish drafts, or change existing submissions.

GitHub main triggers the existing Vercel production deployment. Confirm the deployment is Ready before sharing it. For a release regression, promote the last known-good Vercel deployment (pre-beta source commit `63b3a24`) and follow with a reviewed Git revert; preserve the Supabase data. Do not reset the database to roll back frontend/API assets.
