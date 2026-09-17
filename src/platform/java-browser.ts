export interface JavaRunResult {
  status: "passed" | "error";
  stdout: string;
  stderr: string;
  durationMs: number;
  files?: RuntimeFile[];
}

export interface RuntimeFile {
  name: string;
  base64: string;
}

export interface RunOptions {
  compileOnly?: boolean;
  debug?: boolean;
  onDebugSnapshot?: (
    snapshot: {
      stage: string;
      n: number;
      candidate: number;
      divisor: number;
      prime: boolean;
    },
    resume: () => void,
  ) => void;
  files?: RuntimeFile[];
  signal?: AbortSignal;
  onProgress?: (phase: string) => void;
}

const base = `${import.meta.env.BASE_URL}java/`;
let assetsPromise:
  | Promise<{
      browserfs: string;
      doppio: string;
      worker: string;
      runtime: ArrayBuffer;
      compiler: ArrayBuffer;
      jdbc: ArrayBuffer;
    }>
  | undefined;

function getAssets() {
  if (!assetsPromise) {
    const fetchAsset = async (name: string) => {
      const response = await fetch(base + name, {
        credentials: "omit",
        signal: AbortSignal.timeout(110000),
      });
      if (!response.ok)
        throw new Error(
          "Java compiler download failed. Check your connection and try again.",
        );
      return response;
    };
    assetsPromise = Promise.all([
      fetchAsset("browserfs.min.js").then((r) => r.text()),
      fetchAsset("doppio.js").then((r) => r.text()),
      fetchAsset("runner-worker.js").then((r) => r.text()),
      fetchAsset("java8-runtime.zip").then((r) => r.arrayBuffer()),
      fetchAsset("ecj.jar").then((r) => r.arrayBuffer()),
      fetchAsset("h2.jar").then((r) => r.arrayBuffer()),
    ])
      .then(([browserfs, doppio, worker, runtime, compiler, jdbc]) => ({
        browserfs,
        doppio,
        worker,
        runtime,
        compiler,
        jdbc,
      }))
      .catch((error) => {
        assetsPromise = undefined;
        throw error;
      });
  }
  return assetsPromise;
}

export function runJavaInBrowser(
  code: string,
  stdin: string,
  options: RunOptions = {},
): Promise<JavaRunResult> {
  const start = performance.now();
  // H2 initializes a database inside the interpreted JVM before student SQL runs.
  // Keep this bounded, but allow slower devices time for that initialization.
  const executionSeconds = /java\.sql|org\.h2|jdbc:h2/.test(code) ? 60 : 15;
  return new Promise((resolve) => {
    let frame: HTMLIFrameElement | undefined;
    let done = false;
    let executionTimer: ReturnType<typeof setTimeout> | undefined;
    let debugTimer: ReturnType<typeof setTimeout> | undefined;
    const finish = (result: JavaRunResult) => {
      if (done) return;
      done = true;
      clearTimeout(loadTimer);
      clearTimeout(executionTimer);
      clearTimeout(debugTimer);
      options.signal?.removeEventListener("abort", cancel);
      window.removeEventListener("message", receive);
      frame?.contentWindow?.postMessage({ type: "cancel" }, "*");
      frame?.remove();
      resolve(result);
    };
    const fail = (stderr: string) =>
      finish({
        status: "error",
        stdout: "",
        stderr,
        durationMs: Math.round(performance.now() - start),
      });
    const cancel = () => fail("Execution stopped.");
    const loadTimer = setTimeout(
      () =>
        fail(
          "Java could not load within 2 minutes. Check your connection and try again.",
        ),
      120000,
    );
    const receive = (event: MessageEvent) => {
      if (
        !frame ||
        event.source !== frame.contentWindow ||
        event.data?.type !== "kgr-java"
      )
        return;
      if (options.debug && event.data.debugSnapshot) {
        clearTimeout(executionTimer);
        let resumed = false;
        options.onDebugSnapshot?.(event.data.debugSnapshot, () => {
          if (done || resumed) return;
          resumed = true;
          executionTimer = setTimeout(
            () =>
              fail("Java execution exceeded 15 seconds between checkpoints."),
            15000,
          );
          frame?.contentWindow?.postMessage({ type: "debug-resume" }, "*");
        });
        return;
      }
      if (event.data.phase) {
        options.onProgress?.(String(event.data.phase));
        if (event.data.phase === "Running Java…") {
          if (options.debug)
            debugTimer = setTimeout(
              () =>
                fail(
                  "Debug session reached its 5-minute limit. Start a new session.",
                ),
              300000,
            );
          clearTimeout(executionTimer);
          executionTimer = setTimeout(
            () =>
              fail(
                `Java execution exceeded ${executionSeconds} seconds. Check for infinite loops or waiting threads.`,
              ),
            executionSeconds * 1000,
          );
        }
      }
      if (event.data.error) fail(String(event.data.error));
      if (event.data.result) {
        const result = event.data.result;
        finish({
          status: result.status === "passed" ? "passed" : "error",
          stdout: String(result.stdout || "").slice(0, 100000),
          stderr: String(result.stderr || "").slice(0, 100000),
          durationMs: Math.round(performance.now() - start),
          files: Array.isArray(result.files) ? result.files : [],
        });
      }
    };
    options.signal?.addEventListener("abort", cancel, { once: true });
    if (options.signal?.aborted) {
      cancel();
      return;
    }
    if (!code.trim()) {
      fail("Enter Java source before running.");
      return;
    }
    if (code.length > 100000 || stdin.length > 10000) {
      fail("Source is limited to 100 KB and input to 10 KB per run.");
      return;
    }
    options.onProgress?.(
      "Loading Java compiler (first download is about 38 MB)…",
    );
    void getAssets()
      .then((assets) => {
        if (done) return;
        frame = document.createElement("iframe");
        frame.hidden = true;
        frame.title = "Isolated Java compiler";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.src = base + "runner-frame.html";
        frame.onload = () => {
          if (done) return;
          clearTimeout(loadTimer);
          executionTimer = setTimeout(
            () =>
              fail(
                "Java compilation exceeded 60 seconds. Try a smaller program or a faster device.",
              ),
            60000,
          );
          // Transfer copies; retain the downloaded binaries for subsequent runs.
          const copy = {
            ...assets,
            runtime: assets.runtime.slice(0),
            compiler: assets.compiler.slice(0),
            jdbc: assets.jdbc.slice(0),
          };
          frame?.contentWindow?.postMessage(
            {
              type: "run",
              code,
              stdin,
              files: options.files || [],
              debug: options.debug === true,
              compileOnly: options.compileOnly === true,
              assets: copy,
            },
            "*",
            [copy.runtime, copy.compiler, copy.jdbc],
          );
        };
        window.addEventListener("message", receive);
        document.body.append(frame);
      })
      .catch((error) =>
        fail(error instanceof Error ? error.message : "Java could not load."),
      );
  });
}
