import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authHeaders, clearStoredToken, getStoredToken, setStoredToken } from "@/lib/auth";
import { getOAuthRedirectUri } from "@/lib/edutalkAuth";
import { isTeamLeadAccount, type LeaveBrand } from "@/lib/saturdayLeave";

export interface AuthManager {
  id: number;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  employeeCode: number | null;
}

export interface AuthPosition {
  accountType: { id: number; name: string; slug: string | null } | null;
  department: string | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
  employeeCode: number | null;
  parentId: number | null;
  manager: AuthManager | null;
  position: AuthPosition | null;
  leaveBrand: LeaveBrand | null;
  saturdayLeaveTracked: boolean;
  isTeamLead?: boolean;
}

export const useAuthStore = defineStore("auth", () => {
  const user = ref<AuthUser | null>(null);
  const isAuthLoading = ref(true);

  const isAuthenticated = computed(() => !!user.value);
  const isTeamLead = computed(
    () => Boolean(user.value?.isTeamLead) || isTeamLeadAccount(user.value?.position)
  );

  async function restoreSession() {
    isAuthLoading.value = true;
    const token = getStoredToken();
    if (!token) {
      user.value = null;
      isAuthLoading.value = false;
      return;
    }

    try {
      const res = await fetch("/api/auth/me", { headers: { ...authHeaders() } });
      if (!res.ok) {
        clearStoredToken();
        user.value = null;
        return;
      }
      user.value = (await res.json()) as AuthUser;
    } catch {
      clearStoredToken();
      user.value = null;
    } finally {
      isAuthLoading.value = false;
    }
  }

  async function loginWithEdutalkCode(
    code: string,
    redirectUri = getOAuthRedirectUri()
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch("/api/auth/login/edutalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri })
      });
      const data = (await res.json().catch(() => ({}))) as {
        token?: string;
        user?: AuthUser;
        error?: string;
      };

      if (!res.ok || !data.token || !data.user) {
        return { ok: false, error: data.error ?? "Đăng nhập thất bại." };
      }

      setStoredToken(data.token);
      user.value = data.user;
      return { ok: true };
    } catch {
      return { ok: false, error: "Không kết nối được tới máy chủ." };
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { ...authHeaders() }
      });
    } catch {
      // ignore
    }
    clearStoredToken();
    user.value = null;
  }

  return {
    user,
    isAuthLoading,
    isAuthenticated,
    isTeamLead,
    restoreSession,
    loginWithEdutalkCode,
    logout
  };
});
