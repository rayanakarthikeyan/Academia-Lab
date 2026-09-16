# Editor diagnostics

The shared Java/SQL editor has a Problems panel and Monaco error markers. Clicking a located problem focuses its source line. Compiler/runtime details remain visible for messages that have no reliable source location. Diagnostics are associated with the exact source snapshot and disappear when the source changes.

Java edits schedule a real Java 8 ECJ compilation after 1.8 seconds without further changes. The first check downloads the local runtime assets and may take longer. Check Java also starts a check. New edits, execution/read-only state, and unmount cancel obsolete checks; completed source revisions are cached within the editor. These checks set `compileOnly` through the isolated frame and worker. The worker returns immediately after compilation and never launches the student program. Debugger code is checked with its native API stub present. Background checks do not count as student runs in telemetry.

SQL live feedback is deliberately limited to basic structural checks: unmatched brackets, unclosed quotes and block comments. Full database syntax, table, type and constraint diagnostics come from Run. This is not a SQL language server. Original Swing/Applet execution limitations remain unchanged.

Tests: `node scripts/editor-errors.test.mjs` covers real Java type errors, clickable markers, corrected-source clearing, runtime exception lines, a compile-only infinite-loop program that must never execute, and SQL live/run errors. `SQL_ONLY=1` selects the SQL checks. `npm run build` verifies the production bundle.
