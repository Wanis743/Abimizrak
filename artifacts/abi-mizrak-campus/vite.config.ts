import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);
if (!Number.isFinite(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

export default defineConfig({
  envDir: "../../",
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss({ optimize: false })],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
  server: { port, strictPort: true, host: process.env.VITE_HOST ?? "127.0.0.1", allowedHosts: ["localhost", "127.0.0.1", "::1"], fs: { strict: true } },
  preview: { port, host: process.env.VITE_HOST ?? "127.0.0.1", allowedHosts: ["localhost", "127.0.0.1", "::1"] },
});
