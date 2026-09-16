/* Runs only inside runner-frame.html's opaque-origin, network-disabled sandbox. */
self.onmessage = async ({ data }) => {
  if (data.debugResume) {
    const thread = self.asterDebugThread;
    self.asterDebugThread = null;
    if (thread) thread.asyncReturn();
    return;
  }
  const started = performance.now();
  let stdout = "",
    stderr = "";
  let outputFiles = [];
  const result = (status, extra = "") =>
    self.postMessage({
      result: {
        status,
        stdout,
        stderr: stderr + extra,
        durationMs: Math.round(performance.now() - started),
        files: outputFiles,
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
    const files = data.files || [];
    if (!Array.isArray(files) || files.length > 10)
      throw new Error("Upload at most 10 files.");
    let inputBytes = 0;
    const names = new Set();
    for (const file of files) {
      if (
        !/^[a-zA-Z0-9][a-zA-Z0-9._ -]{0,79}$/.test(file.name) ||
        /\.(java|class)$/i.test(file.name) ||
        names.has(file.name)
      )
        throw new Error(
          "Use unique data filenames without folders or Java source extensions.",
        );
      names.add(file.name);
      const bytes = new Buffer(file.base64, "base64");
      inputBytes += bytes.length;
      if (inputBytes > 1048576)
        throw new Error("Uploaded files must total 1 MB or less.");
      fs.writeFileSync("/work/" + file.name, bytes);
    }
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
    fs.writeFileSync("/tmp/h2.jar", new Buffer(data.jdbc));
    if (data.debug) {
      // Pinned Doppio ThreadStatus.ASYNC_WAITING = 6. A resume message performs
      // asyncReturn on this native frame; the Java thread cannot advance meanwhile.
      fs.mkdirSync("/tmp/debug-natives");
      fs.writeFileSync(
        "/tmp/debug-natives/aster-debug.js",
        'registerNatives({"AsterDebug":{"pause(Ljava/lang/String;IIIZ)V":function(thread,stage,n,candidate,divisor,prime){if(self.asterDebugThread){thread.throwNewException("Ljava/lang/IllegalStateException;","Only one debug thread is supported");return;} self.asterDebugThread=thread;thread.setStatus(6);self.postMessage({debugSnapshot:{stage:stage.toString(),n:n,candidate:candidate,divisor:divisor,prime:!!prime}});}}});',
      );
      fs.writeFileSync(
        "/work/AsterDebug.java",
        "public class AsterDebug { public static native void pause(String stage, int n, int candidate, int divisor, boolean prime); }",
      );
    }
    // Ignore comments and literals when locating a conventional entry class.
    const sourceHeader = data.code.replace(
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
      " ",
    );
    const identifier = "[A-Za-z_$][A-Za-z0-9_$]*";
    const publicClass = sourceHeader.match(
      new RegExp(
        "\\bpublic\\s+(?:(?:final|abstract|strictfp)\\s+)*class\\s+(" +
          identifier +
          ")",
      ),
    );
    const firstClass = sourceHeader.match(
      new RegExp("\\bclass\\s+(" + identifier + ")"),
    );
    const entryClass = publicClass?.[1] || firstClass?.[1] || "Main";
    const packageName = sourceHeader.match(
      new RegExp(
        "\\bpackage\\s+(" + identifier + "(?:\\." + identifier + ")*)\\s*;",
      ),
    )?.[1];
    const mainClass = packageName ? packageName + "." + entryClass : entryClass;
    fs.writeFileSync("/work/" + entryClass + ".java", data.code);
    // Bootstrap gives System.in a finite UTF-8 stream, including a real EOF.
    fs.writeFileSync(
      "/work/AsterLabLauncher.java",
      'public class AsterLabLauncher { public static void main(String[] args) { Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() { public void uncaughtException(Thread thread, Throwable error) { error.printStackTrace(); System.exit(1); } }); try { System.setIn(new java.io.FileInputStream("/tmp/stdin.txt")); java.lang.reflect.Method main = Class.forName("' +
        mainClass +
        '").getMethod("main", String[].class); main.setAccessible(true); main.invoke(null, (Object) args); } catch (Throwable error) { error.printStackTrace(); System.exit(1); } } }',
    );
    fs.writeFileSync("/tmp/stdin.txt", data.stdin);
    const run = (args) =>
      new Promise((resolve) =>
        Doppio.VM.CLI(
          args,
          {
            doppioHomePath: "/sys",
            properties: { "java.awt.headless": "true" },
            ...(data.debug
              ? { nativeClasspath: ["/sys/natives", "/tmp/debug-natives"] }
              : {}),
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
      "-classpath",
      "/work:/tmp/h2.jar",
      "-d",
      "/work",
      "/work/" + entryClass + ".java",
      "/work/AsterLabLauncher.java",
      ...(data.debug ? ["/work/AsterDebug.java"] : []),
    ]);
    if (compiled !== 0) {
      result("error");
      return;
    }
    if (data.compileOnly) {
      result("passed");
      return;
    }
    self.postMessage({ phase: "Running Java…" });
    const exit = await run([
      "-Djava.awt.headless=true",
      "-cp",
      "/work:/tmp/h2.jar",
      "AsterLabLauncher",
    ]);
    let outputBytes = 0;
    for (const name of fs.readdirSync("/work")) {
      const path = "/work/" + name;
      if (/\.(java|class)$/i.test(name) || !fs.statSync(path).isFile())
        continue;
      const size = fs.statSync(path).size;
      if (outputFiles.length >= 20 || outputBytes + size > 2097152) {
        stderr += "\nFile downloads limited to 20 files / 2 MB.";
        break;
      }
      outputBytes += size;
      outputFiles.push({
        name,
        base64: fs.readFileSync(path).toString("base64"),
      });
    }
    result(exit === 0 ? "passed" : "error");
  } catch (error) {
    result(
      "error",
      "\n" + (error instanceof Error ? error.message : String(error)),
    );
  }
};
