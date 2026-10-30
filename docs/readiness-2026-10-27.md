# Readiness verification — 2026-10-27

The patched source is suitable for a supervised faculty/student pilot within the documented browser-runtime limitations. This verification does not establish general-availability capacity or replace a broader application security review. The live site was checked without changing hosted data; this maintenance update has not been deployed by these checks.

## Security changes

- DOMPurify override: 3.4.15 → 3.4.17.
- Vite: 6.4.3 → 6.4.5, with the minimum version raised in `package.json`.
- Locked source-map-js: 1.2.1 → 1.2.2.
- Retained the patched esbuild 0.28.1 override for Vite's optional tsx integration.
- Removed the optional Vercel CLI dependency and `dev:vercel` script. The latest CLI still depended on vulnerable libraries, including Zod 3 consumers without a compatible patched version. Removing the unused tool avoids forcing incompatible major library overrides. `npm run dev`, the Vercel Git integration, `vercel.json` and the cloud build command remain available.

Both the complete dependency audit and production-only audit returned zero vulnerabilities. This is a point-in-time dependency result, not a claim that the application is free of all security defects.

## Verification results

| Check | Result and scope |
| --- | --- |
| Clean installation | `npm ci --no-audit --no-fund` passed, followed by zero findings from both audits and a successful production rebuild. |
| TypeScript and production build | Passed. Existing PGlite bundler warnings and large editor/worker chunks remain non-fatal. |
| All 21 suites named by `test:beta` | Passed across the suite run and focused completion runs. An editor-diagnostics run was interrupted by Vite reloading edited files; its full focused rerun passed. |
| Java compilation/execution | All 22 fixtures passed, plus cancellation, iframe cleanup and network-bridge blocking. |
| Runtime extensions | PostgreSQL procedures/cursors/triggers, cancellation, uploaded/generated files, path rejection, H2 JDBC CRUD, prepared parameters and fresh-database isolation passed. |
| Runtime UI | Engine switching, upload/download bytes, stale-evidence handling, telemetry and file-content privacy passed. |
| Built PostgreSQL worker | Production worker JavaScript and WebAssembly assets executed successfully. |
| Built full-stack app | Actual HTTP handlers, faculty/student sign-in, wrong-password rejection, registration, session restoration, role-specific navigation, sign-out, invalid-token rejection and unauthorized API denial passed. API responses were not mocked. |
| Local authenticated read load | 500 disposable students; 2,000 requests; concurrency 25; zero errors. One measured run took 6,135 ms, with p95 107 ms and maximum 265 ms. Data isolation was checked for each enrollment response. |
| Existing live deployment | HTTPS/health, anonymous access denial, actual faculty UI sign-in, session restoration, enrollment/resources/lab/interactive-lab/insights screens, hosted database reads and sign-out passed. No hosted accounts, assignments, submissions or course settings were changed. |

Browser tests used headless Chromium on Windows. Existing responsive checks covered widths of 320, 390, 768 and 1440 pixels. Test-generated local records were isolated from hosted Supabase and cleaned up afterward.

## Repeating the checks

Use `npm ci`, `npm audit`, `npm audit --omit=dev`, and `npm run build`. With Playwright/Chromium available, start `npm run dev:vite`, set `TEST_BASE_URL` to that server, then run `npm run test:beta`. Set `PLAYWRIGHT_MODULE` and `PLAYWRIGHT_EXECUTABLE_PATH` when using an existing external installation. Avoid changing files while the browser suite runs, since Vite can reload active tests.

Run `npm run test:fullstack` after building; it starts and stops its own local server and uses disposable data. For the built worker check, start `npm run preview` and run `npm run test:runtime-production`.

`npm run test:live` requires explicit `LIVE_TEST_URL`, `LIVE_FACULTY_EMAIL` and `LIVE_FACULTY_PASSWORD` environment variables. Keep credentials out of committed files and test logs. This command performs only sign-in and read operations.

## Release boundary

Deploy this reviewed source through the existing Vercel Git integration, wait for Ready status, and rerun the live smoke check against that deployment. No schema migration or production reseed is required for this maintenance update.

Hosted Vercel/Supabase concurrency testing, Safari/Firefox and real-device acceptance, backup restoration drills and a broader security review remain outside this verification. The local load measurement does not establish support for 500 simultaneous hosted users. Java GUI/Applet simulations, Java 8 compatibility, SQL dialect differences, student-device execution limits and faculty-reviewed grading retain the limits in the [beta release notes](beta-release.md) and [syllabus audit](syllabus-coverage.md).
