/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["**/node_modules/**", "**/.claude/**"],
  },
  server: {
    port: 3000,
    proxy: {
      "/upload": "http://localhost:8000",
      "/entities": "http://localhost:8000",
      "/insights": "http://localhost:8000",
      "/health": "http://localhost:8000",
    },
  },
});
