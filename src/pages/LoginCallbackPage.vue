<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-background px-4"
  >
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-72 w-full max-w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
    />

    <div
      class="relative z-10 w-full max-w-md rounded-lg border border-surface-container bg-surface-container-lowest p-5 text-center ambient-shadow-lg sm:p-8"
    >
      <div
        class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-container/15"
      >
        <Icon v-if="error" name="error" icon-class="text-3xl text-error" />
        <Icon v-else name="progress_activity" icon-class="animate-spin text-3xl text-primary" />
      </div>

      <h1 class="text-headline-md text-on-surface">
        {{ error ? "Đăng nhập thất bại" : "Đang xác nhận đăng nhập Edutalk..." }}
      </h1>

      <template v-if="error">
        <p class="mt-3 text-sm leading-relaxed text-error">{{ error }}</p>
        <RouterLink
          to="/dang-nhap"
          class="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-on-primary"
        >
          <Icon name="login" />
          Quay lại đăng nhập
        </RouterLink>
      </template>
      <template v-else>
        <p class="mt-3 text-sm text-on-surface-variant">Vui lòng đợi trong giây lát.</p>
        <div
          v-if="isSlow"
          class="mt-4 rounded-2xl border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant"
        >
          Kết nối đang chậm. Nếu chờ quá lâu, vui lòng quay lại đăng nhập và thử lại.
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import { getStoredToken } from "@/lib/auth";
import {
  clearOAuthCallbackQuery,
  consumeOAuthState,
  getOAuthRedirectUri,
  isOAuthCodeUsed,
  markOAuthCodeUsed
} from "@/lib/edutalkAuth";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const error = ref("");
const isSlow = ref(false);
let handled = false;
let slowTimer = 0;

onMounted(() => {
  slowTimer = window.setTimeout(() => {
    isSlow.value = true;
  }, 6000);
});

onUnmounted(() => {
  window.clearTimeout(slowTimer);
});

watch(
  () => auth.isAuthLoading,
  (loading) => {
    if (!loading) void handleCallback();
  },
  { immediate: true }
);

async function handleCallback() {
  if (auth.isAuthLoading) return;

  if (auth.user || getStoredToken()) {
    await router.replace({ name: "dashboard" });
    return;
  }

  if (handled) return;

  const code = typeof route.query.code === "string" ? route.query.code : null;
  const state = typeof route.query.state === "string" ? route.query.state : null;
  const oauthError = typeof route.query.error === "string" ? route.query.error : null;

  if (oauthError === "access_denied") {
    handled = true;
    clearOAuthCallbackQuery();
    error.value = "Bạn đã hủy xác nhận chia sẻ thông tin đăng nhập.";
    return;
  }

  if (!code) {
    handled = true;
    error.value = "Thiếu mã xác thực từ Edutalk.";
    return;
  }

  if (isOAuthCodeUsed(code)) {
    handled = true;
    clearOAuthCallbackQuery();
    error.value = "Liên kết đăng nhập đã được sử dụng. Vui lòng đăng nhập lại.";
    return;
  }

  handled = true;
  markOAuthCodeUsed(code);
  clearOAuthCallbackQuery();

  if (!consumeOAuthState(state)) {
    console.warn("OAuth state mismatch. Continuing with code exchange.");
  }

  const result = await auth.loginWithEdutalkCode(code, getOAuthRedirectUri());
  if (result.ok) {
    await router.replace({ name: "dashboard" });
  } else {
    error.value = result.error ?? "Đăng nhập thất bại.";
  }
}
</script>
