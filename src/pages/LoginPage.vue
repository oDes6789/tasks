<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4"
  >
    <div
      class="pointer-events-none absolute left-1/2 top-0 h-72 w-full max-w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-[100px]"
    />
    <div
      class="pointer-events-none absolute bottom-0 right-0 h-64 w-64 rounded-full bg-secondary-container/60 blur-[80px]"
    />

    <div class="relative z-10 w-full max-w-md">
      <div class="mb-8 text-center">
        <div
          class="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-container/15 ambient-shadow"
        >
          <Icon name="school" icon-class="text-3xl text-primary" />
        </div>
        <p class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">TaskSpace</p>
        <h1 class="text-headline-md text-on-surface">Đăng nhập hệ thống</h1>
        <p class="mt-3 text-body-md text-on-surface-variant">
          Sử dụng tài khoản Edutalk để truy cập không gian làm việc tổ chức giáo viên.
        </p>
      </div>

      <div
        class="space-y-5 rounded-lg border border-surface-container bg-surface-container-lowest p-6 ambient-shadow-lg sm:p-8"
      >
        <p
          v-if="error"
          class="flex items-start gap-2 rounded-2xl bg-error-container/50 px-4 py-3 text-sm text-on-error-container"
        >
          <Icon name="error" icon-class="mt-0.5 shrink-0" />
          {{ error }}
        </p>

        <button
          type="button"
          class="flex w-full items-center justify-center gap-3 rounded-full bg-primary py-3.5 text-sm font-bold text-on-primary shadow-lg transition-all hover:-translate-y-0.5 hover:brightness-110 disabled:opacity-50"
          :disabled="isSubmitting"
          @click="handleEdutalkLogin"
        >
          <img
            src="/logo.png"
            alt="Edutalk"
            class="size-6 shrink-0 rounded-md bg-white object-contain p-0.5"
          />
          <span>{{ isSubmitting ? "Đang chuyển tới Edutalk..." : "Đăng nhập bằng Edutalk" }}</span>
        </button>

        <button
          v-if="isDev"
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-full bg-secondary-container py-3 text-sm font-semibold text-primary transition-all hover:brightness-95"
          :disabled="isSubmitting"
          @click="handleDevLogin"
        >
          Xem Dashboard (dev)
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import { setStoredToken } from "@/lib/auth";
import { startEdutalkLogin } from "@/lib/edutalkAuth";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const error = ref("");
const isSubmitting = ref(false);
const isDev = import.meta.env.DEV;

if (auth.user) {
  router.replace({ name: "dashboard" });
}

function handleEdutalkLogin() {
  error.value = "";
  isSubmitting.value = true;
  startEdutalkLogin();
}

async function handleDevLogin() {
  error.value = "";
  isSubmitting.value = true;
  try {
    const res = await fetch("/api/auth/login/dev", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John Doe", email: "john@edutalk.edu.vn" })
    });
    const data = await res.json();
    if (!res.ok || !data.token) {
      error.value = data.error ?? "Dev login thất bại.";
      return;
    }
    setStoredToken(data.token);
    auth.user = data.user;
    await router.replace({ name: "dashboard" });
  } catch {
    error.value = "Không kết nối được tới máy chủ.";
  } finally {
    isSubmitting.value = false;
  }
}
</script>
