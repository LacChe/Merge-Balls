import { defineConfig } from "vite";

export default defineConfig({
  base: '/docs/',
  optimizeDeps: {
    exclude: ['@babylonjs/gui']
  }
});