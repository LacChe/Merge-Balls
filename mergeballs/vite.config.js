import { defineConfig } from "vite";

export default defineConfig({
  optimizeDeps: {
    base: './merge-balls/docs',
    exclude: ['@babylonjs/gui']
  }
});