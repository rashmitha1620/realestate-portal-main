import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,          // 👈 REQUIRED
    port: 5173,
    strictPort: true,

    // 👇 MUST be an array in Vite 5
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".trycloudflare.com", // 👈 wildcard support
    ],
  },
});
