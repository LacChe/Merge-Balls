import { defineConfig } from "vite";

export default defineConfig({
  base: "/Merge-Balls/",
  optimizeDeps: {
    exclude: ['@babylonjs/gui']
  }
});