<template>
  <div class="relative" data-notices-root>
    <button
      type="button"
      class="relative p-2 text-on-surface-variant transition-colors hover:text-primary"
      :aria-label="
        notices.hasUnread
          ? `Thông báo (${notices.unreadCount} chưa đọc)`
          : 'Thông báo'
      "
      :aria-expanded="open"
      @click.stop="toggle"
    >
      <Icon name="notifications" />
      <span
        v-if="notices.hasUnread"
        class="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold leading-none text-white"
      >
        {{ badgeLabel }}
      </span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-12 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-surface-container bg-white ambient-shadow-lg"
      @click.stop
    >
      <div class="flex items-center justify-between gap-3 border-b border-surface-container px-4 py-3">
        <h3 class="text-label-md font-bold text-on-surface">Thông báo</h3>
        <button
          v-if="notices.hasUnread"
          type="button"
          class="text-xs font-medium text-primary underline-offset-2 hover:underline"
          @click="onMarkAll"
        >
          Đánh dấu đã đọc
        </button>
      </div>

      <div class="max-h-96 overflow-y-auto">
        <div v-if="notices.loading && !notices.items.length" class="px-4 py-8 text-center text-sm text-on-surface-variant">
          Đang tải…
        </div>
        <div v-else-if="notices.loadError" class="px-4 py-8 text-center text-sm text-error">
          {{ notices.loadError }}
        </div>
        <div v-else-if="!notices.items.length" class="px-4 py-8 text-center text-sm text-on-surface-variant">
          Chưa có thông báo nào.
        </div>
        <button
          v-for="item in notices.items"
          :key="item.id"
          type="button"
          class="flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-low"
          :class="item.readAt ? 'opacity-75' : 'bg-primary/[0.03]'"
          @click="onOpen(item)"
        >
          <div
            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            :class="iconWrapClass(item.type)"
          >
            <Icon :name="iconName(item.type)" icon-class="text-[18px]" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-body-md text-on-surface">
              <span class="font-bold">{{ item.actorName || "Hệ thống" }}</span>
              <span class="font-medium"> · {{ shortTitle(item) }}</span>
            </p>
            <p v-if="item.body" class="mt-0.5 truncate text-sm text-on-surface-variant">
              {{ item.body }}
            </p>
            <p class="mt-1 flex items-center gap-2 text-xs text-on-surface-variant">
              <span>{{ relativeTime(item.createdAt) }}</span>
              <span
                v-if="!item.readAt"
                class="inline-block h-1.5 w-1.5 rounded-full bg-error"
                aria-label="Chưa đọc"
              />
            </p>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/Icon.vue";
import { useAuthStore } from "@/stores/auth";
import { useNoticesStore, type NoticeItem, type NoticeType } from "@/stores/notices";

const open = ref(false);
const notices = useNoticesStore();
const auth = useAuthStore();
const router = useRouter();

const badgeLabel = computed(() =>
  notices.unreadCount > 99 ? "99+" : String(notices.unreadCount)
);

function iconName(type: NoticeType): string {
  switch (type) {
    case "task":
      return "assignment";
    case "goal":
      return "person";
    case "leave":
      return "event_busy";
    case "day_plan":
      return "calendar_month";
    case "meeting":
      return "event";
    default:
      return "notifications";
  }
}

function iconWrapClass(type: NoticeType): string {
  switch (type) {
    case "goal":
      return "bg-secondary-container text-secondary";
    case "leave":
      return "bg-error-container/40 text-error";
    case "task":
      return "bg-primary/10 text-primary";
    default:
      return "bg-surface-container-high text-on-surface-variant";
  }
}

function shortTitle(item: NoticeItem): string {
  const title = item.title || "";
  const actor = item.actorName || "Hệ thống";
  if (title.startsWith(actor)) {
    return title.slice(actor.length).replace(/^[\s·\-–—]+/, "") || title;
  }
  return title;
}

function relativeTime(iso: string): string {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return iso;
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 60) return "Vừa xong";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} phút trước`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} giờ trước`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)} ngày trước`;
  return new Date(ts).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function toggle() {
  open.value = !open.value;
  if (open.value) {
    await notices.fetchNotices();
  }
}

async function onMarkAll() {
  await notices.markAllRead();
}

async function onOpen(item: NoticeItem) {
  await notices.markRead(item.id);
  open.value = false;
  if (item.link) {
    await router.push(item.link);
  }
}

function onDocClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target?.closest("[data-notices-root]")) {
    open.value = false;
  }
}

watch(
  () => auth.user?.id,
  (id) => {
    if (id) {
      notices.startPolling();
    } else {
      notices.reset();
      open.value = false;
    }
  },
  { immediate: true }
);

onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => {
  document.removeEventListener("click", onDocClick);
  notices.stopPolling();
});
</script>
