import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    base: './',
    exclude: ['@babylonjs/gui']
  }
});