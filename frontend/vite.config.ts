import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");
  const apiServer = env.VITE_API_URL || "http://localhost:3001";

  return {
    server: {
      host: "0.0.0.0",
      allowedHosts: ["written-dullness-hexagram.ngrok-free.dev"],
      proxy: { "/api": apiServer }
    },
    preview: { proxy: { "/api": apiServer } },
    plugins: [tailwindcss(), react()]
  };
});
