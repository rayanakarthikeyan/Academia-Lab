import { spawnSync } from "node:child_process";

// Start the local Vite preview separately. Browser tests use PLAYWRIGHT_MODULE,
// PLAYWRIGHT_EXECUTABLE_PATH and TEST_BASE_URL when supplied.
const suites = [
  "tutor-workflow",
  "tutor-browser",
  "workspace-layout",
  "workflow",
  "resource-workflow",
  "resource-browser",
  "tester-workflow",
  "features-browser",
  "ide-telemetry",
  "proctor-browser",
  "studio-browser",
  "studio-access",
  "draft-preview",
  "assigned-interactive",
  "interactive-release",
  "editor-chrome",
  "editor-errors",
  "java-browser",
  "runtime-extensions",
  "runtime-ui",
];
for (const suite of suites) {
  console.log(`\nBeta check: ${suite}`);
  const result = spawnSync(process.execPath, [`scripts/${suite}.test.mjs`], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`PASS: all ${suites.length} beta suites`);
