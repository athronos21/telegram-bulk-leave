import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  plugins: [
    react(),
    // gramJS uses Node built-ins (crypto, buffer, stream, etc.)
    nodePolyfills({
      include: ["buffer", "crypto", "stream", "util", "process", "events"],
      globals: { Buffer: true, process: true },
    }),
  ],
  server: {
    port: 5173,
  },
  build: {
    // gramJS is large — increase the chunk warning threshold
    chunkSizeWarningLimit: 3000,
  },
});
