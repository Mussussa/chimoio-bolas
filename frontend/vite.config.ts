import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: ["written-dullness-hexagram.ngrok-free.dev"],
    proxy: { "/api": "http://localhost:3001" }
  },
  preview: { proxy: { "/api": "http://localhost:3001" } },
  plugins: [react()]
});
