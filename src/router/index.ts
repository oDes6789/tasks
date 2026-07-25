import { createRouter, createWebHistory } from "vue-router";
import { getStoredToken } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/dang-nhap",
      name: "login",
      component: () => import("@/pages/LoginPage.vue"),
      meta: { guest: true }
    },
    {
      path: "/dang-nhap/callback",
      name: "login-callback",
      component: () => import("@/pages/LoginCallbackPage.vue"),
      meta: { guest: true }
    },
    {
      path: "/",
      component: () => import("@/components/layout/AppLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "dashboard",
          component: () => import("@/pages/DashboardPage.vue")
        },
        {
          path: "tasks",
          name: "tasks",
          component: () => import("@/pages/TaskBoardPage.vue")
        },
        {
          path: "muc-tieu-ca-nhan",
          name: "personal-goals",
          component: () => import("@/pages/PersonalGoalsPage.vue")
        },
        {
          path: "ke-hoach",
          name: "day-plan",
          component: () => import("@/pages/PersonDayPlanPage.vue")
        },
        {
          path: "ke-hoach/:personName",
          name: "day-plan-person",
          component: () => import("@/pages/PersonDayPlanPage.vue")
        }
      ]
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/"
    }
  ]
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  if (auth.isAuthLoading) {
    await auth.restoreSession();
  }

  const hasSession = !!auth.user || !!getStoredToken();

  if (to.meta.requiresAuth && !hasSession) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (to.meta.guest && auth.user && to.name !== "login-callback") {
    return { name: "dashboard" };
  }

  return true;
});

export default router;
