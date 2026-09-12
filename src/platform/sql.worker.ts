import initSqlJs from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

self.onmessage = async (event: MessageEvent<string>) => {
  const start = performance.now();
  let db;
  try {
    const SQL = await initSqlJs({ locateFile: () => wasmUrl });
    db = new SQL.Database();
    const results = db.exec(event.data);
    let stdout = "";
    for (const result of results) {
      stdout += result.columns.join(" | ") + "\n";
      for (const row of result.values.slice(0, 1000)) {
        stdout +=
          row
            .map((value) => (value === null ? "NULL" : String(value)))
            .join(" | ") + "\n";
        if (stdout.length > 100000) break;
      }
      if (result.values.length > 1000)
        stdout += "[Results limited to 1000 rows]\n";
      if (stdout.length > 100000) break;
    }
    self.postMessage({
      status: "passed",
      stdout:
        stdout.slice(0, 100000).trim() ||
        "Query executed successfully. (No results to display)",
      stderr: "",
      durationMs: Math.round(performance.now() - start),
    });
  } catch (error) {
    self.postMessage({
      status: "error",
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - start),
    });
  } finally {
    db?.close();
  }
};
