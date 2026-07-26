import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src")
    }
  },
  optimizeDeps: {
    include: [
      "vue",
      "vue-router",
      "pinia",
      "@primeuix/themes",
      "@primeuix/themes/aura",
      "primevue/config",
      "primevue/toastservice",
      "primevue/confirmationservice",
      "primevue/toast",
      "primevue/confirmdialog",
      "primevue/datepicker",
      "primevue/dialog",
      "primevue/inputtext",
      "primevue/select",
      "primevue/multiselect",
      "primevue/textarea",
      "primevue/chip",
      "primevue/useconfirm",
      "primevue/usetoast"
    ]
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true
  },
  server: {
    hmr: process.env.DISABLE_HMR !== "true"
  }
});
