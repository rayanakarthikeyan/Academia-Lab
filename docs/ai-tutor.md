# Contextual AI Tutor and student insights

The AI Tutor opens alongside the student workspace: instructions, IDE, output, then tutor on wide screens. Smaller desktops place the tutor below output in the right rail; tablets and phones stack the panels in that order. Students can collapse the tutor. Study resources retain the **AI Tutor → Ask for guidance** control. Tester previews can use the tutor for saved faculty drafts. Proctored assessments are excluded in both the UI and API.

Interactive lab activities and their disabled notices are hidden from students until faculty enables the assigned experiment. Faculty and tester draft previews remain available. Ordinary student practice cannot bypass the release gate.

The server resolves the current assignment, resource or saved draft and checks access before retrieving history or contacting Gemini. Prompts include the authenticated student's name, original instructions, visible questions, hints, the current work snapshot and the last 12 answered exchanges in the same activity. Hidden tests and answer keys are excluded. The browser's claimed instructions, identity and conversation history are never trusted.

Student work includes current code or written answer, selected options, input, run output (marked stale when appropriate), lab observations and interactive evidence. Bounded snapshots are saved with each exchange. Sharing happens when a question is sent; it is not automatic continuous code upload to Gemini. The UI explains Gemini sharing and faculty visibility. The model provides learning guidance; its accuracy and adherence to hint-only instructions are not guaranteed.

For resources, the tutor sees the faculty title/topic/practice prompt and link. It does not fetch, parse or claim to read external documents/videos. Students can paste a relevant passage. No arbitrary URL fetching is performed.

## Persistence and access

`learning_records.kind = ai_chat` holds one record per exchange with status `pending`, `answered` or `failed`, server-resolved context, student work and the answer. The question is saved before calling the provider; the answer is saved before being returned. Interrupted calls can leave a pending record; Refresh history reveals its current state. Failed provider calls remain visible and do not count as answered help.

New records use reserved `tutor:` IDs; the generic learning API cannot overwrite or delete transcripts. Assignment references are held in metadata, not the cascading assignment foreign key, so removing an assignment preserves its new tutor history. Account deletion still follows the database's existing user cascade. Faculty/admin can read all student conversations through paginated reports (20 exchanges per page). Students read only their own authorized activity. All stored history remains available; only the latest 12 answered exchanges are sent to Gemini per request.

Tester records are identified on the server, excluded from student metrics and available under the separate Tester activity section. No Supabase schema migration is required.

## Faculty dashboard

**Student insights** lists students, tracked learning minutes, question/reply counts and an **AI dependency indicator**. Open an individual report and choose **Chat history** to review messages and expand the exact context/work snapshot. Coursework and submission reports remain accessible through a separate button.

The indicator is a transparent usage heuristic: answered exchanges per tracked learning hour, with low (up to 2), moderate (over 2 to 5), or frequent (over 5) use. At least 30 tracked minutes are required; otherwise it reports insufficient data. It is not a diagnosis, ability score, cheating detector or grading input. Failed requests are shown separately. Counts use server-side exact counts for the visible 50-student page; full transcripts are fetched only for the selected student.

Learning time combines recorded video/document time with new active workspace time. Workspace time uses `editor_change` events with `metadata.activity = active_learning`, zero code changes and a duration. It is counted only while the document is visible and focused, stops after 90 seconds without interaction, flushes every 30 active seconds and on workspace exit, and uses the existing durable telemetry delivery queue. Hidden tabs, long host pauses and idle time do not accrue. Measurements can overlap with resource activity, are client-reported rather than attendance proof, and have no retroactive IDE coverage before this update. Refresh/reopen the insights page to retrieve newly synchronized learning time.

## Runtime and verification

The Vercel/local API reads server-only `GEMINI_API_KEY`, with optional `GEMINI_TUTOR_MODEL` (default `gemini-2.5-flash`). This is independent of secrets stored only in Supabase. Calls have a 40-second timeout, bounded context/output and a persistent five-second per-student request cooldown. The cooldown is best-effort under concurrent requests; provider quotas still apply. Provider failures show an actionable error instead of fabricated answers.

`npm run test:tutor` verifies access, assessment restrictions, personalization, context snapshots, authoritative history, hidden-answer exclusion, failure persistence, protected transcripts, tester separation and pagination with an injected provider. `npm run test:tutor-ui` uses Playwright to verify student/faculty flows, excerpts, idle tracking and 320/390/768/1440 layouts. `npm run build` checks types and bundles the application. A real Gemini smoke check and live tester conversation verify provider availability separately.
