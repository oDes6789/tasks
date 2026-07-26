<template>
  <div>
    <section class="mb-stack-lg flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-headline-lg text-on-surface">{{ greeting }}, {{ displayName }}</h2>
        <p class="mt-1 text-body-lg text-on-surface-variant">
          Tổng quan tuần · {{ weekLabel || "…" }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <RouterLink
          to="/tasks"
          class="rounded-full bg-secondary-container px-4 py-2 text-label-md text-primary transition-colors hover:bg-primary-fixed"
        >
          Mục tiêu tuần
        </RouterLink>
        <RouterLink
          to="/nghi-thu-7"
          class="rounded-full bg-surface-container-high px-4 py-2 text-label-md text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          Nghỉ Thứ 7
        </RouterLink>
      </div>
    </section>

    <p v-if="loadError" class="mb-4 rounded-lg bg-error-container/40 px-4 py-3 text-sm text-error">
      {{ loadError }}
    </p>

    <section class="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-4">
      <article
        v-for="card in summaryCards"
        :key="card.label"
        class="rounded-lg border border-surface-container bg-surface-container-lowest p-stack-md ambient-shadow transition-transform hover:-translate-y-1"
      >
        <div
          class="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          :class="card.iconWrap"
        >
          <Icon :name="card.icon" :icon-class="card.iconClass" />
        </div>
        <p class="text-label-md text-on-surface-variant">{{ card.label }}</p>
        <h3 class="mt-1 text-headline-md text-on-surface">{{ card.value }}</h3>
        <div class="mt-4 flex items-center gap-1 text-sm font-medium" :class="card.metaClass">
          <Icon :name="card.metaIcon" icon-class="text-sm" />
          <span>{{ card.meta }}</span>
        </div>
      </article>
    </section>

    <section class="mb-stack-lg grid grid-cols-1 gap-gutter md:grid-cols-3">
      <article
        class="rounded-lg border border-surface-container bg-surface-container-lowest p-stack-md"
      >
        <p class="text-label-md text-on-surface-variant">Mục tiêu cá nhân On Track</p>
        <p class="mt-1 text-headline-md text-on-surface">
          {{ goals.onTrack }}/{{ goals.total }}
        </p>
        <p class="mt-2 text-sm text-on-surface-variant">
          Done {{ goals.done }} · Đang làm {{ goals.inProgress }} · Pending {{ goals.pending }}
        </p>
      </article>
      <article
        class="rounded-lg border border-surface-container bg-surface-container-lowest p-stack-md"
      >
        <p class="text-label-md text-on-surface-variant">Day plan coverage</p>
        <p class="mt-1 text-headline-md text-on-surface">
          {{ dayPlan.coveragePct == null ? "—" : `${dayPlan.coveragePct}%` }}
        </p>
        <p class="mt-2 text-sm text-on-surface-variant">
          {{ dayPlan.peopleWithPlans }}/{{ dayPlan.peopleWithGoals }} người có kế hoạch ngày
        </p>
      </article>
      <article
        class="rounded-lg border border-surface-container bg-surface-container-lowest p-stack-md"
      >
        <p class="text-label-md text-on-surface-variant">Nghỉ T7 · {{ leave.month }}</p>
        <p class="mt-1 text-headline-md text-on-surface">
          {{ leave.overLimit }} vượt · {{ leave.nearCap }} gần 50%
        </p>
        <p class="mt-2 text-sm text-on-surface-variant">
          Theo dõi {{ leave.trackedCount }} người
          <template v-if="leave.byBrand.length">
            ·
            {{
              leave.byBrand
                .filter((b) => b.tracked > 0)
                .map((b) => `${b.label} ${b.tracked}`)
                .join(" · ")
            }}
          </template>
        </p>
      </article>
    </section>

    <div class="grid grid-cols-1 gap-stack-lg lg:grid-cols-3">
      <section
        class="rounded-lg border border-surface-container/30 bg-white p-stack-md ambient-shadow-lg lg:col-span-2"
      >
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-headline-md text-on-surface">Cập nhật gần đây</h3>
          <RouterLink
            to="/tasks"
            class="text-label-md text-primary underline-offset-4 hover:underline decoration-2"
          >
            Xem board
          </RouterLink>
        </div>

        <div v-if="loading && !activities.length" class="text-sm text-on-surface-variant">
          Đang tải…
        </div>
        <div v-else-if="!activities.length" class="text-sm text-on-surface-variant">
          Chưa có cập nhật nào trong tuần này.
        </div>
        <div v-else class="space-y-2">
          <div
            v-for="item in activities"
            :key="item.id"
            class="flex gap-4 rounded-xl p-4 transition-colors hover:bg-surface-container-low"
          >
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              :class="
                item.kind === 'goal' ? 'bg-secondary-container text-secondary' : 'bg-primary/10 text-primary'
              "
            >
              <Icon :name="item.kind === 'goal' ? 'person' : 'assignment'" icon-class="text-[18px]" />
            </div>
            <div class="min-w-0 flex-grow">
              <p class="truncate text-body-md text-on-surface">
                <span class="font-bold">{{ item.actor || "Hệ thống" }}</span>
                {{ " " }}đã cập nhật{{ " " }}
                <span class="font-medium text-primary">{{ item.title }}</span>
              </p>
              <p class="mt-1 text-sm text-on-surface-variant">
                {{ relativeTime(item.updatedAt) }} ·
                {{ item.kind === "goal" ? "Mục tiêu cá nhân" : "Mục tiêu tuần" }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-surface-container bg-surface-container-low p-stack-md">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-headline-md text-on-surface">PIC cần chú ý</h3>
          <RouterLink
            to="/muc-tieu-ca-nhan"
            class="rounded-full bg-white p-2 text-primary ambient-shadow transition-transform hover:scale-105"
            title="Mục tiêu cá nhân"
          >
            <Icon name="person" />
          </RouterLink>
        </div>

        <div v-if="!topDelayedPics.length" class="text-sm text-on-surface-variant">
          Không có PIC delayed / tồn đọng tuần này.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="pic in topDelayedPics"
            :key="pic.name"
            class="flex items-center justify-between rounded-2xl border border-white bg-white/50 p-3"
          >
            <p class="text-label-md font-bold text-on-surface">{{ pic.name }}</p>
            <span class="rounded-full bg-error-container/40 px-2.5 py-1 text-xs font-semibold text-error">
              {{ pic.count }} việc
            </span>
          </div>
        </div>

        <div class="mt-8">
          <div class="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p class="mb-2 text-sm font-medium text-primary">Tiến độ tuần (% Done)</p>
            <div class="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: `${stats.donePct}%` }"
              />
            </div>
            <p class="mt-2 text-right text-[12px] text-on-surface-variant">
              {{ stats.completed }}/{{ stats.totalTasks }} hoàn thành
            </p>
          </div>
        </div>
      </section>
    </div>

    <section
      v-if="categoriesWithWork.length"
      class="mt-stack-lg rounded-lg border border-surface-container bg-white p-stack-md ambient-shadow"
    >
      <h3 class="mb-4 text-headline-md text-on-surface">Phân bố theo category</h3>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="cat in categoriesWithWork"
          :key="cat.id"
          class="rounded-xl bg-surface-container-low px-4 py-3"
        >
          <p class="truncate text-sm font-medium text-on-surface">{{ cat.title }}</p>
          <p class="mt-1 text-label-md text-on-surface-variant">
            {{ cat.done }}/{{ cat.total }} done
          </p>
          <div class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-container-high">
            <div
              class="h-full rounded-full bg-secondary"
              :style="{ width: `${cat.total ? Math.round((cat.done / cat.total) * 100) : 0}%` }"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

interface DashboardStats {
  totalTasks: number;
  completed: number;
  inProgress: number;
  pending: number;
  donePct: number;
  kpiAchieved: number;
  kpiNotAchieved: number;
  kpiDelayed: number;
  kpiRated: number;
  kpiAchievedPct: number | null;
  backlogOpen: number;
  delayedCount: number;
  attentionCount: number;
  totalTasksDelta: number | null;
  donePctDelta: number | null;
}

interface GoalsSummary {
  total: number;
  done: number;
  inProgress: number;
  pending: number;
  onTrack: number;
}

interface DayPlanSummary {
  peopleWithGoals: number;
  peopleWithPlans: number;
  coveragePct: number | null;
}

interface LeaveSummary {
  month: string;
  trackedCount: number;
  nearCap: number;
  overLimit: number;
  byBrand: { brand: string; label: string; tracked: number }[];
}

interface Activity {
  id: string;
  kind: "task" | "goal";
  title: string;
  actor: string;
  updatedAt: string;
}

interface PicStat {
  name: string;
  count: number;
}

interface CategoryStat {
  id: number;
  title: string;
  total: number;
  done: number;
}

const emptyStats = (): DashboardStats => ({
  totalTasks: 0,
  completed: 0,
  inProgress: 0,
  pending: 0,
  donePct: 0,
  kpiAchieved: 0,
  kpiNotAchieved: 0,
  kpiDelayed: 0,
  kpiRated: 0,
  kpiAchievedPct: null,
  backlogOpen: 0,
  delayedCount: 0,
  attentionCount: 0,
  totalTasksDelta: null,
  donePctDelta: null
});

const auth = useAuthStore();
const loading = ref(true);
const loadError = ref("");
const greetingName = ref("");
const weekLabel = ref("");
const stats = ref<DashboardStats>(emptyStats());
const goals = ref<GoalsSummary>({
  total: 0,
  done: 0,
  inProgress: 0,
  pending: 0,
  onTrack: 0
});
const dayPlan = ref<DayPlanSummary>({
  peopleWithGoals: 0,
  peopleWithPlans: 0,
  coveragePct: null
});
const leave = ref<LeaveSummary>({
  month: "",
  trackedCount: 0,
  nearCap: 0,
  overLimit: 0,
  byBrand: []
});
const activities = ref<Activity[]>([]);
const topDelayedPics = ref<PicStat[]>([]);
const categories = ref<CategoryStat[]>([]);

const hour = new Date().getHours();
const greeting = computed(() => {
  if (hour < 12) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
});

const displayName = computed(
  () => greetingName.value || auth.user?.name?.split(" ").pop() || "bạn"
);

const categoriesWithWork = computed(() => categories.value.filter((c) => c.total > 0));

function formatDelta(value: number | null, suffix = ""): string {
  if (value == null) return "So với tuần trước: —";
  if (value === 0) return `Ngang tuần trước${suffix}`;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix} so với tuần trước`;
}

const summaryCards = computed(() => {
  const s = stats.value;
  const kpiLabel =
    s.kpiAchievedPct == null
      ? "Chưa chấm KPI"
      : `${s.kpiAchieved}/${s.kpiRated} đã đạt`;
  const attentionMeta =
    s.attentionCount === 0
      ? "Ổn"
      : `${s.delayedCount} delayed · ${s.backlogOpen} tồn đọng`;

  return [
    {
      label: "Task tuần",
      value: s.totalTasks,
      icon: "list_alt",
      iconWrap: "bg-primary-container/10",
      iconClass: "text-primary",
      meta: formatDelta(s.totalTasksDelta),
      metaIcon: (s.totalTasksDelta ?? 0) >= 0 ? "trending_up" : "trending_down",
      metaClass: "text-primary"
    },
    {
      label: "% hoàn thành",
      value: `${s.donePct}%`,
      icon: "task_alt",
      iconWrap: "bg-secondary-container",
      iconClass: "text-secondary",
      meta: formatDelta(s.donePctDelta, " điểm"),
      metaIcon: "check_circle",
      metaClass: s.donePct >= 70 ? "text-secondary" : "text-on-surface-variant"
    },
    {
      label: "KPI đạt",
      value: s.kpiAchievedPct == null ? "—" : `${s.kpiAchievedPct}%`,
      icon: "verified",
      iconWrap: "bg-surface-variant",
      iconClass: "text-primary",
      meta: kpiLabel,
      metaIcon: "schedule",
      metaClass:
        s.kpiAchievedPct == null
          ? "text-on-surface-variant"
          : s.kpiAchievedPct >= 70
            ? "text-secondary"
            : "text-error"
    },
    {
      label: "Delayed / tồn đọng",
      value: s.attentionCount,
      icon: "warning",
      iconWrap: "bg-error-container/40",
      iconClass: "text-error",
      meta: attentionMeta,
      metaIcon: "priority_high",
      metaClass: s.attentionCount > 0 ? "text-error" : "text-secondary"
    }
  ];
});

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

onMounted(async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const res = await fetch("/api/dashboard/summary", { headers: { ...authHeaders() } });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      loadError.value = body?.error || "Không tải được dashboard.";
      return;
    }
    const data = await res.json();
    greetingName.value = data.greetingName ?? "";
    weekLabel.value = data.weekLabel ?? "";
    stats.value = { ...emptyStats(), ...(data.stats ?? {}) };
    goals.value = {
      total: 0,
      done: 0,
      inProgress: 0,
      pending: 0,
      onTrack: 0,
      ...(data.goals ?? {})
    };
    dayPlan.value = {
      peopleWithGoals: 0,
      peopleWithPlans: 0,
      coveragePct: null,
      ...(data.dayPlan ?? {})
    };
    leave.value = {
      month: "",
      trackedCount: 0,
      nearCap: 0,
      overLimit: 0,
      byBrand: [],
      ...(data.leave ?? {})
    };
    activities.value = Array.isArray(data.activities) ? data.activities : [];
    topDelayedPics.value = Array.isArray(data.topDelayedPics) ? data.topDelayedPics : [];
    categories.value = Array.isArray(data.categories) ? data.categories : [];
  } catch {
    loadError.value = "Không kết nối được máy chủ.";
  } finally {
    loading.value = false;
  }
});
</script>
