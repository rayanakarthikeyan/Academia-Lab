import { readFileSync } from "node:fs";

let brand = { name: "AsterLab" };
try {
  brand = JSON.parse(
    readFileSync(new URL("../shared/brand.json", import.meta.url), "utf8"),
  );
} catch {
  // fallback if path is not resolved in bundled environment
}

export const APP_NAME =
  process.env.APP_NAME?.trim() ||
  process.env.VITE_APP_NAME?.trim() ||
  brand.name ||
  "AsterLab";

