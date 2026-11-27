// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { readFileSync } from "node:fs";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import type { Plugin } from "vite";
import packageJson from "./package.json" with { type: "json" };

const nitroPreset = process.env["VERCEL"] ? "vercel" : "node-server";

function offlineAssetsPlugin(): Plugin {
  return {
    name: "knowly-offline-assets",
    apply: "build",
    generateBundle(_options, bundle) {
      if (this.environment.config.build.ssr) return;

      const assets = Object.keys(bundle)
        .filter((fileName) => fileName.startsWith("assets/") && !fileName.endsWith(".map"))
        .map((fileName) => `/${fileName}`)
        .sort();
      if (assets.length === 0) return;

      this.emitFile({
        type: "asset",
        fileName: "knowly-precache.json",
        source: `${JSON.stringify({ version: packageJson.version, assets }, null, 2)}\n`,
      });
      this.emitFile({
        type: "asset",
        fileName: "knowly-icon.png",
        source: readFileSync(new URL("./src/assets/knowly-logo.png", import.meta.url)),
      });
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [offlineAssetsPlugin()],
    define: {
      __KNOWLY_VERSION__: JSON.stringify(packageJson.version),
    },
  },
  tanstackStart: {
    server: {
      entry: "server",
    },
  },

  nitro: {
    preset: nitroPreset,
  },
});
