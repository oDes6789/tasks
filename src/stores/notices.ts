import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authHeaders } from "@/lib/auth";

export type NoticeType =
  | "task"
  | "goal"
  | "leave"
  | "day_plan"
  | "meeting"
  | "system"
  | "info";

export interface NoticeItem {
  id: number;
  userId: number;
  type: NoticeType;
  title: string;
  body: string;
  link: string | null;
  actorName: string;
  meta: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export const useNoticesStore = defineStore("notices", () => {
  const items = ref<NoticeItem[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const loadError = ref("");
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const hasUnread = computed(() => unreadCount.value > 0);

  async function fetchUnreadCount() {
    try {
      const res = await fetch("/api/notices/unread-count", {
        headers: { ...authHeaders() }
      });
      if (!res.ok) return;
      const data = await res.json();
      unreadCount.value = Number(data.unreadCount ?? 0) || 0;
    } catch {
      // keep previous count
    }
  }

  async function fetchNotices() {
    loading.value = true;
    loadError.value = "";
    try {
      const res = await fetch("/api/notices?limit=30", {
        headers: { ...authHeaders() }
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        loadError.value = body?.error || "Không tải được thông báo.";
        return;
      }
      const data = await res.json();
      items.value = Array.isArray(data.items) ? data.items : [];
      unreadCount.value = Number(data.unreadCount ?? 0) || 0;
    } catch {
      loadError.value = "Không tải được thông báo.";
    } finally {
      loading.value = false;
    }
  }

  async function markRead(id: number) {
    const target = items.value.find((n) => n.id === id);
    if (target?.readAt) return target;

    try {
      const res = await fetch(`/api/notices/${id}/read`, {
        method: "POST",
        headers: { ...authHeaders() }
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.notice) {
        items.value = items.value.map((n) => (n.id === id ? data.notice : n));
      }
      unreadCount.value = Number(data.unreadCount ?? unreadCount.value) || 0;
      return data.notice as NoticeItem;
    } catch {
      return null;
    }
  }

  async function markAllRead() {
    try {
      const res = await fetch("/api/notices/read-all", {
        method: "POST",
        headers: { ...authHeaders() }
      });
      if (!res.ok) return;
      const data = await res.json();
      unreadCount.value = Number(data.unreadCount ?? 0) || 0;
      const now = new Date().toISOString();
      items.value = items.value.map((n) =>
        n.readAt ? n : { ...n, readAt: now }
      );
    } catch {
      // ignore
    }
  }

  function startPolling(intervalMs = 60_000) {
    stopPolling();
    void fetchUnreadCount();
    pollTimer = setInterval(() => {
      void fetchUnreadCount();
    }, intervalMs);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function reset() {
    stopPolling();
    items.value = [];
    unreadCount.value = 0;
    loading.value = false;
    loadError.value = "";
  }

  return {
    items,
    unreadCount,
    loading,
    loadError,
    hasUnread,
    fetchNotices,
    fetchUnreadCount,
    markRead,
    markAllRead,
    startPolling,
    stopPolling,
    reset
  };
});
