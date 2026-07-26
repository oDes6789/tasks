<template>
  <aside
    class="fixed left-0 top-0 z-50 flex h-full w-72 flex-col gap-base bg-surface-container-low p-stack-md"
  >
    <div class="mb-stack-lg px-4">
      <h1 class="text-headline-md font-bold text-primary">TaskSpace</h1>
      <p class="text-label-md text-on-surface-variant">Workspace Management</p>
    </div>

    <nav class="flex flex-grow flex-col gap-2">
      <RouterLink
        v-for="item in mainLinks"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-4 rounded-full px-6 py-4 text-on-surface-variant transition-transform active:scale-95 hover:bg-surface-container-high"
        :class="isActive(item.to) ? 'bg-secondary-container font-bold text-primary' : ''"
      >
        <Icon :name="item.icon" />
        <span class="text-label-md">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="mb-stack-md px-4">
      <button
        type="button"
        class="w-full rounded-full bg-primary py-4 text-label-md text-on-primary shadow-lg transition-all hover:brightness-110"
        @click="$emit('new-task')"
      >
        New Task
      </button>
    </div>

    <div class="flex flex-col gap-2 border-t border-surface-container-highest pt-stack-sm">
      <RouterLink
        v-for="item in secondaryLinks"
        :key="item.to"
        :to="item.to"
        class="group flex items-center gap-4 rounded-full px-6 py-3 text-on-surface-variant transition-transform active:scale-95 hover:bg-surface-container-high"
      >
        <Icon :name="item.icon" />
        <span class="text-label-md">{{ item.label }}</span>
      </RouterLink>
      <button
        type="button"
        class="group flex items-center gap-4 rounded-full px-6 py-3 text-left text-on-surface-variant transition-transform active:scale-95 hover:bg-surface-container-high"
        @click="$emit('show-shortcuts')"
      >
        <Icon name="keyboard" />
        <span class="min-w-0 flex-1 text-label-md">Phím tắt</span>
        <kbd class="shortcut-kbd !px-1.5 !py-0.5 !text-[10px]">?</kbd>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";
import Icon from "@/components/Icon.vue";

defineEmits<{
  "new-task": [];
  "show-shortcuts": [];
}>();

const route = useRoute();

const mainLinks = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/tasks", label: "Mục tiêu tuần", icon: "assignment" },
  { to: "/muc-tieu-ca-nhan", label: "Mục tiêu cá nhân", icon: "person" },
  { to: "/ke-hoach", label: "Kế hoạch ngày", icon: "calendar_month" },
  { to: "/lich-hop", label: "Lịch họp", icon: "event" },
  { to: "/nghi-thu-7", label: "Nghỉ Thứ 7", icon: "event_busy" },
  { to: "/nhan-su", label: "Quản lý nhân sự", icon: "group" },
  { to: "/okrs", label: "OKR Management", icon: "track_changes" }
];

const secondaryLinks = [
  { to: "/settings", label: "Settings", icon: "settings" },
  { to: "/support", label: "Support", icon: "help" }
];

function isActive(to: string) {
  if (to === "/") return route.path === "/";
  return route.path === to || route.path.startsWith(`${to}/`);
}
</script>
