<template>
  <div>
    <section class="mb-stack-lg">
      <h2 class="text-headline-lg text-on-surface">{{ greeting }}, {{ displayName }}</h2>
      <p class="mt-1 text-body-lg text-on-surface-variant">
        Here is what's happening with your projects today.
      </p>
    </section>

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

    <div class="grid grid-cols-1 gap-stack-lg lg:grid-cols-3">
      <section
        class="rounded-lg border border-surface-container/30 bg-white p-stack-md ambient-shadow-lg lg:col-span-2"
      >
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-headline-md text-on-surface">Recent Activity</h3>
          <button
            type="button"
            class="text-label-md text-primary underline-offset-4 hover:underline decoration-2"
          >
            View All
          </button>
        </div>

        <div class="space-y-6">
          <div
            v-for="item in activities"
            :key="item.id"
            class="flex gap-4 rounded-xl p-4 transition-colors hover:bg-surface-container-low"
          >
            <div class="relative">
              <img :src="item.avatar" :alt="item.name" class="h-12 w-12 rounded-full object-cover" />
              <div
                class="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white"
                :class="iconBgClass(item.iconBg)"
              >
                <Icon :name="item.icon" icon-class="text-[12px] text-white" />
              </div>
            </div>
            <div class="flex-grow">
              <p class="text-body-md text-on-surface">
                <span class="font-bold">{{ item.name }}</span>
                {{ " " }}{{ item.action }}{{ " " }}
                <span class="font-medium" :class="targetClass(item.targetTone)">{{
                  item.target
                }}</span>
              </p>
              <p class="mt-1 text-sm text-on-surface-variant">
                {{ item.time }} • {{ item.team }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-surface-container bg-surface-container-low p-stack-md">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-headline-md text-on-surface">Team</h3>
          <button
            type="button"
            class="rounded-full bg-white p-2 text-primary ambient-shadow transition-transform hover:scale-105"
          >
            <Icon name="person_add" />
          </button>
        </div>

        <div class="space-y-4">
          <div
            v-for="member in team"
            :key="member.id"
            class="flex items-center justify-between rounded-2xl border border-white bg-white/50 p-3 transition-all hover:bg-white"
          >
            <div class="flex items-center gap-3">
              <img
                :src="member.avatar"
                :alt="member.name"
                class="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p class="text-label-md font-bold text-on-surface">{{ member.name }}</p>
                <p class="text-[12px] text-on-surface-variant">{{ member.role }}</p>
              </div>
            </div>
            <div class="h-2 w-2 rounded-full" :class="statusDot(member.status)" />
          </div>
        </div>

        <div class="mt-8">
          <div class="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p class="mb-2 text-sm font-medium text-primary">Team Capacity</p>
            <div class="h-2 w-full overflow-hidden rounded-full bg-surface-container-high">
              <div
                class="h-full rounded-full bg-primary transition-all"
                :style="{ width: `${teamCapacity}%` }"
              />
            </div>
            <p class="mt-2 text-right text-[12px] text-on-surface-variant">
              {{ teamCapacity }}% Assigned
            </p>
          </div>
        </div>
      </section>
    </div>

    <section class="mt-stack-lg">
      <div
        class="relative flex flex-col items-center justify-between gap-6 overflow-hidden rounded-xl bg-primary-container p-stack-lg text-on-primary-container ambient-shadow-lg md:flex-row"
      >
        <div class="relative z-10 max-w-lg">
          <span
            class="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-md"
          >
            Pro Tip
          </span>
          <h3 class="mb-2 text-headline-md">You're 20% more productive this week!</h3>
          <p class="text-body-md opacity-90">
            Completing tasks early in the morning seems to be your sweet spot. We've scheduled your
            most complex deep-work tasks for 9 AM tomorrow.
          </p>
        </div>
        <div class="relative z-10 flex gap-4">
          <button
            type="button"
            class="rounded-full bg-white px-8 py-4 font-bold text-primary shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            View Analysis
          </button>
        </div>
        <div class="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div
          class="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-secondary-container/20 blur-3xl"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";

interface Activity {
  id: number;
  name: string;
  action: string;
  target: string;
  targetTone: string;
  time: string;
  team: string;
  icon: string;
  iconBg: string;
  avatar: string;
}

interface TeamMember {
  id: number;
  name: string;
  role: string;
  status: string;
  avatar: string;
}

const auth = useAuthStore();
const greetingName = ref("");
const stats = ref({ totalTasks: 42, completed: 28, inProgress: 10, overdue: 4 });
const activities = ref<Activity[]>([]);
const team = ref<TeamMember[]>([]);
const teamCapacity = ref(82);

const hour = new Date().getHours();
const greeting = computed(() => {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
});

const displayName = computed(
  () => greetingName.value || auth.user?.name?.split(" ").pop() || "there"
);

const summaryCards = computed(() => [
  {
    label: "Total Tasks",
    value: stats.value.totalTasks,
    icon: "list_alt",
    iconWrap: "bg-primary-container/10",
    iconClass: "text-primary",
    meta: "12% from last week",
    metaIcon: "trending_up",
    metaClass: "text-primary"
  },
  {
    label: "Completed",
    value: stats.value.completed,
    icon: "task_alt",
    iconWrap: "bg-secondary-container",
    iconClass: "text-secondary",
    meta: "67% Success rate",
    metaIcon: "check_circle",
    metaClass: "text-secondary"
  },
  {
    label: "In Progress",
    value: stats.value.inProgress,
    icon: "autorenew",
    iconWrap: "bg-surface-variant",
    iconClass: "text-primary",
    meta: "On track",
    metaIcon: "schedule",
    metaClass: "text-on-surface-variant"
  },
  {
    label: "Overdue",
    value: stats.value.overdue,
    icon: "warning",
    iconWrap: "bg-error-container/40",
    iconClass: "text-error",
    meta: "Needs attention",
    metaIcon: "priority_high",
    metaClass: "text-error"
  }
]);

function iconBgClass(tone: string) {
  if (tone === "secondary") return "bg-secondary";
  if (tone === "primary-container") return "bg-primary-container";
  return "bg-primary";
}

function targetClass(tone: string) {
  return tone === "secondary" ? "text-secondary" : "text-primary";
}

function statusDot(status: string) {
  if (status === "online") return "bg-green-400";
  if (status === "busy") return "bg-orange-400";
  return "bg-on-surface-variant/30";
}

onMounted(async () => {
  try {
    const res = await fetch("/api/dashboard/summary", { headers: { ...authHeaders() } });
    if (!res.ok) return;
    const data = await res.json();
    greetingName.value = data.greetingName;
    stats.value = data.stats;
    activities.value = data.activities;
    team.value = data.team;
    teamCapacity.value = data.teamCapacity;
  } catch {
    // Keep design defaults if API unavailable
    activities.value = [];
    team.value = [];
  }
});
</script>
