# CogniXplore 1.0.0-beta.1

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

The current beta command includes 21 suites covering registration, authorization, publishing, tester separation, drafts, resource practice, video tracking, workspace layout, input/output, telemetry retry and rejection, proctor cleanup, guided debugging, ER/normalization tools, seven visual simulations, interactive release controls, editor diagnostics, Java runtime isolation, JDBC/files, and SQL runtimes. Responsive checks cover 320, 390, 768 and 1440 pixel widths in Chromium; they do not establish compatibility with every browser/device. Avoid editing source or package files during the suite: Vite's automatic reload can interrupt long-running compiler checks.

Also run `npm run build` and `npm audit --omit=dev`. Test the built PostgreSQL worker with `npm run preview` and `npm run test:runtime-production`. After deployment, verify sign-in, tester draft access and the Beta label on the live site.

## Known limits and follow-up

- See [the syllabus compatibility audit](syllabus-coverage.md): seven Java GUI/Applet experiments use labeled simulations. H2 JDBC and PostgreSQL syntax differ from Oracle/MySQL. Guided debugging uses explicit checkpoints.
- JDBC/H2 receives a bounded 60-second execution window to allow embedded database initialization; ordinary Java keeps its 15-second limit. Java first-load assets are substantial; compilation speed depends on the student's device. Runtime timeouts, output and file limits remain enforced.
- Telemetry and sample results are learning evidence, not tamper-proof grading. Faculty reviews reasoning and simulation reports. Offline delivery needs browser storage and eventual reconnection.
- Security maintenance on 2026-10-27 updated DOMPurify to 3.4.17, Vite to 6.4.5 and the locked source-map-js dependency to 1.2.2, retaining the patched esbuild override. Both `npm audit` and `npm audit --omit=dev` report zero vulnerabilities. The optional local Vercel CLI and its vulnerable transitive packages were removed; local development uses `npm run dev`, and the existing Vercel Git deployment configuration remains in place. Audit results are time-sensitive and do not replace an application security review.
- Hosted load testing, Safari/Firefox and real-device acceptance, backup restoration drills, and a broader security review remain general-availability work. The [2026-10-27 readiness verification](readiness-2026-10-27.md) records local authenticated load results; these do not establish hosted concurrent-user capacity.

For beta feedback, record the assignment ID, browser/device, steps, expected result and visible error; omit passwords, tokens and other students' work. Faculty should review the first pilot cohort's submissions and telemetry before widening access.

## Deployment and rollback

This beta changes release labels, dependency patches, the JDBC execution budget, documentation and the repeatable test command. It requires no new Supabase migration and does not reseed users, publish drafts, or change existing submissions.

GitHub main triggers the existing Vercel production deployment. Confirm the deployment is Ready before sharing it. For a release regression, promote the last known-good Vercel deployment (pre-beta source commit `63b3a24`) and follow with a reviewed Git revert; preserve the Supabase data. Do not reset the database to roll back frontend/API assets.
