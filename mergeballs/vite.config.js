import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    exclude: ['@babylonjs/gui']
  }
});