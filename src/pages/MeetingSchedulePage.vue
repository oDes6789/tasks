<template>
  <div class="meet-page">
    <header class="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="min-w-0">
        <h2 class="mb-1 text-headline-lg text-primary">LỊCH HỌP</h2>
        <p class="text-sm text-on-surface-variant">
          {{ owner.name }}
          <span class="text-outline-variant"> · </span>
          {{ weekInfo.weekLabel }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="flex items-center overflow-hidden border border-outline-variant/50 bg-white">
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            title="Tuần trước"
            @click="shiftWeek(-1)"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            class="h-10 border-x border-outline-variant/40 px-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            @click="goThisWeek"
          >
            Hôm nay
          </button>
          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
            title="Tuần sau"
            @click="shiftWeek(1)"
          >
            <Icon name="chevron_right" />
          </button>
        </div>

        <div class="flex overflow-hidden border border-outline-variant/50 bg-white">
          <button
            type="button"
            class="h-10 px-4 text-label-md transition-colors"
            :class="viewMode === 'week' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'"
            @click="viewMode = 'week'"
          >
            Tuần
          </button>
          <button
            type="button"
            class="h-10 px-4 text-label-md transition-colors"
            :class="viewMode === 'list' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container-low'"
            @click="viewMode = 'list'"
          >
            Danh sách
          </button>
        </div>

        <button
          type="button"
          class="inline-flex h-10 items-center gap-1.5 bg-primary px-4 text-label-md text-on-primary transition-opacity hover:opacity-90"
          @click="openCreate()"
        >
          <Icon name="add" icon-class="text-[18px]" />
          Thêm họp
        </button>
      </div>
    </header>

    <div
      class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 border border-outline-variant/40 bg-white px-4 py-2.5"
    >
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
        :class="weekBadgeClass"
      >
        <span class="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
        {{ weekBadgeLabel }}
      </span>
      <span class="text-xs text-on-surface-variant">
        <strong class="text-on-surface">{{ weekMeetings.length }}</strong> lịch họp
      </span>
      <span class="inline-flex items-center gap-1 text-[11px] text-outline">
        <Icon name="info" icon-class="text-[14px]" />
        Kéo block để đổi giờ/ngày · kéo cạnh trên/dưới để đổi thời lượng · kéo trống để tạo mới
      </span>
      <div class="ml-auto flex flex-wrap gap-2">
        <span
          v-for="kind in usedKinds"
          :key="kind"
          class="inline-flex items-center gap-1.5 text-[11px] text-on-surface-variant"
        >
          <span
            class="h-2 w-2 rounded-sm"
            :style="{ background: MEETING_KIND_META[kind].border }"
          />
          {{ MEETING_KIND_META[kind].label }}
        </span>
      </div>
    </div>

    <!-- Notes -->
    <div class="mb-4 border border-amber-200/80 bg-amber-50/80 px-4 py-3">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800/70">
          Ghi chú tuần
        </p>
      </div>
      <ul v-if="weekNotes.length" class="mb-2 space-y-1">
        <li
          v-for="note in weekNotes"
          :key="note.id"
          class="group flex items-start gap-2 text-sm text-amber-950"
        >
          <Icon name="sticky_note_2" icon-class="mt-0.5 text-[16px] text-amber-600" />
          <span class="min-w-0 flex-1">{{ note.text }}</span>
          <button
            type="button"
            class="shrink-0 p-0.5 text-amber-700/50 opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
            title="Xóa ghi chú"
            @click="removeNote(note)"
          >
            <Icon name="close" icon-class="text-[14px]" />
          </button>
        </li>
      </ul>
      <div class="flex gap-2">
        <InputText
          v-model="newNoteText"
          placeholder="Thêm ghi chú…"
          class="min-w-0 flex-1 text-sm"
          @keydown.enter.prevent="addNote"
        />
        <button
          type="button"
          class="shrink-0 border border-amber-300/80 bg-white px-3 text-xs font-medium text-amber-900 hover:bg-amber-100"
          :disabled="!newNoteText.trim()"
          @click="addNote"
        >
          Thêm
        </button>
      </div>
    </div>

    <!-- WEEK TIMELINE -->
    <div v-if="viewMode === 'week'" class="meet-shell border border-outline-variant/40 bg-white">
      <div class="meet-scroll overflow-x-auto">
        <div
          class="meet-grid"
          :style="{
            '--time-w': '56px',
            '--hour-h': `${HOUR_H}px`,
            minWidth: '720px'
          }"
        >
          <div class="meet-corner sticky left-0 top-0 z-30 border-b border-r border-outline-variant/50 bg-surface-container-low" />
          <div
            v-for="day in days"
            :key="`h-${day.date}`"
            class="meet-day-head sticky top-0 z-20 border-b border-r border-outline-variant/40 px-2 py-2.5 text-center"
            :class="day.date === todayIso ? 'is-today' : day.weekday % 2 === 1 ? 'is-alt' : ''"
          >
            <div class="text-[11px] font-bold text-on-surface">{{ day.label }}</div>
            <div
              class="mt-0.5 text-[12px] tabular-nums"
              :class="day.date === todayIso ? 'font-bold text-primary' : 'text-on-surface-variant'"
            >
              {{ day.dayNum }}/{{ day.monthNum }}
            </div>
            <div class="mt-1 text-[10px] text-outline">{{ day.meetings.length }} họp</div>
          </div>

          <div class="meet-time-col sticky left-0 z-10 border-r border-outline-variant/50 bg-white">
            <div
              v-for="hour in hours"
              :key="`t-${hour}`"
              class="meet-hour-label relative border-b border-dashed border-outline-variant/25"
              :style="{ height: `${HOUR_H}px` }"
            >
              <span class="absolute -top-2.5 right-2 text-[10px] tabular-nums text-on-surface-variant">
                {{ hour }}:00
              </span>
            </div>
          </div>

          <div
            v-for="day in days"
            :key="`c-${day.date}`"
            class="meet-day-col relative border-r border-outline-variant/30"
            :class="day.date === todayIso ? 'is-today' : day.weekday % 2 === 1 ? 'is-alt' : ''"
            :data-weekday="day.weekday"
            :style="{ height: `${hours.length * HOUR_H}px` }"
            @pointerdown="onColumnPointerDown($event, day.weekday)"
          >
            <div
              v-for="hour in hours"
              :key="`gl-${day.date}-${hour}`"
              class="pointer-events-none absolute left-0 right-0 border-b border-dashed border-outline-variant/20"
              :style="{ top: `${(hour - HOUR_START) * HOUR_H}px`, height: `${HOUR_H}px` }"
            />

            <div
              v-if="day.date === todayIso && nowTop !== null"
              class="pointer-events-none absolute left-0 right-0 z-20"
              :style="{ top: `${nowTop}px` }"
            >
              <div class="h-0.5 bg-error" />
              <div class="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-error" />
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
    <div v-else class="space-y-3">
      <p
        v-if="!weekMeetings.length"
        class="border border-outline-variant/40 bg-white px-5 py-14 text-center text-sm text-on-surface-variant"
      >
        Không có lịch họp trong tuần này. Bấm “Thêm họp” hoặc kéo trên timeline.
      </p>

      <section
        v-for="day in daysWithMeetings"
        :key="`list-${day.date}`"
        class="border border-outline-variant/40 bg-white"
      >
        <header
          class="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-4 py-2.5"
          :class="day.date === todayIso ? 'is-today-bar' : ''"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-bold text-on-surface">{{ day.label }}</span>
            <span class="text-xs tabular-nums text-on-surface-variant">
              {{ day.dayNum }}/{{ day.monthNum }}
            </span>
          </div>
          <button
            type="button"
            class="text-[11px] font-medium text-primary hover:underline"
            @click="openCreate(day.weekday)"
          >
            + Thêm
          </button>
        </header>

        <ul class="divide-y divide-outline-variant/30">
          <li
            v-for="mtg in day.meetingsSorted"
            :key="mtg.id"
            class="flex cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-surface-container-low/60"
            @click="openEdit(mtg)"
          >
            <div
              class="mt-0.5 w-1 shrink-0 self-stretch rounded-full"
              :style="{ background: MEETING_KIND_META[mtg.kind].border }"
            />
            <div class="w-24 shrink-0">
              <p class="text-[12px] font-bold tabular-nums text-on-surface">
                {{ formatTimeRange(mtg.startMin, mtg.endMin) }}
              </p>
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-on-surface">{{ mtg.title }}</p>
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
            <span
              class="shrink-0 self-start rounded-full px-2 py-0.5 text-[10px] font-medium"
              :style="{
                color: MEETING_KIND_META[mtg.kind].color,
                background: MEETING_KIND_META[mtg.kind].bg
              }"
            >
              {{ MEETING_KIND_META[mtg.kind].label }}
            </span>
          </li>
        </ul>
      </section>
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

        <div class="grid grid-cols-2 gap-3">
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
          <div>
            <label class="mb-1 block text-[11px] font-medium text-outline">Loại</label>
            <Select
              v-model="form.kind"
              :options="MEETING_KIND_OPTIONS"
              optionLabel="label"
              optionValue="value"
              class="w-full"
            />
          </div>
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
              class="border border-outline-variant/50 bg-white px-4 py-2 text-sm text-on-surface-variant hover:bg-surface-container-low"
              @click="formOpen = false"
            >
              Hủy
            </button>
            <button
              type="submit"
              class="bg-primary px-4 py-2 text-sm font-medium text-on-primary disabled:opacity-50"
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
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import {
  DEFAULT_MEETING_OWNER,
  MEETING_KIND_META,
  MEETING_KIND_OPTIONS,
  MEETING_OWNERS,
  formatTimeRange,
  layoutDayMeetings,
  minutesToTimeInput,
  timeInputToMinutes,
  weekdayLabel,
  type Meeting,
  type MeetingKind,
  type WeekNote,
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
const anchorDate = ref(new Date());
const meetings = ref<Meeting[]>([]);
const weekNotes = ref<WeekNote[]>([]);
const loading = ref(false);
const savingId = ref<number | null>(null);
const nowTick = ref(Date.now());
const newNoteText = ref("");
const dragState = ref<DragState | null>(null);
const suppressClickUntil = ref(0);

const formOpen = ref(false);
const formSaving = ref(false);
const form = reactive({
  id: null as number | null,
  title: "",
  weekday: 2 as Weekday,
  kind: "other" as MeetingKind,
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

const weekInfo = computed(() => getWeekInfo(anchorDate.value));
const todayIso = toIsoDate(new Date());
const thisWeekStart = toIsoDate(startOfWeek(new Date()));

const weekMeetings = computed(() =>
  meetings.value.filter((m) => m.weekStart === weekInfo.value.weekStart)
);

const usedKinds = computed(() => {
  const set = new Set<MeetingKind>();
  for (const m of weekMeetings.value) set.add(m.kind);
  return [...set];
});

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
  const meta = MEETING_KIND_META[mtg.kind];

  return {
    top: `${top}px`,
    height: `${height}px`,
    left: `calc(${leftPct}% + ${gap}px)`,
    width: `calc(${widthPct}% - ${gap * 2}px)`,
    background: meta.bg,
    color: meta.color,
    borderLeft: `3px solid ${meta.border}`,
    zIndex: dragState.value?.meetingId === mtg.id ? 40 : mtg.isBlock ? 1 : 2,
    opacity: mtg.isBlock ? 0.72 : 1,
    cursor: "grab"
  };
}

function shiftWeek(dir: number) {
  anchorDate.value = addDays(startOfWeek(anchorDate.value), dir * 7);
}

function goThisWeek() {
  anchorDate.value = new Date();
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
    const data = (await res.json()) as { meetings: Meeting[]; notes: WeekNote[] };
    meetings.value = data.meetings;
    weekNotes.value = data.notes;
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
    kind: MeetingKind;
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
        title: "Họp mới",
        kind: "other"
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
  form.kind = "other";
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
  form.kind = mtg.kind;
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
        kind: form.kind,
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
          kind: form.kind,
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

async function addNote() {
  const text = newNoteText.value.trim();
  if (!text) return;
  try {
    const res = await fetch("/api/meetings/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({
        ownerKey,
        weekStart: weekInfo.value.weekStart,
        text
      })
    });
    if (!res.ok) throw new Error("Không thêm được ghi chú");
    const data = (await res.json()) as { note: WeekNote };
    weekNotes.value = [...weekNotes.value, data.note];
    newNoteText.value = "";
  } catch {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không thêm được ghi chú.",
      life: 2500
    });
  }
}

async function removeNote(note: WeekNote) {
  const prev = weekNotes.value;
  weekNotes.value = weekNotes.value.filter((n) => n.id !== note.id);
  try {
    const res = await fetch(`/api/meetings/notes/${note.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("fail");
  } catch {
    weekNotes.value = prev;
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
  background: color-mix(in srgb, var(--color-primary) 6%, white);
}

.meet-day-head.is-alt,
.meet-day-col.is-alt {
  background: color-mix(in srgb, var(--color-surface-container-low) 55%, white);
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
  padding: 6px 6px 8px;
  border-radius: 4px;
  touch-action: none;
}

.meet-block.is-dragging {
  box-shadow: 0 8px 24px rgba(11, 28, 48, 0.18);
  cursor: grabbing !important;
}

.meet-block--soft {
  border-style: dashed;
  border-width: 1px;
  border-color: color-mix(in srgb, currentColor 25%, transparent);
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
</style>
