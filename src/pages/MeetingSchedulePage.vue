<template>
  <div class="meet-page">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h2 class="mb-1 text-headline-lg text-primary">LỊCH HỌP</h2>
        <div class="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
          <span>
            {{ owner.name }}
            <span class="text-outline-variant"> · </span>
            {{ weekInfo.weekLabel }}
          </span>
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
      </div>

      <button
        type="button"
        class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-label-md text-on-primary transition-colors hover:brightness-110"
        @click="openCreate()"
      >
        <Icon name="add" icon-class="text-[18px]" />
        Thêm lịch họp
      </button>
    </header>

    <div class="meet-panel overflow-hidden border border-outline-variant/40 bg-white ambient-shadow">
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-outline-variant/40 bg-surface-container-low/70 px-3 py-2.5 sm:px-4"
      >
        <div
          class="meet-view-toggle inline-flex rounded-full bg-white p-0.5 shadow-[inset_0_0_0_1px_rgb(199_196_215/0.55)]"
          role="tablist"
          aria-label="Chế độ xem"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="viewMode === 'week'"
            class="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors"
            :class="
              viewMode === 'week'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            "
            @click="viewMode = 'week'"
          >
            <Icon name="calendar_view_week" icon-class="text-[16px]" />
            Tuần
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="viewMode === 'list'"
            class="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold transition-colors"
            :class="
              viewMode === 'list'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-primary'
            "
            @click="viewMode = 'list'"
          >
            <Icon name="view_list" icon-class="text-[16px]" />
            Danh sách
          </button>
        </div>

        <div class="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <span
            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
            :class="weekBadgeClass"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
            {{ weekBadgeLabel }}
          </span>
          <span class="text-xs text-on-surface-variant">
            <strong class="tabular-nums text-on-surface">{{ weekMeetings.length }}</strong>
            lịch họp
          </span>
        </div>

        <p
          v-if="viewMode === 'week'"
          class="ml-auto hidden max-w-md truncate text-[11px] text-outline xl:block"
        >
          Kéo để đổi giờ · kéo cạnh để đổi thời lượng · kéo trống để tạo mới
        </p>
      </div>

      <!-- WEEK TIMELINE -->
      <div v-if="viewMode === 'week'" class="meet-shell">
        <div class="meet-scroll overflow-x-auto">
          <div
            class="meet-grid"
            :style="{
              '--time-w': '56px',
              '--hour-h': `${HOUR_H}px`,
              minWidth: '760px'
            }"
          >
            <div
              class="meet-corner sticky left-0 top-0 z-30 border-b border-r border-outline-variant/40 bg-white"
            />
            <div
              v-for="day in days"
              :key="`h-${day.date}`"
              class="meet-day-head sticky top-0 z-20 border-b border-r border-outline-variant/30 px-2 py-3 text-center"
              :class="day.date === todayIso ? 'is-today' : ''"
            >
              <div
                class="text-[11px] font-semibold uppercase tracking-wide"
                :class="day.date === todayIso ? 'text-primary' : 'text-outline'"
              >
                {{ day.label }}
              </div>
              <div
                class="mx-auto mt-1.5 flex h-8 w-8 items-center justify-center text-[14px] font-bold tabular-nums"
                :class="
                  day.date === todayIso
                    ? 'rounded-full bg-primary text-on-primary'
                    : 'text-on-surface'
                "
              >
                {{ day.dayNum }}
              </div>
              <div class="mt-1 text-[10px] tabular-nums text-outline">
                {{ day.meetings.length ? `${day.meetings.length} họp` : "—" }}
              </div>
            </div>

            <div class="meet-time-col sticky left-0 z-10 border-r border-outline-variant/40 bg-white">
              <div
                v-for="hour in hours"
                :key="`t-${hour}`"
                class="meet-hour-label relative border-b border-dashed border-outline-variant/20"
                :style="{ height: `${HOUR_H}px` }"
              >
                <span
                  class="absolute right-2 text-[10px] tabular-nums text-outline"
                  :class="hour === HOUR_START ? 'top-1' : '-top-2.5'"
                >
                  {{ hour }}:00
                </span>
              </div>
            </div>

            <div
              v-for="day in days"
              :key="`c-${day.date}`"
              class="meet-day-col relative border-r border-outline-variant/25"
              :class="day.date === todayIso ? 'is-today' : ''"
              :data-weekday="day.weekday"
              :style="{ height: `${hours.length * HOUR_H}px` }"
              @pointerdown="onColumnPointerDown($event, day.weekday)"
            >
              <div
                v-for="hour in hours"
                :key="`gl-${day.date}-${hour}`"
                class="pointer-events-none absolute left-0 right-0 border-b border-dashed border-outline-variant/15"
                :style="{ top: `${(hour - HOUR_START) * HOUR_H}px`, height: `${HOUR_H}px` }"
              />

              <div
                v-if="day.date === todayIso && nowTop !== null"
                class="pointer-events-none absolute left-0 right-0 z-20"
                :style="{ top: `${nowTop}px` }"
              >
                <div class="h-0.5 bg-error" />
                <div class="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-error shadow-sm" />
              </div>

              <div
                v-for="mtg in day.layout"
                :key="mtg.id"
                class="meet-block absolute select-none overflow-hidden text-left"
                :class="[
                  mtg.isBlock ? 'meet-block--soft' : 'meet-block--solid',
                  dragState?.meetingId === mtg.id ? 'is-dragging' : '',
                  savingId === mtg.id ? 'opacity-70' : ''
                ]"
                :style="blockStyle(mtg)"
                @pointerdown.stop="onBlockPointerDown($event, mtg, 'move')"
                @dblclick.stop="openEdit(mtg)"
              >
                <div
                  class="meet-handle meet-handle--top"
                  @pointerdown.stop="onBlockPointerDown($event, mtg, 'resize-start')"
                />
                <p class="truncate pr-1 text-[11px] font-bold leading-tight">{{ mtg.title }}</p>
                <p class="mt-0.5 truncate text-[10px] opacity-80">
                  {{ formatTimeRange(mtg.startMin, mtg.endMin) }}
                </p>
                <p v-if="mtg.location && !mtg.isBlock" class="mt-0.5 truncate text-[10px] opacity-70">
                  {{ mtg.location }}
                </p>
                <div
                  class="meet-handle meet-handle--bottom"
                  @pointerdown.stop="onBlockPointerDown($event, mtg, 'resize-end')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- LIST VIEW -->
      <div v-else class="meet-list-shell">
        <div
          v-if="!weekMeetings.length"
          class="flex flex-col items-center px-5 py-16 text-center"
        >
          <div
            class="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <Icon name="event_available" icon-class="text-[24px]" />
          </div>
          <p class="text-sm font-medium text-on-surface">Chưa có lịch họp tuần này</p>
          <p class="mt-1 max-w-sm text-xs text-on-surface-variant">
            Bấm “Thêm lịch họp” hoặc chuyển sang xem Tuần rồi kéo trên timeline để tạo nhanh.
          </p>
        </div>

        <section
          v-for="(day, idx) in daysWithMeetings"
          :key="`list-${day.date}`"
          :class="idx > 0 ? 'border-t border-outline-variant/35' : ''"
        >
          <header
            class="flex items-center justify-between bg-surface-container-low/80 px-4 py-2.5"
            :class="day.date === todayIso ? 'is-today-bar' : ''"
          >
            <div class="flex items-center gap-2.5">
              <span
                class="flex h-8 w-8 items-center justify-center text-[13px] font-bold tabular-nums"
                :class="
                  day.date === todayIso
                    ? 'rounded-full bg-primary text-on-primary'
                    : 'rounded-full bg-white text-on-surface shadow-[inset_0_0_0_1px_rgb(199_196_215/0.5)]'
                "
              >
                {{ day.dayNum }}
              </span>
              <div>
                <p class="text-sm font-bold text-on-surface">{{ day.label }}</p>
                <p class="text-[11px] tabular-nums text-on-surface-variant">
                  {{ day.dayNum }}/{{ day.monthNum }} · {{ day.meetings.length }} họp
                </p>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
              @click="openCreate(day.weekday)"
            >
              <Icon name="add" icon-class="text-[14px]" />
              Thêm
            </button>
          </header>

          <ul class="divide-y divide-outline-variant/25">
            <li
              v-for="mtg in day.meetingsSorted"
              :key="mtg.id"
              class="group flex cursor-pointer gap-3 px-4 py-3.5 transition-colors hover:bg-primary/[0.03]"
              @click="openEdit(mtg)"
            >
              <div
                class="mt-0.5 w-1 shrink-0 self-stretch rounded-full"
                :class="mtg.isBlock ? 'bg-outline-variant' : 'bg-primary'"
              />
              <div class="w-[6.5rem] shrink-0">
                <p class="text-[12px] font-bold tabular-nums text-on-surface">
                  {{ formatTimeRange(mtg.startMin, mtg.endMin) }}
                </p>
                <p v-if="mtg.isBlock" class="mt-0.5 text-[10px] font-medium text-outline">Ca full</p>
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-semibold text-on-surface group-hover:text-primary">
                  {{ mtg.title }}
                </p>
                <div class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-on-surface-variant">
                  <span v-if="mtg.attendees" class="inline-flex items-center gap-1">
                    <Icon name="group" icon-class="text-[14px]" />
                    {{ mtg.attendees }}
                  </span>
                  <span v-if="mtg.location" class="inline-flex items-center gap-1">
                    <Icon name="location_on" icon-class="text-[14px]" />
                    {{ mtg.location }}
                  </span>
                </div>
              </div>
              <Icon
                name="chevron_right"
                icon-class="mt-0.5 text-[18px] text-outline opacity-0 transition-opacity group-hover:opacity-100"
              />
            </li>
          </ul>
        </section>
      </div>
    </div>

    <!-- Create / Edit dialog -->
    <Dialog
      v-model:visible="formOpen"
      modal
      :header="form.id ? 'Sửa lịch họp' : 'Thêm lịch họp'"
      :style="{ width: '32rem' }"
      @hide="resetForm"
    >
      <form class="space-y-3" @submit.prevent="saveForm">
        <div>
          <label class="mb-1 block text-[11px] font-medium text-outline">Nội dung</label>
          <InputText v-model="form.title" class="w-full" placeholder="Tên cuộc họp" autofocus />
        </div>

        <div>
          <label class="mb-1 block text-[11px] font-medium text-outline">Thứ</label>
          <Select
            v-model="form.weekday"
            :options="weekdayOptions"
            optionLabel="label"
            optionValue="value"
            class="w-full"
          />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="mb-1 block text-[11px] font-medium text-outline">Bắt đầu</label>
            <InputText v-model="form.startTime" type="time" class="w-full" />
          </div>
          <div>
            <label class="mb-1 block text-[11px] font-medium text-outline">Kết thúc</label>
            <InputText v-model="form.endTime" type="time" class="w-full" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-[11px] font-medium text-outline">Nhân sự tham gia</label>
          <InputText v-model="form.attendees" class="w-full" placeholder="Mr / Ms …" />
        </div>

        <div>
          <label class="mb-1 block text-[11px] font-medium text-outline">Địa điểm</label>
          <InputText v-model="form.location" class="w-full" placeholder="Phòng họp / Online" />
        </div>

        <div>
          <label class="mb-1 block text-[11px] font-medium text-outline">Ghi chú</label>
          <Textarea v-model="form.note" class="w-full" rows="2" autoResize />
        </div>

        <label class="flex items-center gap-2 text-sm text-on-surface-variant">
          <input v-model="form.isBlock" type="checkbox" class="accent-primary" />
          Ca full (sáng/chiều)
        </label>

        <div class="flex items-center justify-between gap-2 pt-2">
          <button
            v-if="form.id"
            type="button"
            class="text-sm font-medium text-error hover:underline"
            :disabled="formSaving"
            @click="confirmDelete"
          >
            Xóa
          </button>
          <div v-else />
          <div class="flex gap-2">
            <button
              type="button"
              class="rounded-none border border-outline-variant/50 bg-white px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
              @click="formOpen = false"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="rounded-none bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
              :disabled="formSaving || !form.title.trim()"
            >
              {{ formSaving ? "Đang lưu…" : "Lưu" }}
            </button>
          </div>
        </div>
      </form>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import Dialog from "primevue/dialog";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import {
  DEFAULT_MEETING_OWNER,
  MEETING_OWNERS,
  formatTimeRange,
  layoutDayMeetings,
  minutesToTimeInput,
  timeInputToMinutes,
  weekdayLabel,
  type Meeting,
  type Weekday
} from "@/lib/meetings";
import { addDays, getWeekInfo, startOfWeek, toIsoDate } from "@/lib/week";

const HOUR_START = 8;
const HOUR_END = 18;
const HOUR_H = 56;
const SNAP = 15;
const MIN_SPAN = 30;
const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

type DragMode = "move" | "resize-start" | "resize-end" | "create";

interface DragState {
  mode: DragMode;
  meetingId: number | null;
  originWeekday: Weekday;
  originStart: number;
  originEnd: number;
  startClientY: number;
  startClientX: number;
  moved: boolean;
}

const toast = useToast();
const confirm = useConfirm();
const owner = MEETING_OWNERS[0];
const ownerKey = DEFAULT_MEETING_OWNER;

const viewMode = ref<"week" | "list">("week");
const initialWeek = getWeekInfo();
const weekRange = ref<Date[] | null>([initialWeek.start, initialWeek.end]);
const meetings = ref<Meeting[]>([]);
const loading = ref(false);
const savingId = ref<number | null>(null);
const nowTick = ref(Date.now());
const dragState = ref<DragState | null>(null);
const suppressClickUntil = ref(0);

const formOpen = ref(false);
const formSaving = ref(false);
const form = reactive({
  id: null as number | null,
  title: "",
  weekday: 2 as Weekday,
  startTime: "09:00",
  endTime: "10:00",
  attendees: "",
  location: "",
  note: "",
  isBlock: false
});

const weekdayOptions = [
  { value: 2 as Weekday, label: "Thứ 2" },
  { value: 3 as Weekday, label: "Thứ 3" },
  { value: 4 as Weekday, label: "Thứ 4" },
  { value: 5 as Weekday, label: "Thứ 5" },
  { value: 6 as Weekday, label: "Thứ 6" }
];

const weekInfo = computed(() => {
  const picked = weekRange.value?.[0];
  return getWeekInfo(picked instanceof Date ? picked : new Date());
});
const todayIso = toIsoDate(new Date());
const thisWeekStart = toIsoDate(startOfWeek(new Date()));

const weekMeetings = computed(() =>
  meetings.value.filter((m) => m.weekStart === weekInfo.value.weekStart)
);

const weekBadgeLabel = computed(() => {
  if (weekInfo.value.weekStart === thisWeekStart) return "Tuần này";
  const next = toIsoDate(addDays(startOfWeek(new Date()), 7));
  if (weekInfo.value.weekStart === next) return "Tuần sau";
  const prev = toIsoDate(addDays(startOfWeek(new Date()), -7));
  if (weekInfo.value.weekStart === prev) return "Tuần trước";
  return `Tuần ${weekInfo.value.weekOfMonth}`;
});

const weekBadgeClass = computed(() =>
  weekInfo.value.weekStart === thisWeekStart
    ? "bg-primary/10 text-primary"
    : "bg-amber-100 text-amber-900"
);

interface DayCol {
  date: string;
  weekday: Weekday;
  label: string;
  dayNum: number;
  monthNum: number;
  meetings: Meeting[];
  meetingsSorted: Meeting[];
  layout: ReturnType<typeof layoutDayMeetings>;
}

const days = computed<DayCol[]>(() => {
  const monday = weekInfo.value.start;
  return ([2, 3, 4, 5, 6] as Weekday[]).map((weekday, offset) => {
    const d = addDays(monday, offset);
    const date = toIsoDate(d);
    const dayMeetings = weekMeetings.value.filter((m) => m.weekday === weekday);
    const meetingsSorted = [...dayMeetings].sort(
      (a, b) => a.startMin - b.startMin || a.endMin - b.endMin
    );
    return {
      date,
      weekday,
      label: weekdayLabel(weekday),
      dayNum: d.getDate(),
      monthNum: d.getMonth() + 1,
      meetings: dayMeetings,
      meetingsSorted,
      layout: layoutDayMeetings(dayMeetings)
    };
  });
});

const daysWithMeetings = computed(() => days.value.filter((d) => d.meetings.length > 0));

const nowTop = computed(() => {
  void nowTick.value;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = HOUR_START * 60;
  const end = HOUR_END * 60;
  if (mins < start || mins > end) return null;
  return ((mins - start) / 60) * HOUR_H;
});

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function snapMin(m: number) {
  return Math.round(m / SNAP) * SNAP;
}

function blockStyle(mtg: Meeting & { col: number; colCount: number }) {
  const start = HOUR_START * 60;
  const top = ((mtg.startMin - start) / 60) * HOUR_H;
  const height = Math.max(((mtg.endMin - mtg.startMin) / 60) * HOUR_H - 2, 22);
  const gap = 2;
  const widthPct = 100 / mtg.colCount;
  const leftPct = mtg.col * widthPct;

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPct}% + ${gap}px)`,
    width: `calc(${widthPct}% - ${gap * 2}px)`,
    background: mtg.isBlock ? "#e8eef8" : "#e0f2fe",
    color: "#1e3a5f",
    borderLeft: "3px solid #38bdf8",
    zIndex: dragState.value?.meetingId === mtg.id ? 40 : mtg.isBlock ? 1 : 2,
    opacity: mtg.isBlock ? 0.72 : 1,
    cursor: "grab"
  };
}

function onWeekRangeUpdate(value: Date | Date[] | (Date | null)[] | null | undefined) {
  const picked = Array.isArray(value) ? value.find((d): d is Date => d instanceof Date) : value;
  if (!picked) return;

  const week = getWeekInfo(picked);
  const sameRange =
    Array.isArray(value) &&
    value[0] instanceof Date &&
    value[1] instanceof Date &&
    value[0].getTime() === week.start.getTime() &&
    value[1].getTime() === week.end.getTime();

  if (!sameRange) {
    weekRange.value = [week.start, week.end];
  }
}

async function loadWeek() {
  loading.value = true;
  try {
    const res = await fetch(
      `/api/meetings?owner=${encodeURIComponent(ownerKey)}&week=${encodeURIComponent(weekInfo.value.weekStart)}`,
      { headers: { ...authHeaders() } }
    );
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không tải được lịch họp.");
    }
    const data = (await res.json()) as { meetings: Meeting[] };
    meetings.value = data.meetings;
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không tải được lịch họp.",
      life: 3500
    });
  } finally {
    loading.value = false;
  }
}

async function persistMeeting(
  id: number,
  patch: Partial<{
    weekStart: string;
    weekday: Weekday;
    startMin: number;
    endMin: number;
    title: string;
    attendees: string;
    location: string;
    note: string;
    isBlock: boolean;
  }>
) {
  savingId.value = id;
  try {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(patch)
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không lưu được.");
    }
    const data = (await res.json()) as { item: Meeting };
    meetings.value = meetings.value.map((m) => (m.id === id ? data.item : m));
    return data.item;
  } finally {
    savingId.value = null;
  }
}

function patchLocal(id: number, patch: Partial<Meeting>) {
  meetings.value = meetings.value.map((m) => (m.id === id ? { ...m, ...patch } : m));
}

function yToMinutes(clientY: number, colEl: HTMLElement): number {
  const rect = colEl.getBoundingClientRect();
  const y = clamp(clientY - rect.top, 0, rect.height);
  const mins = HOUR_START * 60 + (y / HOUR_H) * 60;
  return snapMin(clamp(mins, HOUR_START * 60, HOUR_END * 60));
}

function findDayCol(clientX: number, clientY: number): { el: HTMLElement; weekday: Weekday } | null {
  const els = document.elementsFromPoint(clientX, clientY);
  for (const el of els) {
    if (!(el instanceof HTMLElement)) continue;
    const col = el.closest(".meet-day-col") as HTMLElement | null;
    if (!col) continue;
    const w = Number(col.dataset.weekday);
    if (w === 2 || w === 3 || w === 4 || w === 5 || w === 6) {
      return { el: col, weekday: w };
    }
  }
  return null;
}

function onBlockPointerDown(event: PointerEvent, mtg: Meeting, mode: DragMode) {
  if (event.button !== 0) return;
  event.preventDefault();
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);

  dragState.value = {
    mode,
    meetingId: mtg.id,
    originWeekday: mtg.weekday,
    originStart: mtg.startMin,
    originEnd: mtg.endMin,
    startClientY: event.clientY,
    startClientX: event.clientX,
    moved: false
  };
}

function onColumnPointerDown(event: PointerEvent, weekday: Weekday) {
  if (event.button !== 0) return;
  if ((event.target as HTMLElement).closest(".meet-block")) return;

  const col = event.currentTarget as HTMLElement;
  const start = yToMinutes(event.clientY, col);
  const end = Math.min(HOUR_END * 60, start + 60);

  dragState.value = {
    mode: "create",
    meetingId: null,
    originWeekday: weekday,
    originStart: start,
    originEnd: end,
    startClientY: event.clientY,
    startClientX: event.clientX,
    moved: false
  };

  void bootstrapCreate(weekday, start, end);
}

async function bootstrapCreate(weekday: Weekday, startMin: number, endMin: number) {
  try {
    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        ownerKey,
        weekStart: weekInfo.value.weekStart,
        weekday,
        startMin,
        endMin,
        title: "Họp mới"
      })
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không tạo được.");
    }
    const data = (await res.json()) as { item: Meeting };
    meetings.value = [...meetings.value, data.item];
    if (dragState.value?.mode === "create") {
      dragState.value.meetingId = data.item.id;
      dragState.value.originStart = data.item.startMin;
      dragState.value.originEnd = data.item.endMin;
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

function onPointerMove(event: PointerEvent) {
  const state = dragState.value;
  if (!state || state.meetingId == null) return;

  const dx = Math.abs(event.clientX - state.startClientX);
  const dy = Math.abs(event.clientY - state.startClientY);
  if (dx > 3 || dy > 3) state.moved = true;

  const hit = findDayCol(event.clientX, event.clientY);
  const weekday = hit?.weekday ?? state.originWeekday;
  const colEl =
    hit?.el ??
    (document.querySelector(`.meet-day-col[data-weekday="${state.originWeekday}"]`) as HTMLElement | null);
  if (!colEl) return;

  const curMin = yToMinutes(event.clientY, colEl);
  const originMin = yToMinutes(state.startClientY, colEl);
  const delta = curMin - originMin;

  let start = state.originStart;
  let end = state.originEnd;

  if (state.mode === "move" || state.mode === "create") {
    const span = state.originEnd - state.originStart;
    start = snapMin(
      clamp(state.originStart + delta, HOUR_START * 60, HOUR_END * 60 - span)
    );
    end = start + span;
  } else if (state.mode === "resize-start") {
    start = snapMin(clamp(state.originStart + delta, HOUR_START * 60, state.originEnd - MIN_SPAN));
    end = state.originEnd;
  } else if (state.mode === "resize-end") {
    start = state.originStart;
    end = snapMin(clamp(state.originEnd + delta, state.originStart + MIN_SPAN, HOUR_END * 60));
  }

  const nextWeekday = state.mode === "move" || state.mode === "create" ? weekday : state.originWeekday;
  patchLocal(state.meetingId, {
    weekday: nextWeekday,
    startMin: start,
    endMin: end,
    weekStart: weekInfo.value.weekStart
  });
}

async function onPointerUp() {
  const state = dragState.value;
  if (!state) return;
  dragState.value = null;

  if (state.moved) {
    suppressClickUntil.value = Date.now() + 250;
  }

  if (state.meetingId == null) return;
  const item = meetings.value.find((m) => m.id === state.meetingId);
  if (!item) return;

  // Open edit if it was a simple click (not drag)
  if (!state.moved && state.mode === "move") {
    openEdit(item);
    return;
  }

  if (!state.moved && state.mode === "create") {
    openEdit(item);
    return;
  }

  try {
    await persistMeeting(item.id, {
      weekStart: item.weekStart,
      weekday: item.weekday,
      startMin: item.startMin,
      endMin: item.endMin
    });
  } catch (err) {
    await loadWeek();
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được.",
      life: 3000
    });
  }
}

function resetForm() {
  form.id = null;
  form.title = "";
  form.weekday = 2;
  form.startTime = "09:00";
  form.endTime = "10:00";
  form.attendees = "";
  form.location = "";
  form.note = "";
  form.isBlock = false;
}

function openCreate(weekday: Weekday = 2) {
  resetForm();
  form.weekday = weekday;
  formOpen.value = true;
}

function openEdit(mtg: Meeting) {
  if (Date.now() < suppressClickUntil.value) return;
  form.id = mtg.id;
  form.title = mtg.title;
  form.weekday = mtg.weekday;
  form.startTime = minutesToTimeInput(mtg.startMin);
  form.endTime = minutesToTimeInput(mtg.endMin);
  form.attendees = mtg.attendees;
  form.location = mtg.location;
  form.note = mtg.note;
  form.isBlock = mtg.isBlock;
  formOpen.value = true;
}

async function saveForm() {
  const startMin = timeInputToMinutes(form.startTime);
  const endMin = timeInputToMinutes(form.endTime);
  if (startMin == null || endMin == null || endMin <= startMin) {
    toast.add({
      severity: "warn",
      summary: "Thời gian",
      detail: "Khung giờ không hợp lệ.",
      life: 2500
    });
    return;
  }

  formSaving.value = true;
  try {
    if (form.id) {
      await persistMeeting(form.id, {
        title: form.title.trim(),
        weekday: form.weekday,
        startMin,
        endMin,
        attendees: form.attendees,
        location: form.location,
        note: form.note,
        isBlock: form.isBlock,
        weekStart: weekInfo.value.weekStart
      });
    } else {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          ownerKey,
          weekStart: weekInfo.value.weekStart,
          weekday: form.weekday,
          startMin,
          endMin,
          title: form.title.trim(),
          attendees: form.attendees,
          location: form.location,
          note: form.note,
          isBlock: form.isBlock
        })
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Không tạo được.");
      }
      const data = (await res.json()) as { item: Meeting };
      meetings.value = [...meetings.value, data.item];
    }
    formOpen.value = false;
    toast.add({ severity: "success", summary: "Đã lưu", life: 1800 });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được.",
      life: 3000
    });
  } finally {
    formSaving.value = false;
  }
}

function confirmDelete() {
  if (!form.id) return;
  const id = form.id;
  confirm.require({
    message: "Xóa lịch họp này?",
    header: "Xác nhận",
    icon: "pi pi-exclamation-triangle",
    acceptLabel: "Xóa",
    rejectLabel: "Hủy",
    acceptClass: "p-button-danger",
    accept: () => {
      void deleteMeeting(id);
    }
  });
}

async function deleteMeeting(id: number) {
  const prev = meetings.value;
  meetings.value = meetings.value.filter((m) => m.id !== id);
  formOpen.value = false;
  try {
    const res = await fetch(`/api/meetings/${id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("Xóa thất bại");
    toast.add({ severity: "success", summary: "Đã xóa", life: 1600 });
  } catch {
    meetings.value = prev;
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không xóa được lịch họp.",
      life: 3000
    });
  }
}

watch(
  () => weekInfo.value.weekStart,
  () => {
    void loadWeek();
  }
);

let nowTimer: number | undefined;
onMounted(() => {
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  nowTimer = window.setInterval(() => {
    nowTick.value = Date.now();
  }, 60_000);
  void loadWeek();
});

onUnmounted(() => {
  window.removeEventListener("pointermove", onPointerMove);
  window.removeEventListener("pointerup", onPointerUp);
  if (nowTimer !== undefined) window.clearInterval(nowTimer);
});
</script>

<style scoped>
.meet-grid {
  display: grid;
  grid-template-columns: var(--time-w) repeat(5, minmax(0, 1fr));
  grid-template-rows: auto 1fr;
}

.meet-corner {
  grid-column: 1;
  grid-row: 1;
}

.meet-day-head {
  grid-row: 1;
}

.meet-day-head.is-today,
.meet-day-col.is-today {
  background: color-mix(in srgb, var(--color-primary) 5%, white);
}

.meet-time-col {
  grid-column: 1;
  grid-row: 2;
}

.meet-day-col {
  grid-row: 2;
  touch-action: none;
}

.meet-block {
  padding: 6px 7px 8px;
  border-radius: 6px;
  touch-action: none;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.meet-block:hover {
  box-shadow: 0 4px 14px rgba(11, 28, 48, 0.12);
  z-index: 5 !important;
}

.meet-block.is-dragging {
  box-shadow: 0 10px 28px rgba(11, 28, 48, 0.2);
  cursor: grabbing !important;
  transform: scale(1.01);
  z-index: 40 !important;
}

.meet-block--soft {
  border-style: dashed;
  border-width: 1px;
  border-color: color-mix(in srgb, currentColor 22%, transparent);
  border-left-width: 3px;
}

.meet-block--solid {
  box-shadow: 0 1px 2px rgba(11, 28, 48, 0.06);
}

.meet-handle {
  position: absolute;
  left: 0;
  right: 0;
  height: 8px;
  cursor: ns-resize;
}

.meet-handle--top {
  top: 0;
}

.meet-handle--bottom {
  bottom: 0;
}

.is-today-bar {
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.week-datepicker {
  width: auto;
}

.week-datepicker :deep(.p-datepicker-input),
.week-datepicker :deep(.week-datepicker-input) {
  min-width: 12.5rem;
  border: none;
  background: transparent;
  box-shadow: none;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-primary);
  padding-inline: 0.25rem 0.5rem;
}

.week-datepicker :deep(.p-datepicker),
.week-datepicker :deep(.p-inputwrapper) {
  border: none;
  background: transparent;
  box-shadow: none;
}
</style>
