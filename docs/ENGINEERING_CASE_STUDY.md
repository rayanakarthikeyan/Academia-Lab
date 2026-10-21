# CogniXplore engineering case study

CogniXplore is a supervised teaching beta with student and faculty workflows, coding workspaces, and contextual AI tutoring. Its engineering focus is keeping access, learning context, and saved activity consistent across the interface and server.

## Implementation

- React/TypeScript interfaces connect to server-mediated APIs and PostgreSQL-backed deployment.
- Signed sessions and server-side role checks control coursework publication, assignment access, submissions, tutor context, and chat history.
- A coding workspace combines editable source and input with output inspection. Sample checks are client-reported observations, not authoritative grades.
- Browser telemetry persists in IndexedDB until acknowledgement and retries with stable event IDs. The server binds events to the authenticated student's access.

See [AI tutoring and saved history](ai-tutor.md), [beta scope](beta-release.md), and [the platform handler](../api/_platform.js).

## Reproduce the evidence

Use Node 24 and install the committed dependency lockfile:

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:tutor
```

The API workflow suite exercises registration validation, student/faculty access, targeted publication, hidden-answer removal, server-controlled grading, submission restrictions, and event deduplication. Tutor checks cover server-authorized context, current work, saved history, hidden-answer exclusion, rate limits, provider failures, and chat access restrictions.

These checks invoke real local API handlers against an in-memory fixture database. Tutor provider responses are controlled fixtures. They do not establish hosted PostgreSQL/RLS correctness, model answer quality, or real student learning gains.

The [application evidence workflow](../.github/workflows/verify.yml) runs the build and those two suites on each pull request and main push, with a downloadable JUnit report. It uses no hosted database or model-provider secrets.

## Browser evidence and limits

With the local app running and Playwright configured, `npm run test:ide` checks workspace layout, sample checking, and telemetry recovery across an outage and reload. Other beta suites cover resource and tutor interfaces. Browser route fixtures isolate these tests from real coursework. Run the full beta verification described in [the release guide](beta-release.md) before claiming a complete release check.

The application remains a teaching beta. Simulated Java GUI/Applet paths and SQLite/PostgreSQL SQL execution differ from native Java GUI and Oracle environments. This case study does not claim production grading security, independent AI evaluation, or measured adoption.

## Interview walkthrough

Follow a targeted assignment from faculty publication to student submission. Explain where access is checked and why client-supplied scores cannot determine grades. Then show tutor context and discuss the difference between durable activity delivery, authoritative server records, and user-reported sample results.
