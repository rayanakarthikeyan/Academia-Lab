import { PGlite } from "@electric-sql/pglite";

// Each run gets a new in-memory database. No connection to the portal database.
self.onmessage = async ({ data }: MessageEvent<string>) => {
  const started = performance.now();
  let db: PGlite | undefined;
  let notices = "";
  try {
    self.postMessage({ phase: "Loading PostgreSQL…" });
    db = await PGlite.create();
    await db.exec("SET statement_timeout = '10s'; SET work_mem = '8MB';");
    self.postMessage({ phase: "Running SQL…" });
    const results = await db.exec(data, {
      rowMode: "array",
      onNotice: (notice) => {
        notices = (notices + notice.message + "\n").slice(0, 10000);
      },
    });
    let stdout = notices;
    for (const result of results) {
      if (!result.fields.length) continue;
      stdout += result.fields.map((field) => field.name).join(" | ") + "\n";
      for (const row of result.rows.slice(0, 1000)) {
        stdout +=
          (row as unknown[])
            .map((value) => (value === null ? "NULL" : String(value)))
            .join(" | ") + "\n";
        if (stdout.length > 100000) break;
      }
      if (result.rows.length > 1000)
        stdout += "[Results limited to 1000 rows]\n";
      if (stdout.length > 100000) break;
    }
    self.postMessage({
      status: "passed",
      stdout:
        stdout.slice(0, 100000).trim() ||
        "Query executed successfully. (No results to display)",
      stderr: "",
      durationMs: Math.round(performance.now() - started),
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      stdout: notices,
      stderr: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - started),
    });
  } finally {
    await db?.close();
  }
};
