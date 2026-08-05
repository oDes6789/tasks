<template>
  <div class="plan-page">
    <header class="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <h2 class="mb-1 text-headline-lg text-primary">KẾ HOẠCH THEO NGÀY</h2>
        <p class="text-sm text-on-surface-variant">
          {{ meta.weekLabel || "Chọn tuần" }}
          <span v-if="personName"> · {{ personName }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <Select
          v-if="canSelectPerson"
          :modelValue="personName || null"
          :options="personnel"
          optionLabel="name"
          optionValue="name"
          filter
          placeholder="Chọn nhân sự..."
          emptyFilterMessage="Không tìm thấy"
          class="min-w-[13rem]"
          @update:modelValue="onPersonChange"
        />
        <DatePicker
          v-model="weekRange"
          selectionMode="range"
          :manualInput="false"
          showIcon
          iconDisplay="input"
          showWeek
          showButtonBar
          hideOnRangeSelection
          dateFormat="dd/mm/yy"
          placeholder="Chọn tuần"
          class="week-datepicker"
          inputClass="week-datepicker-input"
          @update:modelValue="onWeekRangeUpdate"
        />
      </div>
    </header>

    <div
      v-if="personName"
      class="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border border-outline-variant/40 bg-white px-4 py-2.5 text-xs text-on-surface-variant"
    >
      <span>
        Đã xếp
        <strong class="text-on-surface">{{ scheduledCount }}</strong>
        /
        {{ ganttRows.length }} mục tiêu
      </span>
      <span class="hidden sm:inline text-outline-variant">|</span>
      <span class="inline-flex items-center gap-1">
        <Icon name="info" icon-class="text-[14px]" />
        Kéo thanh để đổi lịch · kéo cạnh để đổi thời lượng · chuông = nhắc trước 15 phút
      </span>
    </div>

    <p
      v-if="!personName"
      class="border border-outline-variant/40 bg-white px-5 py-14 text-center text-sm text-on-surface-variant"
    >
      {{
        canSelectPerson
          ? "Chọn nhân sự để lập kế hoạch tuần theo ngày và giờ."
          : "Đang tải kế hoạch của bạn…"
      }}
    </p>

    <div v-else class="gantt-shell border border-outline-variant/40 bg-white">
      <div
        ref="scrollEl"
        class="gantt-scroll overflow-x-auto"
      >
        <div
          class="gantt-grid"
          :style="{
            '--label-w': '260px',
            '--hour-w': '40px',
            minWidth: `calc(var(--label-w) + ${columns.length} * var(--hour-w))`
          }"
        >
          <div class="gantt-header sticky top-0 z-20">
            <div
              class="gantt-label-cell gantt-label-sticky flex flex-col justify-end gap-0.5 border-b border-r border-outline-variant/50 bg-surface-container-low px-3 py-2"
            >
              <span class="text-[10px] font-bold uppercase tracking-[0.06em] text-on-surface-variant">
                Mục tiêu
              </span>
              <span class="text-[11px] text-outline">{{ ganttRows.length }} hạng mục</span>
            </div>

            <div class="gantt-day-headers border-b border-outline-variant/40" :style="dayHeaderStyle">
              <div
                v-for="day in meta.days"
                :key="`dh-${day.date}`"
                class="day-head border-r border-outline-variant/50 px-1 py-1.5 text-center"
                :class="day.date === todayIso ? 'is-today' : dayIndex(day.date) % 2 === 1 ? 'is-alt' : ''"
              >
                <div class="text-[11px] font-bold text-on-surface">{{ day.weekday }}</div>
                <div class="text-[10px] text-on-surface-variant">
                  {{ Number(day.date.slice(8)) }}/{{ Number(day.date.slice(5, 7)) }}
                </div>
              </div>
            </div>

            <div class="gantt-cols border-b border-outline-variant/50" :style="colsStyle">
              <div
                v-for="col in columns"
                :key="col.key"
                class="hour-head border-r px-0 py-1 text-center text-[10px] tabular-nums text-on-surface-variant"
                :class="[
                  col.hour === HOUR_START ? 'border-outline-variant/55' : 'border-dashed border-outline-variant/25',
                  col.date === todayIso ? 'is-today' : col.dayIndex % 2 === 1 ? 'is-alt' : ''
                ]"
              >
                {{ col.hour % 2 === 0 ? col.hour : "" }}
              </div>
            </div>
          </div>

          <p
            v-if="!ganttRows.length"
            class="px-5 py-12 text-center text-sm text-on-surface-variant"
          >
            Chưa có mục tiêu nguồn. Thêm từ mục tiêu cá nhân / tuần, hoặc bấm “Thêm mục”.
          </p>

          <div
            v-for="(row, rowIndex) in ganttRows"
            :key="row.key"
            class="gantt-row group"
            :class="dragOverRowKey === row.key ? 'is-drag-over' : ''"
            @dragover.prevent="onRowDragOver(row.key)"
            @dragleave="onRowDragLeave(row.key)"
            @drop.prevent="onDropReorder(rowIndex)"
          >
            <div
              class="gantt-label-cell gantt-label-sticky flex items-start gap-2 border-b border-r border-outline-variant/40 bg-white px-3 py-2.5"
              draggable="true"
              @dragstart="onRowDragStart($event, rowIndex)"
            >
              <Icon
                name="drag_indicator"
                icon-class="mt-1 shrink-0 cursor-grab text-[16px] text-outline active:cursor-grabbing"
              />
              <div class="min-w-0 flex-1">
                <p class="text-[13px] font-semibold leading-snug text-on-surface break-words">
                  {{ row.title }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    v-if="row.detail"
                    class="source-badge"
                    :class="row.source?.sourceType === 'weekly_task' ? 'source-badge--week' : 'source-badge--personal'"
                  >
                    {{ row.detail }}
                  </span>
                  <span
                    v-if="row.item?.createdBy"
                    class="text-[10px] text-outline"
                    :title="`Người tạo: ${row.item.createdBy}`"
                  >
                    Tạo bởi {{ row.item.createdBy }}
                  </span>
                  <span v-if="row.item" class="text-[10px] tabular-nums text-outline">
                    {{ barTooltipTime(row) }}
                  </span>
                  <span v-else class="text-[10px] text-outline-variant">Chưa xếp lịch</span>
                </div>
              </div>
              <div class="flex shrink-0 flex-col items-center gap-0.5">
                <button
                  v-if="row.item"
                  type="button"
                  class="p-1 transition-colors"
                  :class="
                    row.item.reminderEnabled
                      ? 'text-primary'
                      : 'text-outline opacity-0 group-hover:opacity-100'
                  "
                  :title="
                    row.item.reminderEnabled
                      ? `Đang nhắc trước ${row.item.reminderMinutesBefore} phút — bấm để tắt`
                      : 'Bật nhắc nhở (trước 15 phút)'
                  "
                  @click.stop="toggleReminder(row.item)"
                >
                  <Icon
                    :name="row.item.reminderEnabled ? 'notifications_active' : 'notifications'"
                    icon-class="text-[16px]"
                  />
                </button>
                <button
                  v-if="row.item"
                  type="button"
                  class="p-1 text-on-surface-variant opacity-0 transition-opacity hover:bg-surface-container hover:text-error group-hover:opacity-100"
                  title="Gỡ khỏi timeline"
                  @click="removeItem(row.item)"
                >
                  <Icon name="close" icon-class="text-[14px]" />
                </button>
              </div>
            </div>

            <div
              class="gantt-track relative border-b border-outline-variant/40"
              :style="colsStyle"
              @pointerdown="onTrackPointerDown($event, row)"
            >
              <div
                v-for="col in columns"
                :key="`${row.key}-${col.key}`"
                class="gantt-cell pointer-events-none border-r"
                :class="[
                  col.hour === HOUR_START ? 'border-outline-variant/45' : 'border-dashed border-outline-variant/20',
                  col.date === todayIso ? 'is-today' : col.dayIndex % 2 === 1 ? 'is-alt' : ''
                ]"
              />

              <div
                v-if="row.item && barStyle(row)"
                class="gantt-bar absolute top-1.5 bottom-1.5 flex items-center overflow-hidden text-white select-none"
                :class="[
                  barSizeClass(row),
                  row.item.reminderEnabled ? 'gantt-bar--remind' : ''
                ]"
                :style="barStyle(row)"
                :title="barTooltip(row)"
                @pointerdown.stop="onBarPointerDown($event, row, 'move')"
              >
                <span
                  class="gantt-handle absolute inset-y-0 left-0 w-2 cursor-ew-resize"
                  @pointerdown.stop="onBarPointerDown($event, row, 'resize-start')"
                />

                <template v-if="barSizeClass(row) === 'gantt-bar--full'">
                  <span class="gantt-bar-time shrink-0 pl-2">{{ barStartLabel(row) }}</span>
                  <span class="min-w-0 flex-1 truncate px-2 text-center text-[12px] font-semibold">
                    {{ row.title }}
                  </span>
                  <span class="gantt-bar-time shrink-0 pr-2">{{ barEndLabel(row) }}</span>
                </template>
                <template v-else-if="barSizeClass(row) === 'gantt-bar--mid'">
                  <span class="min-w-0 flex-1 truncate px-2 text-center text-[12px] font-semibold">
                    {{ row.title }}
                  </span>
                </template>
                <template v-else>
                  <span class="px-1 text-[10px] font-bold tabular-nums">{{ barStartLabel(row) }}</span>
                </template>

                <span
                  class="gantt-handle absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                  @pointerdown.stop="onBarPointerDown($event, row, 'resize-end')"
                />
              </div>

              <div
                v-else
                class="pointer-events-none absolute inset-x-3 inset-y-2 border border-dashed border-outline-variant/35 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <span
                  class="absolute inset-0 flex items-center justify-center text-[11px] text-outline-variant"
                >
                  Click để xếp lịch
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import DatePicker from "primevue/datepicker";
import Select from "primevue/select";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import {
  addDays,
  formatDeadlineNote,
  getWeekInfo,
  parseIsoDate,
  resolvePreferredWeek,
  setStoredWeekStart,
  toIsoDate
} from "@/lib/week";
import { useAuthStore } from "@/stores/auth";

type SourceType = "custom" | "personal_goal" | "weekly_task";
type DragMode = "move" | "resize-start" | "resize-end" | "create";
type BarSize = "gantt-bar--full" | "gantt-bar--mid" | "gantt-bar--compact";

interface PlanSource {
  sourceType: Exclude<SourceType, "custom">;
  sourceKey: string;
  title: string;
  status: string;
  detail?: string;
}

interface DayPlanItem {
  id: number;
  weekStart: string;
  personName: string;
  planDate: string;
  endDate: string;
  title: string;
  notes: string;
  startMinute: number | null;
  endMinute: number | null;
  sourceType: SourceType;
  sourceKey: string | null;
  status: string;
  sortOrder: number;
  reminderEnabled: boolean;
  reminderMinutesBefore: number;
  createdBy?: string;
}

interface PlanDayMeta {
  date: string;
  weekday: string;
  dayLabel: string;
}

interface BoardMeta {
  weekStart: string;
  weekLabel: string;
  deadlineNote: string;
  personName: string;
  personAvatar: string | null;
  days: PlanDayMeta[];
}

interface TimelineColumn {
  key: string;
  date: string;
  hour: number;
  dayIndex: number;
}

interface GanttRow {
  key: string;
  title: string;
  detail?: string;
  source?: PlanSource;
  item: DayPlanItem | null;
}

interface DragState {
  mode: DragMode;
  row: GanttRow;
  startX: number;
  originStart: number;
  originEnd: number;
  trackEl: HTMLElement;
  createdId?: number;
}

const HOUR_START = 8;
const HOUR_END = 20;
const DEFAULT_HOUR_SPAN = 2;
const SNAP_QUARTERS = 4; // 15 minutes

const toast = useToast();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const canSelectPerson = computed(() => auth.canSelectOtherPersonnel);
const myPersonName = computed(() => auth.user?.name?.trim() || "");
const initialWeek = resolvePreferredWeek();
const todayIso = toIsoDate(new Date());

const personName = ref(
  canSelectPerson.value
    ? String(route.params.personName ?? "").trim()
    : myPersonName.value || String(route.params.personName ?? "").trim()
);
const selectedWeekStart = ref(
  typeof route.query.week === "string" && route.query.week
    ? getWeekInfo(parseIsoDate(route.query.week) ?? new Date()).weekStart
    : initialWeek.weekStart
);
const weekInfo = computed(() => getWeekInfo(parseIsoDate(selectedWeekStart.value) ?? new Date()));
const weekRange = ref<Date[] | null>([weekInfo.value.start, weekInfo.value.end]);

const meta = ref<BoardMeta>({
  weekStart: selectedWeekStart.value,
  weekLabel: weekInfo.value.weekLabel,
  deadlineNote: formatDeadlineNote(weekInfo.value.start),
  personName: personName.value,
  personAvatar: null,
  days: []
});
const personnel = ref<{ name: string; avatar?: string | null }[]>([]);
const sources = ref<PlanSource[]>([]);
const items = ref<DayPlanItem[]>([]);
const dragOverRowKey = ref<string | null>(null);
const rowDragFrom = ref<number | null>(null);
const dragState = ref<DragState | null>(null);
const saving = ref(false);
const scrollEl = ref<HTMLElement | null>(null);
const firedReminderKeys = new Set<string>();
let reminderTimer: ReturnType<typeof setInterval> | null = null;

const DEFAULT_REMINDER_MINUTES = 15;

const hourSlots = computed(() => {
  const hours: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) hours.push(h);
  return hours;
});

const hoursPerDay = computed(() => hourSlots.value.length);

const columns = computed<TimelineColumn[]>(() => {
  const cols: TimelineColumn[] = [];
  meta.value.days.forEach((day, dayIndex) => {
    for (const hour of hourSlots.value) {
      cols.push({
        key: `${day.date}-${hour}`,
        date: day.date,
        hour,
        dayIndex
      });
    }
  });
  return cols;
});

const colsStyle = computed(() => ({
  gridTemplateColumns: `repeat(${columns.value.length}, var(--hour-w))`
}));

const dayHeaderStyle = computed(() => ({
  gridTemplateColumns: `repeat(${meta.value.days.length}, calc(var(--hour-w) * ${hoursPerDay.value}))`
}));

const ganttRows = computed<GanttRow[]>(() => {
  const rows: GanttRow[] = [];
  const usedItemIds = new Set<number>();

  for (const source of sources.value) {
    const item = items.value.find((it) => it.sourceKey === source.sourceKey) ?? null;
    if (item) usedItemIds.add(item.id);
    rows.push({
      key: source.sourceKey,
      title: source.title,
      detail: source.detail,
      source,
      item
    });
  }

  for (const item of items.value) {
    if (usedItemIds.has(item.id)) continue;
    if (item.sourceKey && sources.value.some((s) => s.sourceKey === item.sourceKey)) continue;
    rows.push({
      key: `item-${item.id}`,
      title: item.title,
      detail: item.sourceType === "custom" ? "Tùy chỉnh" : undefined,
      item
    });
  }

  return rows.sort((a, b) => {
    const ao = a.item?.sortOrder ?? 9999;
    const bo = b.item?.sortOrder ?? 9999;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title, "vi");
  });
});

const scheduledCount = computed(() => ganttRows.value.filter((r) => r.item).length);

function dayIndex(date: string): number {
  return meta.value.days.findIndex((d) => d.date === date);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapUnit(u: number): number {
  return Math.round(u * SNAP_QUARTERS) / SNAP_QUARTERS;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatClock(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function weekdayOf(date: string): string {
  const idx = dayIndex(date);
  return idx >= 0 ? meta.value.days[idx].weekday : date.slice(8);
}

function barRangeMinutes(row: GanttRow): { start: number; end: number } | null {
  const item = row.item;
  if (!item) return null;
  if (item.startMinute == null && item.endMinute == null) {
    return { start: HOUR_START * 60, end: HOUR_END * 60 };
  }
  const start = item.startMinute ?? HOUR_START * 60;
  const end = item.endMinute ?? start + DEFAULT_HOUR_SPAN * 60;
  return { start, end };
}

function barStartLabel(row: GanttRow): string {
  const range = barRangeMinutes(row);
  if (!range || !row.item) return "";
  const clock = formatClock(range.start);
  if (row.item.planDate === row.item.endDate) return clock;
  return `${weekdayOf(row.item.planDate)} ${clock}`;
}

function barEndLabel(row: GanttRow): string {
  const range = barRangeMinutes(row);
  if (!range || !row.item) return "";
  const clock = formatClock(range.end);
  if (row.item.planDate === row.item.endDate) return clock;
  return `${weekdayOf(row.item.endDate)} ${clock}`;
}

function barTooltipTime(row: GanttRow): string {
  const start = barStartLabel(row);
  const end = barEndLabel(row);
  if (!start || !end) return "";
  return `${start} → ${end}`;
}

function barTooltip(row: GanttRow): string {
  const time = barTooltipTime(row);
  return time ? `${row.title}\n${time}` : row.title;
}

function barUnits(row: GanttRow): { start: number; end: number } | null {
  const item = row.item;
  if (!item) return null;

  const hpd = hoursPerDay.value;
  const startDay = dayIndex(item.planDate);
  if (startDay < 0) return null;
  const endDay = Math.max(dayIndex(item.endDate || item.planDate), startDay);

  if (item.startMinute == null && item.endMinute == null) {
    return {
      start: startDay * hpd,
      end: (endDay + 1) * hpd
    };
  }

  const startFrac = clamp(((item.startMinute ?? HOUR_START * 60) - HOUR_START * 60) / 60, 0, hpd);
  const endMinute = item.endMinute ?? (item.startMinute ?? HOUR_START * 60) + DEFAULT_HOUR_SPAN * 60;
  const endFrac = clamp((endMinute - HOUR_START * 60) / 60, 0, hpd);

  const start = startDay * hpd + startFrac;
  let end = endDay * hpd + endFrac;
  if (end <= start) end = start + 0.5;

  return {
    start: clamp(start, 0, columns.value.length),
    end: clamp(end, 0, columns.value.length)
  };
}

function barSizeClass(row: GanttRow): BarSize {
  const units = barUnits(row);
  if (!units) return "gantt-bar--compact";
  const span = units.end - units.start;
  if (span >= 4) return "gantt-bar--full";
  if (span >= 1.5) return "gantt-bar--mid";
  return "gantt-bar--compact";
}

function barStyle(row: GanttRow): Record<string, string> | null {
  const units = barUnits(row);
  if (!units) return null;
  const total = columns.value.length || 1;
  const left = (units.start / total) * 100;
  const width = ((units.end - units.start) / total) * 100;
  return {
    left: `calc(${left}% + 1px)`,
    width: `calc(${Math.max(width, (0.35 / total) * 100)}% - 2px)`
  };
}

function syncRoute() {
  const query: Record<string, string> = {};
  if (selectedWeekStart.value) query.week = selectedWeekStart.value;
  if (personName.value) {
    router.replace({
      name: "day-plan-person",
      params: { personName: personName.value },
      query
    });
  } else {
    router.replace({ name: "day-plan", query });
  }
}

/** Non-managers always stay on their own plan. */
function lockToOwnPlan(): boolean {
  if (canSelectPerson.value) return false;
  const mine = myPersonName.value;
  if (!mine) return false;
  if (personName.value === mine) return false;
  personName.value = mine;
  syncRoute();
  return true;
}

function onPersonChange(name: string | null) {
  if (!canSelectPerson.value) {
    lockToOwnPlan();
    void loadBoard();
    return;
  }
  personName.value = name?.trim() || "";
  syncRoute();
  void loadBoard();
}

function onWeekRangeUpdate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const picked = Array.isArray(value) ? value.find((d): d is Date => d instanceof Date) : value;
  if (!picked) return;
  const week = getWeekInfo(picked);
  selectedWeekStart.value = week.weekStart;
  setStoredWeekStart(week.weekStart);
  weekRange.value = [week.start, week.end];
  syncRoute();
  void loadBoard();
}

async function loadBoard() {
  if (!personName.value) {
    items.value = [];
    sources.value = [];
    return;
  }

  try {
    const res = await fetch(
      `/api/day-plans?week=${encodeURIComponent(selectedWeekStart.value)}&person=${encodeURIComponent(personName.value)}`,
      { headers: { ...authHeaders() } }
    );
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không tải được kế hoạch.");
    }
    const board = (await res.json()) as {
      meta: BoardMeta;
      personnel: { name: string; avatar?: string | null }[];
      sources: PlanSource[];
      items: DayPlanItem[];
    };
    meta.value = board.meta;
    setStoredWeekStart(board.meta.weekStart);
    personnel.value = board.personnel;
    sources.value = board.sources;
    items.value = board.items.map((it) => ({
      ...it,
      reminderEnabled: Boolean(it.reminderEnabled),
      reminderMinutesBefore: it.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES,
      createdBy: it.createdBy ?? ""
    }));
    checkReminders();
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không tải được kế hoạch.",
      life: 3500
    });
  }
}

async function ensurePersonnelList() {
  if (personnel.value.length) return;
  try {
    const res = await fetch(
      `/api/personal-goals?week=${encodeURIComponent(selectedWeekStart.value)}`,
      { headers: { ...authHeaders() } }
    );
    if (!res.ok) return;
    const board = (await res.json()) as {
      personnel: { name: string; avatar?: string | null }[];
    };
    personnel.value = board.personnel ?? [];
  } catch {
    /* ignore */
  }
}

function pointerUnit(trackEl: HTMLElement, clientX: number): number {
  const rect = trackEl.getBoundingClientRect();
  const ratio = clamp((clientX - rect.left) / rect.width, 0, 0.999);
  return snapUnit(ratio * columns.value.length);
}

function unitsToPayload(start: number, end: number) {
  const hpd = hoursPerDay.value;
  const dayCount = meta.value.days.length;
  const s = clamp(snapUnit(start), 0, columns.value.length - 0.25);
  const e = clamp(Math.max(snapUnit(end), s + 0.25), s + 0.25, columns.value.length);

  const startDay = clamp(Math.floor(s / hpd), 0, dayCount - 1);
  const endDay = clamp(Math.floor((e - 0.001) / hpd), startDay, dayCount - 1);
  const startFrac = s - startDay * hpd;
  const endFrac = e - endDay * hpd;

  return {
    planDate: meta.value.days[startDay].date,
    endDate: meta.value.days[endDay].date,
    startMinute: Math.round((HOUR_START + startFrac) * 60),
    endMinute: Math.round((HOUR_START + endFrac) * 60)
  };
}

async function persistItem(itemId: number, patch: Partial<DayPlanItem>) {
  const res = await fetch(`/api/day-plans/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(patch)
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "Không lưu được.");
  }
  const data = (await res.json()) as { item: DayPlanItem };
  items.value = items.value.map((it) => (it.id === itemId ? data.item : it));
  return data.item;
}

async function createItem(input: {
  title: string;
  sourceType?: SourceType;
  sourceKey?: string | null;
  planDate: string;
  endDate: string;
  startMinute?: number | null;
  endMinute?: number | null;
}) {
  const res = await fetch("/api/day-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      weekStart: selectedWeekStart.value,
      personName: personName.value,
      ...input
    })
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || "Không tạo được mục.");
  }
  const data = (await res.json()) as { item: DayPlanItem };
  items.value = [...items.value, data.item];
  return data.item;
}

function onTrackPointerDown(event: PointerEvent, row: GanttRow) {
  if (event.button !== 0) return;
  if (row.item) return;

  const trackEl = event.currentTarget as HTMLElement;
  const unit = pointerUnit(trackEl, event.clientX);
  const start = Math.floor(unit);
  const end = start + DEFAULT_HOUR_SPAN;

  dragState.value = {
    mode: "create",
    row,
    startX: event.clientX,
    originStart: start,
    originEnd: end,
    trackEl
  };

  trackEl.setPointerCapture(event.pointerId);
  void bootstrapCreate(row, start, end);
}

async function bootstrapCreate(row: GanttRow, start: number, end: number) {
  try {
    const payload = unitsToPayload(start, end);
    const item = await createItem({
      title: row.title,
      sourceType: row.source?.sourceType ?? "custom",
      sourceKey: row.source?.sourceKey ?? null,
      ...payload
    });
    if (dragState.value?.mode === "create" && dragState.value.row.key === row.key) {
      dragState.value.createdId = item.id;
      dragState.value.row = { ...row, item };
    }
  } catch (err) {
    dragState.value = null;
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không tạo được.",
      life: 3000
    });
  }
}

function onBarPointerDown(event: PointerEvent, row: GanttRow, mode: DragMode) {
  if (event.button !== 0 || !row.item) return;
  const units = barUnits(row);
  if (!units) return;

  const trackEl = (event.currentTarget as HTMLElement).closest(".gantt-track") as HTMLElement;
  if (!trackEl) return;

  dragState.value = {
    mode,
    row,
    startX: event.clientX,
    originStart: units.start,
    originEnd: units.end,
    trackEl
  };
  trackEl.setPointerCapture(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  const state = dragState.value;
  if (!state) return;

  const cur = pointerUnit(state.trackEl, event.clientX);
  const origin = pointerUnit(state.trackEl, state.startX);
  const delta = cur - origin;

  let start = state.originStart;
  let end = state.originEnd;

  if (state.mode === "move" || state.mode === "create") {
    const span = state.originEnd - state.originStart;
    start = clamp(snapUnit(state.originStart + delta), 0, columns.value.length - span);
    end = start + span;
  } else if (state.mode === "resize-start") {
    start = clamp(snapUnit(state.originStart + delta), 0, state.originEnd - 0.25);
    end = state.originEnd;
  } else if (state.mode === "resize-end") {
    start = state.originStart;
    end = clamp(snapUnit(state.originEnd + delta), state.originStart + 0.25, columns.value.length);
  }

  const itemId = state.row.item?.id ?? state.createdId;
  if (!itemId) return;

  const payload = unitsToPayload(start, end);
  items.value = items.value.map((it) =>
    it.id === itemId
      ? {
          ...it,
          planDate: payload.planDate,
          endDate: payload.endDate,
          startMinute: payload.startMinute,
          endMinute: payload.endMinute
        }
      : it
  );
}

async function onPointerUp() {
  const state = dragState.value;
  if (!state) return;
  dragState.value = null;

  const itemId = state.row.item?.id ?? state.createdId;
  if (!itemId) return;

  const item = items.value.find((it) => it.id === itemId);
  if (!item || saving.value) return;

  saving.value = true;
  try {
    await persistItem(itemId, {
      planDate: item.planDate,
      endDate: item.endDate,
      startMinute: item.startMinute,
      endMinute: item.endMinute
    });
  } catch (err) {
    await loadBoard();
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được.",
      life: 3000
    });
  } finally {
    saving.value = false;
  }
}

function onRowDragStart(_event: DragEvent, index: number) {
  rowDragFrom.value = index;
}

function onRowDragOver(key: string) {
  dragOverRowKey.value = key;
}

function onRowDragLeave(key: string) {
  if (dragOverRowKey.value === key) dragOverRowKey.value = null;
}

async function onDropReorder(toIndex: number) {
  dragOverRowKey.value = null;
  const from = rowDragFrom.value;
  rowDragFrom.value = null;
  if (from == null || from === toIndex) return;

  const next = [...ganttRows.value];
  const [moved] = next.splice(from, 1);
  next.splice(toIndex, 0, moved);

  const orderedItems: DayPlanItem[] = [];
  for (let i = 0; i < next.length; i++) {
    const row = next[i];
    if (row.item) orderedItems.push({ ...row.item, sortOrder: i });
  }

  items.value = [
    ...items.value.filter((it) => !orderedItems.some((o) => o.id === it.id)),
    ...orderedItems
  ];

  try {
    const res = await fetch("/api/day-plans/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        personName: personName.value,
        weekStart: selectedWeekStart.value,
        orderedIds: orderedItems.map((it) => it.id)
      })
    });
    if (!res.ok) throw new Error("Không sắp xếp được");
    const data = (await res.json()) as { items: DayPlanItem[] };
    const other = items.value.filter((it) => !data.items.some((d) => d.id === it.id));
    items.value = [...other, ...data.items];
  } catch {
    await loadBoard();
  }
}

async function removeItem(item: DayPlanItem) {
  const prev = items.value;
  items.value = items.value.filter((row) => row.id !== item.id);
  try {
    const res = await fetch(`/api/day-plans/${item.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("Xóa thất bại");
  } catch {
    items.value = prev;
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không xóa được mục kế hoạch.",
      life: 3000
    });
  }
}

function reminderAt(item: DayPlanItem): Date | null {
  const parsed = parseIsoDate(item.planDate);
  if (!parsed) return null;
  const startMin = item.startMinute ?? HOUR_START * 60;
  const offset = item.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES;
  const at = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
    Math.floor(startMin / 60),
    startMin % 60,
    0,
    0
  );
  at.setMinutes(at.getMinutes() - offset);
  return at;
}

function reminderKey(item: DayPlanItem): string {
  return `${item.id}:${item.planDate}:${item.startMinute ?? "na"}:${item.reminderMinutesBefore}`;
}

async function ensureNotifyPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function fireReminder(item: DayPlanItem) {
  const key = reminderKey(item);
  if (firedReminderKeys.has(key)) return;
  firedReminderKeys.add(key);

  const offset = item.reminderMinutesBefore ?? DEFAULT_REMINDER_MINUTES;
  const detail =
    offset <= 0
      ? "Đến giờ thực hiện mục tiêu"
      : `Còn ${offset} phút nữa đến lịch mục tiêu`;

  toast.add({
    severity: "warn",
    summary: item.title,
    detail,
    life: 8000
  });

  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(item.title, {
        body: detail,
        tag: `day-plan-${item.id}`
      });
    } catch {
      /* ignore */
    }
  }
}

function checkReminders(now = new Date()) {
  for (const item of items.value) {
    if (!item.reminderEnabled) continue;
    const at = reminderAt(item);
    if (!at) continue;
    const ms = now.getTime() - at.getTime();
    // Fire within a 2-minute window after due time (covers 30s poll)
    if (ms >= 0 && ms < 2 * 60 * 1000) {
      fireReminder(item);
    }
  }
}

async function toggleReminder(item: DayPlanItem) {
  const enabling = !item.reminderEnabled;
  if (enabling) {
    const ok = await ensureNotifyPermission();
    if (!ok && typeof window !== "undefined" && "Notification" in window && Notification.permission === "denied") {
      toast.add({
        severity: "warn",
        summary: "Thông báo bị chặn",
        detail: "Bật quyền thông báo trình duyệt để nhận nhắc ngoài tab.",
        life: 4500
      });
    }
  }

  const prev = { ...item };
  const next: DayPlanItem = {
    ...item,
    reminderEnabled: enabling,
    reminderMinutesBefore: item.reminderMinutesBefore || DEFAULT_REMINDER_MINUTES
  };
  items.value = items.value.map((it) => (it.id === item.id ? next : it));

  try {
    await persistItem(item.id, {
      reminderEnabled: next.reminderEnabled,
      reminderMinutesBefore: next.reminderMinutesBefore
    });
    toast.add({
      severity: "success",
      summary: enabling ? "Đã bật nhắc nhở" : "Đã tắt nhắc nhở",
      detail: enabling
        ? `Sẽ nhắc trước ${next.reminderMinutesBefore} phút khi đến giờ bắt đầu.`
        : undefined,
      life: 2800
    });
  } catch (err) {
    items.value = items.value.map((it) => (it.id === item.id ? prev : it));
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được nhắc nhở.",
      life: 3000
    });
  }
}

watch(
  () => route.params.personName,
  (value) => {
    if (!canSelectPerson.value) {
      if (lockToOwnPlan()) {
        void loadBoard();
      }
      return;
    }
    const next = String(value ?? "").trim();
    if (next !== personName.value) {
      personName.value = next;
      void loadBoard();
    }
  }
);

watch(
  [canSelectPerson, myPersonName],
  () => {
    if (lockToOwnPlan()) {
      void loadBoard();
    } else if (!canSelectPerson.value && !personName.value && myPersonName.value) {
      personName.value = myPersonName.value;
      syncRoute();
      void loadBoard();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  meta.value.days = Array.from({ length: 6 }, (_, i) => {
    const date = addDays(weekInfo.value.start, i);
    const labels = ["T2", "T3", "T4", "T5", "T6", "T7"];
    const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return {
      date: toIsoDate(date),
      weekday: labels[i],
      dayLabel: `${dayLabels[i]} ${date.getDate()}/${date.getMonth() + 1}`
    };
  });
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  reminderTimer = setInterval(() => checkReminders(), 30_000);
  checkReminders();
  lockToOwnPlan();
  if (canSelectPerson.value) {
    await ensurePersonnelList();
  }
  await loadBoard();
});

onUnmounted(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
});
</script>

<style scoped>
.week-datepicker :deep(.p-datepicker-input),
.week-datepicker-input {
  min-width: 10rem;
  font-size: 0.875rem;
}

.gantt-shell {
  overflow: hidden;
}

.gantt-scroll {
  max-width: 100%;
}

.gantt-grid {
  display: flex;
  flex-direction: column;
}

.gantt-header {
  display: grid;
  grid-template-columns: var(--label-w) minmax(0, 1fr);
  grid-template-rows: auto auto;
}

.gantt-header > .gantt-label-cell {
  grid-row: 1 / span 2;
}

.gantt-label-sticky {
  position: sticky;
  left: 0;
  z-index: 5;
  box-shadow: 6px 0 10px -8px rgb(11 28 48 / 0.28);
}

.gantt-header > .gantt-label-sticky {
  z-index: 16;
}

.gantt-row > .gantt-label-sticky {
  z-index: 4;
  background: #fff;
}

.gantt-day-headers {
  display: grid;
  grid-column: 2;
  grid-row: 1;
  background: var(--color-surface-container-low);
}

.gantt-cols {
  display: grid;
  grid-column: 2;
  grid-row: 2;
  background: color-mix(in srgb, var(--color-surface-container-low) 70%, white);
}

.gantt-row {
  display: grid;
  grid-template-columns: var(--label-w) minmax(0, 1fr);
}

.gantt-row.is-drag-over {
  background: color-mix(in srgb, var(--color-primary-fixed) 40%, white);
}

.gantt-row.is-drag-over > .gantt-label-sticky,
.gantt-row:hover > .gantt-label-sticky {
  background: #f4f6ff;
}

.gantt-track {
  display: grid;
  min-height: 56px;
}

.day-head.is-today,
.hour-head.is-today,
.gantt-cell.is-today {
  background: color-mix(in srgb, var(--color-primary) 8%, white);
}

.day-head.is-alt,
.hour-head.is-alt,
.gantt-cell.is-alt {
  background: color-mix(in srgb, var(--color-surface-container) 35%, white);
}

.day-head.is-today.is-alt,
.hour-head.is-today.is-alt,
.gantt-cell.is-today.is-alt {
  background: color-mix(in srgb, var(--color-primary) 10%, white);
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--color-on-surface-variant);
  background: var(--color-surface-container);
}

.source-badge--week {
  color: var(--color-primary);
  background: var(--color-primary-fixed);
}

.source-badge--personal {
  color: var(--color-on-secondary-fixed-variant);
  background: var(--color-secondary-fixed);
}

.gantt-bar {
  z-index: 1;
  border-radius: 0 !important;
  background: var(--color-primary);
  touch-action: none;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.12);
}

.gantt-bar--full {
  justify-content: space-between;
}

.gantt-bar--mid,
.gantt-bar--compact {
  justify-content: center;
}

.gantt-bar-time {
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.01em;
  color: rgb(255 255 255 / 0.92);
}

.gantt-bar--remind {
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.12),
    inset 3px 0 0 0 #f9ab00;
}

.gantt-handle {
  background: transparent;
}

.gantt-bar:hover .gantt-handle {
  background: rgb(255 255 255 / 0.28);
}
</style>
