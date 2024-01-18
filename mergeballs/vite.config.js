import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    base: './docs',
    exclude: ['@babylonjs/gui']
  }
});