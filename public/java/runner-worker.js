/* Runs only inside runner-frame.html's opaque-origin, network-disabled sandbox. */
self.onmessage = async ({ data }) => {
  const started = performance.now();
  let stdout = "",
    stderr = "";
  const result = (status, extra = "") =>
    self.postMessage({
      result: {
        status,
        stdout,
        stderr: stderr + extra,
        durationMs: Math.round(performance.now() - started),
      },
    });
  try {
    const Buffer = BrowserFS.BFSRequire("buffer").Buffer;
    const mounts = new BrowserFS.FileSystem.MountableFileSystem();
    BrowserFS.initialize(mounts);
    mounts.mount(
      "/sys",
      new BrowserFS.FileSystem.ZipFS(new Buffer(data.runtime)),
    );
    mounts.mount("/work", new BrowserFS.FileSystem.InMemory());
    mounts.mount("/tmp", new BrowserFS.FileSystem.InMemory());
    const fs = BrowserFS.BFSRequire("fs");
    const process = BrowserFS.BFSRequire("process");
    process.chdir("/work");
    process.initializeTTYs();
    const capture = (stream, bytes) => {
      if (stream === "out") stdout += bytes.toString();
      else stderr += bytes.toString();
      if (stdout.length + stderr.length > 100000) {
        stdout = stdout.slice(0, 50000);
        stderr = stderr.slice(0, 50000);
        result(
          "error",
          "\nOutput exceeded 100 KB. Reduce the output and run again.",
        );
        self.close();
      }
    };
    process.stdout.on("data", (bytes) => capture("out", bytes));
    process.stderr.on("data", (bytes) => capture("err", bytes));
    fs.writeFileSync("/tmp/ecj.jar", new Buffer(data.compiler));
    fs.writeFileSync("/work/Main.java", data.code);
    // Bootstrap gives System.in a finite UTF-8 stream, including a real EOF.
    fs.writeFileSync(
      "/work/KgrLabLauncher.java",
      'public class KgrLabLauncher { public static void main(String[] args) { Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() { public void uncaughtException(Thread thread, Throwable error) { error.printStackTrace(); System.exit(1); } }); try { System.setIn(new java.io.FileInputStream("/tmp/stdin.txt")); Main.main(args); } catch (Throwable error) { error.printStackTrace(); System.exit(1); } } }',
    );
    fs.writeFileSync("/tmp/stdin.txt", data.stdin);
    const run = (args) =>
      new Promise((resolve) =>
        Doppio.VM.CLI(
          args,
          {
            doppioHomePath: "/sys",
            properties: { "java.awt.headless": "true" },
          },
          resolve,
        ),
      );
    self.postMessage({ phase: "Compiling Java…" });
    const compiled = await run([
      "-Djdt.compiler.useSingleThread=true",
      "-jar",
      "/tmp/ecj.jar",
      "-1.8",
      "-encoding",
      "UTF-8",
      "-proc:none",
      "-warn:none",
      "-d",
      "/work",
      "/work/Main.java",
      "/work/KgrLabLauncher.java",
    ]);
    if (compiled !== 0) {
      result("error");
      return;
    }
    self.postMessage({ phase: "Running Java…" });
    const exit = await run([
      "-Djava.awt.headless=true",
      "-cp",
      "/work",
      "KgrLabLauncher",
    ]);
    result(exit === 0 ? "passed" : "error");
  } catch (error) {
    result(
      "error",
      "\n" + (error instanceof Error ? error.message : String(error)),
    );
  }
};
