import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import "primeicons/primeicons.css";
import App from "./App.vue";
import router from "./router";
import { useAuthStore } from "./stores/auth";
import "./style.css";

const AppPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#eef0ff",
      100: "#e1e0ff",
      200: "#c0c1ff",
      300: "#9a9cf5",
      400: "#6f71e8",
      500: "#4648d4",
      600: "#3a3cbf",
      700: "#2f2ebe",
      800: "#25269a",
      900: "#1c1d70",
      950: "#121348"
    }
  }
});

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: AppPreset,
    options: {
      darkModeSelector: false
    }
  },
  locale: {
    firstDayOfWeek: 1,
    dayNames: ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"],
    dayNamesShort: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    dayNamesMin: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    monthNames: [
      "Tháng 1",
      "Tháng 2",
      "Tháng 3",
      "Tháng 4",
      "Tháng 5",
      "Tháng 6",
      "Tháng 7",
      "Tháng 8",
      "Tháng 9",
      "Tháng 10",
      "Tháng 11",
      "Tháng 12"
    ],
    monthNamesShort: [
      "Thg 1",
      "Thg 2",
      "Thg 3",
      "Thg 4",
      "Thg 5",
      "Thg 6",
      "Thg 7",
      "Thg 8",
      "Thg 9",
      "Thg 10",
      "Thg 11",
      "Thg 12"
    ],
    today: "Hôm nay",
    clear: "Xóa",
    weekHeader: "Tuần"
  }
});

const auth = useAuthStore(pinia);
auth.restoreSession().finally(() => {
  app.mount("#app");
});
