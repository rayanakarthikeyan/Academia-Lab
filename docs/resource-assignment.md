# Theory resources and practice

Faculty choose a course and unit, attach materials, and save a draft or publish. Drafts may omit the link and leave practice titles/tasks unfinished; publication validates them. Faculty can edit drafts, unpublish, and republish. Unpublishing retains submitted work.

Resource recipients follow Enrollment management. A student must match a published course cohort (department, year and section, or an explicit all-students publication) and have an active/completed course enrollment. No per-resource student picker is used. Existing recipient lists no longer determine access. Resources may be published before any students register; eligibility is evaluated on each request, so later registrations/enrollments are included. No matching publication means no access. Testers retain their separate preview privileges for published resources.

The resource list, self-enrollment, tutor context, practice submissions and resource telemetry enforce course access on the server. The student app refreshes resources and publications on focus and every minute while visible. External documents remain at their original URL; unpublishing cannot revoke copies or previously known external links.

New Java resources offer Java practice; DBMS resources offer SQL. Existing Java visual questions remain editable. Input and reference output are optional. Java accepts student stdin; SQL students edit values, INSERT statements and queries directly. Missing output disables sample comparison, not execution.

Each question has an optional Require student submission checkbox (off by default). Enabled questions retain final source, input and student-reported output in a protected, ungraded resource_practice record. Students can read only their own work. Retries return the same saved submission. Final work is locked. Faculty open Practice submissions on the resource to review it, with separate tester evidence and pagination. Once someone submits, changing practice questions/course requires a new resource; ordinary metadata and publication changes remain available.

No schema migration is needed: practice settings use resources.practice_questions JSON, and responses use learning_records. API and browser regression tests cover cohort boundaries, late signup/enrollment, unpublished access denial, optional samples, drafts/reload, chosen input, submission privacy, repeat requests and retained faculty review.
