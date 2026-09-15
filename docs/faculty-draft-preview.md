# Faculty draft previews

Faculty selects **Save draft for tester** in the laboratory workspace. This saves a server copy without creating an assignment or publishing to students. Save again after edits. Unsaved browser-only edits cannot be shared across accounts. Saved custom experiments and syllabus edits restore after reload.

The tester opens **Learning studio → Unpublished faculty drafts** and refreshes to load the latest saved copies. The standard IDE uses the saved instructions, source and expected output. It supports input and execution without final submission. Telemetry carries the draft ID and saved-version timestamp, with the server-derived tester flag.

Storage uses the reserved `lab_draft` kind in the existing protected `learning_records` table. `/api/assignments?drafts=1` requires faculty/admin or the server-managed tester identity. Faculty sees and changes only its own drafts. Testers can read all faculty drafts but cannot write/delete them. Regular students receive 403. The generic learning API excludes drafts and rejects reserved draft IDs on direct operations. Publishing creates the ordinary assignment and removes that faculty's saved preview; removing a custom experiment removes its saved preview too.

Verification: `npm run test:tester`, `node scripts/draft-preview.test.mjs`, typecheck and production build. Browser tests verify save/reload, no publication, actual execution of saved SQL, no final submission and draft-linked telemetry.
