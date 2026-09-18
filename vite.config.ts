import { defineConfig, loadEnv } from "vite";
import brand from "./shared/brand.json";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const name =
    loadEnv(mode, process.cwd(), "VITE_").VITE_APP_NAME?.trim() || brand.name;
  const escapeHtml = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]!,
    );
  return {
    base: "/",
    optimizeDeps: { exclude: ["@electric-sql/pglite"] },
    worker: { format: "es" },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "platform-brand",
        transformIndexHtml(html) {
          const title = `${name}: ${brand.subtitle}`;
          return html
            .replaceAll("__APP_TITLE__", escapeHtml(title))
            .replaceAll(
              "__APP_DESCRIPTION__",
              escapeHtml(`${title}. ${brand.tagline}`),
            );
        },
      },
    ],
    build: {
      assetsDir: "assets",
      cssCodeSplit: true,
      emptyOutDir: true,
      sourcemap: false,
      target: "es2020",
    },
    preview: {
      host: "127.0.0.1",
      port: 4173,
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
  };
});
