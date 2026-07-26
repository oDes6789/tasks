<template>
  <div class="leave-page">
    <header class="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div class="min-w-0">
        <h2 class="mb-1 text-headline-lg text-primary">ĐĂNG KÝ NGHỈ THỨ 7</h2>
        <p class="text-body-md text-on-surface-variant">
          Danh sách theo nhân sự đã đăng nhập và trưởng nhóm · Mỗi người nghỉ không quá 50% số T7 trong tháng
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 bg-white text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
          aria-label="Tháng trước"
          @click="goMonth(-1)"
        >
          <Icon name="chevron_left" icon-class="text-[22px]" />
        </button>
        <DatePicker
          v-model="monthDate"
          view="month"
          dateFormat="mm/yy"
          :manualInput="false"
          showIcon
          iconDisplay="input"
          placeholder="Chọn tháng"
          class="month-datepicker"
          inputClass="month-datepicker-input"
          @update:modelValue="onMonthPick"
        />
        <button
          type="button"
          class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant/50 bg-white text-on-surface-variant transition hover:bg-surface-container-low hover:text-primary"
          aria-label="Tháng sau"
          @click="goMonth(1)"
        >
          <Icon name="chevron_right" icon-class="text-[22px]" />
        </button>
        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary/10 px-3.5 text-[12px] font-semibold text-primary transition hover:bg-primary/15"
          @click="goThisMonth"
        >
          Tháng này
        </button>
      </div>
    </header>

    <div class="leave-hero mb-4 overflow-hidden border border-outline-variant/40 ambient-shadow">
      <div class="leave-hero-copy">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="leave-hero-eyebrow">{{ monthTitle }}</p>
            <h3 class="leave-hero-title">Mỗi nhân sự nghỉ không quá 50% số Thứ 7 trong tháng</h3>
            <p class="leave-hero-sub">
              Tháng này có {{ saturdays.length || 4 }} ngày T7 → tối đa
              <span class="font-semibold text-on-surface">{{ maxOffHint }} ngày OFF</span>
              / người.
            </p>
          </div>
          <div
            v-if="saturdays.length"
            class="leave-compliance shrink-0"
            :class="overLimitPeople.length ? 'is-warn' : 'is-ok'"
          >
            <span class="leave-compliance-badge">
              {{ overLimitPeople.length === 0 ? "OK ≤50%" : `${overLimitPeople.length} vượt` }}
            </span>
            <p v-if="overLimitPeople.length" class="leave-compliance-names">
              {{ overLimitPeople.map((p) => p.personName).join(", ") }}
            </p>
            <p v-else class="leave-compliance-names">Chưa ai vượt hạn mức</p>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2">
          <span
            v-for="opt in LEAVE_STATUS_OPTIONS"
            :key="opt.value"
            class="leave-legend-chip"
            :data-status="opt.value"
          >
            {{ opt.label }}
          </span>
        </div>
      </div>
    </div>

    <div
      class="leave-panel overflow-hidden border border-outline-variant/40 bg-white ambient-shadow"
    >
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-outline-variant/40 bg-surface-container-low/70 px-3 py-2.5 sm:px-4"
      >
        <span class="inline-flex items-center gap-1.5 text-[12px] font-semibold text-on-surface">
          <Icon name="event_busy" icon-class="text-[18px] text-primary" />
          Bảng đăng ký {{ monthTitle }}
        </span>
        <span class="text-xs text-on-surface-variant">
          <strong class="tabular-nums text-on-surface">{{ filledCount }}</strong>
          /{{ totalSlots }} ô đã chọn
        </span>
        <div class="hidden items-center gap-1.5 text-[11px] text-outline md:flex">
          <span class="leave-legend-dot" data-status="full" /> CN
          <span class="leave-legend-dot" data-status="morning" /> Sáng
          <span class="leave-legend-dot" data-status="afternoon" /> Chiều
          <span class="leave-legend-dot" data-status="off" /> OFF
        </div>
        <span
          v-if="savingCount > 0"
          class="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-primary"
        >
          <span class="leave-pulse h-1.5 w-1.5 rounded-full bg-primary" />
          Đang lưu…
        </span>
        <span
          v-else-if="lastSavedLabel"
          class="ml-auto text-[11px] text-outline"
        >
          Đã lưu {{ lastSavedLabel }}
        </span>
      </div>

      <div v-if="loading" class="px-4 py-16 text-center text-sm text-on-surface-variant">
        Đang tải lịch nghỉ…
      </div>
      <div
        v-else-if="!roster.length"
        class="px-4 py-16 text-center text-sm text-on-surface-variant"
      >
        Chưa có tài khoản nào được bật theo dõi nghỉ Thứ 7. Teamlead hãy bật ở trang Quản lý nhân sự.
      </div>
      <div
        v-else-if="!saturdays.length"
        class="px-4 py-16 text-center text-sm text-on-surface-variant"
      >
        Tháng này không có ngày Thứ 7.
      </div>
      <div v-else class="leave-table-wrap">
        <table class="leave-table">
          <thead>
            <tr>
              <th class="leave-th leave-th-stt">#</th>
              <th class="leave-th leave-th-name">Nhân sự</th>
              <th v-for="day in saturdays" :key="day" class="leave-th leave-th-day">
                <span class="leave-th-day-label">T7</span>
                <span class="leave-th-day-date">{{ formatShortDate(day) }}</span>
                <span class="leave-th-day-meta">
                  <span title="SL TN IM làm việc T7">IM {{ brandStats(day, "im").teamLeadsWorking }}</span>
                  <span class="leave-th-sep">·</span>
                  <span title="SL TN EC làm việc T7">EC {{ brandStats(day, "ec").teamLeadsWorking }}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-for="section in sections" :key="section.brand">
              <tr class="leave-group-row" :data-brand="section.brand">
                <td :colspan="2 + saturdays.length">
                  <div class="leave-group-head">
                    <span class="leave-group-pill" :data-brand="section.brand">
                      {{ BRAND_META[section.brand].label }}
                    </span>
                    <span
                      v-if="section.showMetric"
                      class="leave-group-metric"
                      :title="section.metricHint"
                    >
                      {{ section.metricTitle }}
                      <template v-for="(day, di) in saturdays" :key="`${section.brand}-m-${day}`">
                        <span v-if="di > 0" class="leave-th-sep">·</span>
                        <strong>{{ brandStats(day, section.brand).teamLeadsWorking }}</strong>
                        <span class="text-outline">({{ formatShortDate(day) }})</span>
                      </template>
                    </span>
                  </div>
                </td>
              </tr>
              <tr
                v-for="(person, idx) in section.people"
                :key="person.name"
                class="leave-person-row"
                :data-brand="person.brand"
                :class="{
                  'is-me': isCurrentUser(person.name),
                  'is-over-limit': personStats(person.name).overLimit
                }"
              >
                <td class="leave-td leave-td-stt">{{ section.startIndex + idx }}</td>
                <td class="leave-td leave-td-name">
                  <div class="leave-person">
                    <img
                      v-if="person.avatar"
                      :src="person.avatar"
                      :alt="person.name"
                      class="leave-avatar-img"
                    />
                    <span v-else class="leave-avatar" :data-brand="person.brand">
                      {{ initials(person.name) }}
                    </span>
                    <div class="leave-person-meta">
                      <div class="leave-person-top">
                        <p class="leave-person-name">{{ person.name }}</p>
                        <span
                          class="leave-off-badge"
                          :class="personStats(person.name).overLimit ? 'is-warn' : 'is-ok'"
                          :title="`OFF ${personStats(person.name).offCount}/${personStats(person.name).saturdayCount} (tối đa ${personStats(person.name).maxOffAllowed})`"
                        >
                          {{ personStats(person.name).offCount }}/{{ personStats(person.name).saturdayCount }}
                        </span>
                      </div>
                      <p class="leave-person-role">
                        <template v-if="person.isTeamLead">Trưởng nhóm</template>
                        <template v-else>Nhân sự</template>
                      </p>
                    </div>
                  </div>
                </td>
                <td
                  v-for="day in saturdays"
                  :key="`${person.name}-${day}`"
                  class="leave-td leave-td-day"
                >
                  <div
                    class="leave-seg"
                    role="group"
                    :aria-label="`${person.name} ${formatShortDate(day)}`"
                    :title="leaveCellTitle(person.name, day)"
                  >
                    <button
                      v-for="opt in selectOptions"
                      :key="opt.value"
                      type="button"
                      class="leave-seg-btn"
                      :data-status="opt.value"
                      :class="{
                        'is-active': getStatus(person.name, day) === opt.value,
                        'is-busy': isSaving(person.name, day)
                      }"
                      :disabled="isSaving(person.name, day)"
                      :title="leaveCellTitle(person.name, day) || opt.label"
                      @click="onStatusChange(person.name, day, opt.value)"
                    >
                      {{ statusAbbrev(opt.value) }}
                    </button>
                  </div>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import DatePicker from "primevue/datepicker";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";
import {
  BRAND_META,
  calcBrandDayStats,
  calcPersonMonthStats,
  formatShortDate,
  LEAVE_STATUS_OPTIONS,
  monthLabelVi,
  resolveMonthKey,
  shiftMonth,
  toMonthKey,
  type LeaveBrand,
  type LeavePerson,
  type LeaveStatus,
  type SaturdayLeaveEntry
} from "@/lib/saturdayLeave";

const toast = useToast();
const auth = useAuthStore();

const monthKey = ref(toMonthKey(new Date()));
const monthDate = ref<Date>(new Date());
const saturdays = ref<string[]>([]);
const roster = ref<LeavePerson[]>([]);
const entries = ref<SaturdayLeaveEntry[]>([]);
const loading = ref(false);
const savingKeys = ref<Set<string>>(new Set());
const lastSavedAt = ref<number | null>(null);

const statusMap = computed(() => {
  const map = new Map<string, LeaveStatus>();
  for (const e of entries.value) {
    map.set(`${e.personName}::${e.workDate}`, e.status);
  }
  return map;
});

const monthTitle = computed(() => monthLabelVi(monthKey.value));

const sections = computed(() => {
  const brands: LeaveBrand[] = ["general", "im", "ec"];
  let cursor = 1;
  return brands
    .map((brand) => {
      const people = roster.value.filter((p) => p.brand === brand);
      const startIndex = cursor;
      cursor += people.length;
      return {
        brand,
        people,
        startIndex,
        showMetric: brand === "im" || brand === "ec",
        metricTitle: BRAND_META[brand].metricTitle,
        metricHint: BRAND_META[brand].metricHint
      };
    })
    .filter((section) => section.people.length > 0);
});

const selectOptions = LEAVE_STATUS_OPTIONS;

const totalSlots = computed(() => saturdays.value.length * roster.value.length);
const filledCount = computed(() => {
  let n = 0;
  for (const person of roster.value) {
    for (const day of saturdays.value) {
      if (statusMap.value.has(`${person.name}::${day}`)) n += 1;
    }
  }
  return n;
});

const savingCount = computed(() => savingKeys.value.size);

const lastSavedLabel = computed(() => {
  if (!lastSavedAt.value) return "";
  const d = new Date(lastSavedAt.value);
  return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
});

function cellKey(personName: string, workDate: string) {
  return `${personName}::${workDate}`;
}

function getStatus(personName: string, workDate: string): LeaveStatus | null {
  return statusMap.value.get(cellKey(personName, workDate)) ?? null;
}

function getLeaveEntry(personName: string, workDate: string) {
  return entries.value.find((e) => e.personName === personName && e.workDate === workDate);
}

function leaveCellTitle(personName: string, workDate: string) {
  const entry = getLeaveEntry(personName, workDate);
  if (!entry?.updatedBy) return undefined;
  const when = entry.updatedAt
    ? new Date(entry.updatedAt).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";
  return when
    ? `Cập nhật bởi ${entry.updatedBy} · ${when}`
    : `Cập nhật bởi ${entry.updatedBy}`;
}

function isSaving(personName: string, workDate: string) {
  return savingKeys.value.has(cellKey(personName, workDate));
}

function brandStats(workDate: string, brand: LeaveBrand) {
  const map = new Map<string, LeaveStatus | null>();
  for (const person of roster.value) {
    map.set(cellKey(person.name, workDate), getStatus(person.name, workDate));
  }
  return calcBrandDayStats(brand, workDate, map, roster.value);
}

const statusMapNullable = computed(() => {
  const map = new Map<string, LeaveStatus | null>();
  for (const person of roster.value) {
    for (const day of saturdays.value) {
      map.set(cellKey(person.name, day), getStatus(person.name, day));
    }
  }
  return map;
});

function personStats(personName: string) {
  return calcPersonMonthStats(personName, saturdays.value, statusMapNullable.value);
}

const overLimitPeople = computed(() =>
  roster.value.map((p) => personStats(p.name)).filter((s) => s.overLimit)
);

const maxOffHint = computed(() => {
  const n = saturdays.value.length;
  if (n === 0) return 0;
  return Math.floor(n * 0.5);
});

function isCurrentUser(name: string) {
  const me = auth.user?.name?.trim().toLowerCase();
  if (!me) return false;
  return name.toLowerCase().includes(me) || me.includes(name.toLowerCase().replace(/^m[rs]\.\s*/i, ""));
}

function initials(name: string) {
  const cleaned = name.replace(/^m[rs]\.\s*/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusAbbrev(status: LeaveStatus): string {
  const map: Record<LeaveStatus, string> = {
    full: "CN",
    morning: "S",
    afternoon: "C",
    off: "OFF"
  };
  return map[status];
}

function syncMonthDateFromKey() {
  const [y, m] = monthKey.value.split("-").map(Number);
  monthDate.value = new Date(y, m - 1, 1);
}

function goMonth(delta: number) {
  monthKey.value = shiftMonth(monthKey.value, delta);
  syncMonthDateFromKey();
}

function goThisMonth() {
  monthKey.value = toMonthKey(new Date());
  syncMonthDateFromKey();
}

function onMonthPick(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const d = Array.isArray(value) ? value.find((x): x is Date => x instanceof Date) : value;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return;
  monthKey.value = toMonthKey(d);
}

async function loadBoard() {
  loading.value = true;
  try {
    const res = await fetch(`/api/saturday-leave?month=${encodeURIComponent(monthKey.value)}`, {
      headers: { ...authHeaders() }
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không tải được.");
    }
    const data = (await res.json()) as {
      month: string;
      saturdays: string[];
      roster?: LeavePerson[];
      entries: SaturdayLeaveEntry[];
    };
    monthKey.value = resolveMonthKey(data.month);
    saturdays.value = data.saturdays;
    roster.value = Array.isArray(data.roster) ? data.roster : [];
    entries.value = data.entries;
    syncMonthDateFromKey();
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không tải được lịch nghỉ.",
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

async function onStatusChange(personName: string, workDate: string, status: unknown) {
  if (!status || typeof status !== "string") return;
  if (!LEAVE_STATUS_OPTIONS.some((o) => o.value === status)) return;
  const nextStatus = status as LeaveStatus;
  if (getStatus(personName, workDate) === nextStatus) return;
  const key = cellKey(personName, workDate);
  const prev = entries.value.find((e) => e.personName === personName && e.workDate === workDate);

  // Optimistic update
  if (prev) {
    entries.value = entries.value.map((e) =>
      e.personName === personName && e.workDate === workDate ? { ...e, status: nextStatus } : e
    );
  } else {
    entries.value = [
      ...entries.value,
      {
        id: -Date.now(),
        workDate,
        personName,
        status: nextStatus,
        updatedBy: auth.user?.name ?? "",
        updatedAt: new Date().toISOString()
      }
    ];
  }

  const nextSaving = new Set(savingKeys.value);
  nextSaving.add(key);
  savingKeys.value = nextSaving;

  try {
    const res = await fetch("/api/saturday-leave", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ workDate, personName, status: nextStatus })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không lưu được.");
    }
    const data = (await res.json()) as { item: SaturdayLeaveEntry };
    entries.value = [
      ...entries.value.filter((e) => !(e.personName === personName && e.workDate === workDate)),
      data.item
    ];
    lastSavedAt.value = Date.now();

    const stats = personStats(personName);
    if (stats.overLimit) {
      toast.add({
        severity: "warn",
        summary: "Vượt hạn mức nghỉ",
        detail: `${personName}: OFF ${stats.offCount}/${stats.saturdayCount} ngày T7 (tối đa ${stats.maxOffAllowed}).`,
        life: 4000
      });
    }
  } catch (err) {
    // rollback
    if (prev) {
      entries.value = entries.value.map((e) =>
        e.personName === personName && e.workDate === workDate ? prev : e
      );
    } else {
      entries.value = entries.value.filter(
        (e) => !(e.personName === personName && e.workDate === workDate && e.id < 0)
      );
    }
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được.",
      life: 3000
    });
  } finally {
    const done = new Set(savingKeys.value);
    done.delete(key);
    savingKeys.value = done;
  }
}

watch(monthKey, () => {
  void loadBoard();
});

onMounted(() => {
  syncMonthDateFromKey();
  void loadBoard();
});
</script>

<style scoped>
.leave-page {
  animation: leave-fade 0.35s ease-out;
}

@keyframes leave-fade {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.leave-hero {
  border-radius: 1rem;
  background:
    linear-gradient(135deg, rgba(239, 244, 255, 0.95), rgba(255, 255, 255, 0.96)),
    radial-gradient(circle at 92% 12%, rgba(70, 72, 212, 0.1), transparent 40%);
}

.leave-hero-copy {
  padding: 1rem 1.15rem 1.1rem;
}

.leave-hero-eyebrow {
  margin: 0 0 0.25rem;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #4648d4;
}

.leave-hero-title {
  margin: 0;
  font-size: clamp(1rem, 1.6vw, 1.25rem);
  font-weight: 800;
  line-height: 1.3;
  color: #0b1c30;
}

.leave-hero-sub {
  margin: 0.4rem 0 0;
  max-width: 40rem;
  font-size: 13px;
  line-height: 1.45;
  color: #464554;
}

.leave-compliance {
  max-width: 16rem;
  border-radius: 0.85rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid transparent;
}
.leave-compliance.is-ok {
  background: #ecfdf5;
  border-color: #a7f3d0;
}
.leave-compliance.is-warn {
  background: #fff1f0;
  border-color: #ffdad6;
}
.leave-compliance-badge {
  display: inline-flex;
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.leave-compliance.is-ok .leave-compliance-badge {
  background: #d1fae5;
  color: #047857;
}
.leave-compliance.is-warn .leave-compliance-badge {
  background: #ffdad6;
  color: #93000a;
}
.leave-compliance-names {
  margin: 0.35rem 0 0;
  font-size: 12px;
  line-height: 1.35;
  color: #464554;
}
.leave-compliance.is-warn .leave-compliance-names {
  color: #93000a;
  font-weight: 600;
}

.leave-legend-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  font-size: 11px;
  font-weight: 700;
}

.leave-legend-chip[data-status="full"] {
  background: #ecfdf5;
  color: #047857;
}
.leave-legend-chip[data-status="morning"] {
  background: #fff7ed;
  color: #c2410c;
}
.leave-legend-chip[data-status="afternoon"] {
  background: #eff6ff;
  color: #1d4ed8;
}
.leave-legend-chip[data-status="off"] {
  background: #fef2f2;
  color: #b91c1c;
}

.leave-legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  margin-left: 0.35rem;
}
.leave-legend-dot[data-status="full"] { background: #10b981; }
.leave-legend-dot[data-status="morning"] { background: #f97316; }
.leave-legend-dot[data-status="afternoon"] { background: #3b82f6; }
.leave-legend-dot[data-status="off"] { background: #ef4444; }

.leave-panel {
  border-radius: 1rem;
}

.leave-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.leave-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 780px;
  table-layout: fixed;
}

.leave-th {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 0.55rem 0.4rem;
  background: #173a63;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.leave-th-stt {
  position: sticky;
  width: 40px;
  left: 0;
  z-index: 4;
}
.leave-th-name {
  position: sticky;
  width: 220px;
  left: 40px;
  z-index: 4;
  text-align: left;
  padding-left: 0.75rem;
}
.leave-th-day {
  width: auto;
}

.leave-th-day-label {
  display: block;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.7;
}
.leave-th-day-date {
  display: block;
  margin-top: 1px;
  font-size: 13px;
  font-weight: 800;
}
.leave-th-day-meta {
  display: flex;
  justify-content: center;
  gap: 0.2rem;
  margin-top: 3px;
  font-size: 10px;
  font-weight: 600;
  color: #bfdbfe;
}
.leave-th-sep {
  opacity: 0.55;
}

.leave-group-row td {
  padding: 0.4rem 0.65rem;
  border-top: 1px solid rgba(199, 196, 215, 0.35);
  background: #f8faff;
}
.leave-group-row[data-brand="general"] td { background: #fffbeb; }
.leave-group-row[data-brand="im"] td { background: #f0f9ff; }
.leave-group-row[data-brand="ec"] td { background: #faf5ff; }

.leave-group-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.85rem;
}
.leave-group-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 11px;
  font-weight: 800;
}
.leave-group-pill[data-brand="general"] { background: #fde68a; color: #92400e; }
.leave-group-pill[data-brand="im"] { background: #bae6fd; color: #075985; }
.leave-group-pill[data-brand="ec"] { background: #e9d5ff; color: #6b21a8; }
.leave-group-metric {
  font-size: 11px;
  color: #464554;
}
.leave-group-metric strong {
  color: #b91c1c;
  font-variant-numeric: tabular-nums;
}

.leave-td {
  padding: 0.35rem 0.4rem;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  vertical-align: middle;
  background: #fff;
}
.leave-td-stt {
  position: sticky;
  left: 0;
  z-index: 1;
  width: 40px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  background: #fff;
}
.leave-td-name {
  position: sticky;
  left: 40px;
  z-index: 1;
  width: 220px;
  padding-left: 0.65rem;
  background: #fff;
}
.leave-td-day {
  text-align: center;
}

.leave-person-row:hover .leave-td,
.leave-person-row:hover .leave-td-stt,
.leave-person-row:hover .leave-td-name {
  background: #f8fafc;
}

.leave-person-row.is-me .leave-td-name {
  box-shadow: inset 3px 0 0 #4648d4;
}
.leave-person-row.is-over-limit .leave-td-name {
  background: #fff7f6;
}
.leave-person-row.is-over-limit:hover .leave-td-name {
  background: #fff1f0;
}

.leave-person {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}
.leave-person-meta {
  min-width: 0;
  flex: 1;
}
.leave-person-top {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
}
.leave-person-name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 700;
  color: #0b1c30;
}
.leave-person-role {
  margin: 0;
  font-size: 10px;
  color: #94a3b8;
}

.leave-off-badge {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  font-size: 10px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.leave-off-badge.is-ok {
  background: #f1f5f9;
  color: #64748b;
}
.leave-off-badge.is-warn {
  background: #ffdad6;
  color: #93000a;
}

.leave-avatar {
  display: inline-flex;
  height: 26px;
  width: 26px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 800;
}
.leave-avatar-img {
  height: 26px;
  width: 26px;
  flex-shrink: 0;
  border-radius: 999px;
  object-fit: cover;
}
.leave-avatar[data-brand="im"] { background: #e0f2fe; color: #0369a1; }
.leave-avatar[data-brand="ec"] { background: #f3e8ff; color: #7e22ce; }
.leave-avatar[data-brand="general"] { background: #fef3c7; color: #b45309; }

.leave-seg {
  display: inline-flex;
  width: 100%;
  max-width: 168px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
}
.leave-seg-btn {
  flex: 1;
  min-width: 0;
  height: 28px;
  border: 0;
  border-right: 1px solid #e2e8f0;
  background: transparent;
  color: #64748b;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}
.leave-seg-btn:last-child { border-right: 0; }
.leave-seg-btn:hover:not(:disabled):not(.is-active) {
  background: #fff;
  color: #0b1c30;
}
.leave-seg-btn:disabled {
  cursor: wait;
  opacity: 0.65;
}
.leave-seg-btn.is-active[data-status="full"] { background: #d1fae5; color: #047857; }
.leave-seg-btn.is-active[data-status="morning"] { background: #ffedd5; color: #c2410c; }
.leave-seg-btn.is-active[data-status="afternoon"] { background: #dbeafe; color: #1d4ed8; }
.leave-seg-btn.is-active[data-status="off"] { background: #fecaca; color: #b91c1c; }

.leave-pulse {
  animation: leave-pulse 1s ease-in-out infinite;
}
@keyframes leave-pulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

:deep(.month-datepicker) {
  width: 9.5rem;
}
:deep(.month-datepicker-input) {
  height: 2.5rem;
  border-radius: 999px !important;
  font-size: 13px;
  font-weight: 600;
}
</style>
