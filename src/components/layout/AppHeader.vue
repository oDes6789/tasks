<template>
  <header
    class="fixed left-72 right-0 top-0 z-40 flex h-16 items-center justify-between bg-surface-bright/80 px-container-padding shadow-sm backdrop-blur-md"
  >
    <div
      class="flex w-96 items-center rounded-full bg-surface-container-low px-4 py-2 transition-all focus-within:ring-2 focus-within:ring-primary/20"
    >
      <Icon name="search" icon-class="text-outline" />
      <input
        v-model="query"
        type="search"
        class="w-full border-none bg-transparent text-label-md placeholder:text-outline-variant focus:outline-none focus:ring-0"
        placeholder="Search tasks, teams, or OKRs..."
        @keyup.enter="emit('search', query)"
      />
    </div>

    <div class="flex items-center gap-4">
      <button
        type="button"
        class="p-2 text-on-surface-variant transition-colors hover:text-primary"
        aria-label="Notifications"
      >
        <Icon name="notifications" />
      </button>
      <button
        type="button"
        class="p-2 text-on-surface-variant transition-colors hover:text-primary"
        aria-label="Calendar"
      >
        <Icon name="calendar_today" />
      </button>

      <div class="mx-2 h-8 w-px bg-outline-variant" />

      <button
        type="button"
        class="flex items-center gap-3 rounded-full px-4 py-2 transition-colors hover:bg-surface-container"
        @click="menuOpen = !menuOpen"
      >
        <img
          :src="avatarSrc"
          :alt="userName"
          class="h-8 w-8 rounded-full object-cover"
        />
        <span class="text-label-md font-bold text-primary">{{ userName }}</span>
        <Icon name="expand_more" icon-class="text-on-surface-variant" />
      </button>

      <div
        v-if="menuOpen"
        class="absolute right-6 top-14 z-50 min-w-48 rounded-2xl border border-surface-container bg-white p-2 ambient-shadow-lg"
      >
        <p class="px-3 py-2 text-xs text-on-surface-variant">{{ userEmail }}</p>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-label-md text-error transition-colors hover:bg-error-container/40"
          @click="onLogout"
        >
          <Icon name="logout" />
          Đăng xuất
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import { useAuthStore } from "@/stores/auth";

const emit = defineEmits<{
  search: [query: string];
}>();

const auth = useAuthStore();
const router = useRouter();
const query = ref("");
const menuOpen = ref(false);

const userName = computed(() => auth.user?.name || "Quick Action");
const userEmail = computed(() => auth.user?.email || "");
const avatarSrc = computed(
  () =>
    auth.user?.avatarUrl ||
    "https://lh3.googleusercontent.com/aida-public/AB6AXuBEYLR4xPDjvGMfjlkZzrrHION38lq3vhXtTLn8GYa2x2yr4pPbPFv4d3KixeJkkeSaSvVAP_8IrVEypbvmeNHXEV0VblD5EQljH-JvcBWaxXUnLvCE3otRJBCh2-Yu3jHsUcLMhMiGF923VTjZRhqII_XJTrrE5isShSIdKc4ol5VTBrZskxp4NzJ6cy8EjIvhBWYNijcVo5h5W8uMOedHwxRI_Q-NdcXZM5Qs08lemVboK78qttRslHM_SQmhm9QtMk0IPzT1YS8"
);

async function onLogout() {
  menuOpen.value = false;
  await auth.logout();
  router.push({ name: "login" });
}

function onDocClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest("header")) menuOpen.value = false;
}

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));
</script>
