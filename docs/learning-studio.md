# Learning studio and testing accounts

The standalone Learning studio page has been removed from the application. All 31 experiments live in faculty drafts. Faculty previews the specialized tools in the lab workspace and publishes experiments when ready. Students access the interactive tool inside the assigned lab, complete it, write observations, and save or submit under that assignment. Assessments do not expose these helpers. Testers preview unpublished work through the separate Faculty drafts entry.

Interactive activities are disabled for students by default, including newly published labs. After the manual lab, faculty uses “Manual lab completed — enable interactive activity” on the published lab card, and can disable it again. This is a faculty decision, not automatic proof of physical lab completion. Faculty/tester draft previews remain available. Open student workspaces refresh availability every 30 seconds while visible and when the browser window regains focus. Release state is stored as a protected `lab_release` learning record; students cannot modify it through either API.

When interactive activities are enabled, submissions store the student's report and the most recent evidence for each action, including model data, predictions and bounded source/output snapshots where available. Faculty reviews this evidence; automatic bulk grading skips these interactive submissions. The server checks current release state and requires report/evidence only while enabled. Manual work can be saved/submitted while disabled. Final submissions remain locked; enabling an activity does not reopen already submitted work. Local reports/evidence are retained for reload and included in server draft saves; the live simulator state itself remains session-local.

## Java debugger

The editable prime program uses explicit `trace(...)` checkpoints. An isolated native adapter places the actual Doppio Java thread in ASYNC_WAITING; Step resumes its native frame. Continue skips checkpoints until the chosen stage, and Run to end completes execution. The displayed variables come from the running Java program. After completion the trace can be reviewed backward and forward. Prediction feedback is separate from program correctness.

This is a single-thread guided debugger, not a general IDE debugger with arbitrary source-line breakpoints, call-stack inspection, semantic refactoring or arbitrary watch expressions. Keep/add trace calls in the edited program. Limit: 3000 checkpoints, five minutes per debug session, and 15 seconds of execution between pauses. Stop and leaving the workspace terminate the worker. Debug adapters are enabled only for debug runs; the opaque iframe and blocked JavaScript bridge stay enabled.

## Design and simulation tools

- ER library mission: up to eight entities, twelve attributes per entity, single-column primary keys, and twelve relationships. 1:1 emits a unique foreign key; 1:N emits a foreign key. Model N:M with a junction entity. Data types are TEXT in the generated introductory schema. Validate, run PostgreSQL, and export the design before leaving. The generated SQL editor is separate from the design; regenerate to apply design changes.
- Normalization: up to ten editable enrollment rows under the stated dependencies. Flat-table and decomposed SQL can both run. The reconstruction check compares this dataset in both directions. It is not a proof for arbitrary dependencies or datasets.
- Seven GUI/Applet simulations: division exceptions, traffic signals, pointer events, keyboard events, a basic calculator, message/lifecycle canvas, and factorial visualization. They are explicitly labeled simulations, not Swing/Applet source execution. Native browser input and accessible simulation buttons accommodate touch and keyboard use.

## Faculty evidence

Learning actions use the existing authenticated activity delivery queue with `kind=code_run` and `metadata.runType=learning-interaction`. Faculty history labels these “Learning activity”, not compiler successes. Actions include debug pauses/steps and predictions, ER validation/model data, normalization decisions, SQL results, simulation outcomes and reflections. Runtime and source fingerprints are attached where applicable. These are client-reported learning evidence, not trusted grades or proof of attention. Reflections are sent on leaving the reflection field. Design/session state is temporary unless explicitly exported or saved through the code workspace.

## Tester isolation

A tester remains a student-role account whose server-managed title is exactly `Platform tester`. Public registration cannot set this title. The server derives `isTester` from the stored user record, overriding any client-supplied telemetry flag. No password or testing email is embedded in application code.

Testers can explore the studio and access targeted published resources/assignments across cohorts, but cannot access faculty tools, hidden answers or another student's submissions. Normal users/people rosters and student analytics omit testers; faculty opens the separate “Tester activity” panel. Tester submissions are marked and excluded from bulk AI grading. Existing operational assignment counters may still include tester submissions; do not use them as a clean enrollment census. Normal student sign-up retains its eight-character password minimum; sign-in accepts existing account passwords as stored.

## Verification

`npm run test:tester` checks role boundaries, roster isolation, cross-cohort lab access and server-derived evidence identity using isolated records. `npm run test:studio` checks actual Java pause/resume and output, ER SQL, normalization reconstruction, seven simulations, reflection delivery and no horizontal overflow at widths 320, 390, 768 and 1440. These Chromium checks are not a certification of every browser or physical device; WebAssembly and current browser support are required.
