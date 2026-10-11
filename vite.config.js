import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
    // Proxy de /api al backend: hace que el frontend funcione incluso si
    // VITE_API_URL apunta a un host/puerto incorrecto (evita CORS y errores
    // de conexión que bloqueaban el login).
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
