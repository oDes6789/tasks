<template>
  <div>
    <!-- Page header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="mb-1 text-headline-lg text-primary">MỤC TIÊU TUẦN</h2>
        <div class="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
          <span>{{ meta.department }} — {{ meta.weekLabel }}</span>
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
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-secondary-container px-4 py-2.5 text-label-md text-primary transition-colors hover:bg-primary-fixed"
          @click="toggleCollapseAll"
        >
          <Icon :name="allCollapsed ? 'unfold_more' : 'unfold_less'" icon-class="text-[18px]" />
          {{ allCollapsed ? "Expand all" : "Collapse all" }}
        </button>
        <span
          class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-label-md text-on-surface ambient-shadow"
        >
          <span class="h-2 w-2 rounded-full bg-[#34a853]" />
          On Track
        </span>
        <span
          class="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-label-md text-on-surface ambient-shadow"
        >
          <span class="h-2 w-2 rounded-full bg-[#f9ab00]" />
          Pending
        </span>
      </div>
    </div>

    <!-- Toolbar -->
    <div
      class="mb-4 flex flex-col gap-3 rounded-md bg-white px-5 py-4 ambient-shadow sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-secondary-container hover:text-primary"
        >
          <Icon name="filter_list" icon-class="text-[18px]" />
          Filter
          <Icon name="expand_more" icon-class="text-[18px] opacity-50" />
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-4 py-2 text-label-md text-on-surface-variant transition-colors hover:bg-secondary-container hover:text-primary"
        >
          <Icon name="sort" icon-class="text-[18px]" />
          Sort by Status
          <Icon name="expand_more" icon-class="text-[18px] opacity-50" />
        </button>
      </div>
      <p class="text-sm italic text-on-surface-variant">{{ meta.deadlineNote }}</p>
    </div>

    <!-- Column labels -->
    <div
      class="mb-3 hidden grid-cols-[minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(200px,1.3fr)_minmax(180px,1.1fr)_120px_minmax(140px,1fr)] gap-4 px-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/70 lg:grid"
    >
      <span v-for="col in columns" :key="col">{{ col }}</span>
    </div>

    <!-- Groups -->
    <div class="flex flex-col gap-4">
      <section
        v-for="group in groups"
        :key="group.id"
        class="overflow-hidden rounded-md bg-white ambient-shadow"
      >
        <!-- Category header: soft blue surface, aligned with site palette -->
        <div
          class="flex items-center gap-3 border-b border-surface-container bg-surface-container-low px-4 py-3 sm:px-5"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left"
            :aria-expanded="!isCollapsed(group.id)"
            @click="toggleGroup(group.id)"
          >
            <span
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-colors hover:bg-primary hover:text-on-primary"
            >
              <Icon
                :name="isCollapsed(group.id) ? 'chevron_right' : 'expand_more'"
                icon-class="text-[20px]"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-[15px] font-semibold text-primary">
                {{ group.title }}
              </span>
              <span class="text-xs text-on-surface-variant">
                {{ group.tasks.length }} mục tiêu
                <span v-if="isCollapsed(group.id)"> · đã thu gọn</span>
              </span>
            </span>
          </button>

          <button
            type="button"
            class="inline-flex shrink-0 items-center gap-1 rounded-full border border-surface-container bg-white px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary hover:bg-primary hover:text-on-primary"
            @click="addRow(group.id)"
          >
            <Icon name="add" icon-class="text-[16px]" />
            Thêm dòng
          </button>
        </div>

        <!-- Tasks -->
        <div v-show="!isCollapsed(group.id)">
          <div
            v-if="group.tasks.length === 0"
            class="flex flex-col items-center gap-3 px-5 py-10 text-center"
          >
            <span
              class="flex h-11 w-11 items-center justify-center rounded-full bg-surface-container-low text-primary"
            >
              <Icon name="playlist_add" icon-class="text-[22px]" />
            </span>
            <p class="text-sm text-on-surface-variant">Chưa có mục tiêu trong nhóm này.</p>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:brightness-110"
              @click="addRow(group.id)"
            >
              <Icon name="add" icon-class="text-[16px]" />
              Thêm dòng đầu tiên
            </button>
          </div>

          <article
            v-for="(task, index) in group.tasks"
            :key="task.id"
            class="grid grid-cols-1 items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-container-low/50 sm:px-5 lg:grid-cols-[minmax(140px,0.9fr)_minmax(180px,1.2fr)_minmax(200px,1.3fr)_minmax(180px,1.1fr)_120px_minmax(140px,1fr)] lg:gap-4"
            :class="[
              index > 0 ? 'border-t border-surface-container' : '',
              task.isNew ? 'bg-primary-fixed/25 new-task-row' : ''
            ]"
            @keydown.enter.exact="onNewRowEnter($event, task)"
          >
            <div data-field="item">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Hạng mục
              </p>
              <InputText
                v-if="task.isNew"
                v-model="task.item"
                class="w-full text-sm font-semibold"
                placeholder="Hạng mục..."
              />
              <p v-else class="text-sm font-semibold text-on-surface">{{ task.item }}</p>
            </div>

            <div data-field="objective">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Mục tiêu
              </p>
              <Textarea
                v-if="task.isNew"
                v-model="task.objective"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="Mục tiêu..."
              />
              <p v-else class="whitespace-pre-line text-sm leading-relaxed text-on-surface">
                {{ task.objective }}
              </p>
            </div>

            <div data-field="dod">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                DOD / Tiêu chuẩn
              </p>
              <Textarea
                v-if="task.isNew"
                v-model="task.dod"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="DOD / tiêu chuẩn..."
              />
              <p v-else class="whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                {{ task.dod }}
              </p>
            </div>

            <div data-field="pics">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                PIC
              </p>
              <div class="flex flex-col items-stretch gap-1.5">
                <MultiSelect
                  v-if="task.isNew"
                  :modelValue="picNames(task)"
                  :options="personnel"
                  optionLabel="name"
                  optionValue="name"
                  display="chip"
                  filter
                  placeholder="Chọn PIC..."
                  emptyFilterMessage="Không tìm thấy"
                  emptyMessage="Không có nhân sự"
                  class="w-full text-sm"
                  :maxSelectedLabels="2"
                  selectedItemsLabel="{0} PIC"
                  @update:modelValue="(names) => setPics(task, names)"
                />
                <template v-else>
                  <PersonTag
                    v-for="pic in task.pics"
                    :key="pic.name"
                    :name="pic.name"
                    :avatar="pic.avatar"
                  />
                </template>
              </div>
            </div>

            <div class="pt-1">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Status
              </p>
              <StatusBadge :status="task.status" :progress="task.progress" />
            </div>

            <div data-field="progress">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Tiến độ
              </p>
              <InputText
                v-if="task.isNew"
                v-model="task.progressNote"
                class="w-full text-sm"
                placeholder="Tiến độ..."
              />
              <p v-else class="text-sm text-on-surface-variant">
                {{ task.progressNote || "—" }}
              </p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Textarea from "primevue/textarea";
import Icon from "@/components/Icon.vue";
import PersonTag from "@/components/PersonTag.vue";
import StatusBadge from "@/components/StatusBadge.vue";
import { authHeaders } from "@/lib/auth";
import { getWeekInfo, parseIsoDate } from "@/lib/week";

interface Pic {
  name: string;
  avatar?: string | null;
}

interface WeeklyTask {
  id: number;
  item: string;
  objective: string;
  dod: string;
  pics: Pic[];
  status: string;
  progress: number | null;
  progressNote: string | null;
  isNew?: boolean;
}

interface TaskGroup {
  id: number;
  title: string;
  tasks: WeeklyTask[];
}

interface BoardMeta {
  department: string;
  weekStart: string;
  weekLabel: string;
  deadlineNote: string;
}

const columns = [
  "Hạng mục",
  "Mục tiêu",
  "DOD / Tiêu chuẩn",
  "PIC",
  "Status",
  "Tiến độ / Thành phẩm"
];

const initialWeek = getWeekInfo();

const meta = ref<BoardMeta>({
  department: "Phòng Tổ Chức Giáo Viên",
  weekStart: initialWeek.weekStart,
  weekLabel: initialWeek.weekLabel,
  deadlineNote: "Deadline: 12h thứ 6 hàng tuần"
});

const groups = ref<TaskGroup[]>([]);
const personnel = ref<Pic[]>([]);
const collapsed = ref(new Set<number>());
const selectedWeekStart = ref(initialWeek.weekStart);
const weekRange = ref<Date[] | null>([initialWeek.start, initialWeek.end]);
let nextTaskId = 1000;

const defaultPersonnel: Pic[] = [
  { name: "Ms. Kim Bắc", avatar: null },
  { name: "Mr. Tiến Dũng", avatar: null },
  { name: "Ms. Thu Hà", avatar: null },
  { name: "Mr. Minh Quân", avatar: null },
  { name: "Ms. Lan Anh", avatar: null }
];

const allCollapsed = computed(() => {
  if (groups.value.length === 0) return false;
  return groups.value.every((g) => collapsed.value.has(g.id));
});

function isCollapsed(groupId: number) {
  return collapsed.value.has(groupId);
}

function toggleGroup(groupId: number) {
  const next = new Set(collapsed.value);
  if (next.has(groupId)) next.delete(groupId);
  else next.add(groupId);
  collapsed.value = next;
}

function toggleCollapseAll() {
  if (allCollapsed.value) {
    collapsed.value = new Set();
  } else {
    collapsed.value = new Set(groups.value.map((g) => g.id));
  }
}

const NEW_ROW_FIELDS = ["item", "objective", "dod", "pics", "progress"] as const;

function picNames(task: WeeklyTask) {
  return task.pics.map((p) => p.name);
}

function onNewRowEnter(event: KeyboardEvent, task: WeeklyTask) {
  if (!task.isNew) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;
  // Đang mở dropdown PIC / đang gõ filter → để MultiSelect xử lý
  if (target.closest(".p-multiselect-overlay, .p-multiselect-list, .p-overlay")) return;

  const fieldEl = target.closest<HTMLElement>("[data-field]");
  const field = fieldEl?.dataset.field;
  if (!field) return;

  const idx = NEW_ROW_FIELDS.indexOf(field as (typeof NEW_ROW_FIELDS)[number]);
  if (idx < 0 || idx >= NEW_ROW_FIELDS.length - 1) return;

  event.preventDefault();
  const row = event.currentTarget as HTMLElement;
  focusNewRowField(row, NEW_ROW_FIELDS[idx + 1]);
}

function focusNewRowField(row: HTMLElement, field: string) {
  const wrap = row.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!wrap) return;

  if (field === "pics") {
    const trigger = wrap.querySelector<HTMLElement>(".p-multiselect");
    trigger?.focus();
    trigger?.click();
    return;
  }

  const input = wrap.querySelector<HTMLElement>("input, textarea");
  input?.focus();
}

function setPics(task: WeeklyTask, names: string[] | null | undefined) {
  const selected = names ?? [];
  task.pics = selected.map((name) => {
    const person = personnel.value.find((p) => p.name === name);
    return person ? { ...person } : { name, avatar: null };
  });
}

function addRow(groupId: number) {
  const group = groups.value.find((g) => g.id === groupId);
  if (!group) return;

  if (collapsed.value.has(groupId)) {
    const next = new Set(collapsed.value);
    next.delete(groupId);
    collapsed.value = next;
  }

  group.tasks.push({
    id: nextTaskId++,
    item: "",
    objective: "",
    dod: "",
    pics: [],
    status: "pending",
    progress: null,
    progressNote: "",
    isNew: true
  });
}

function syncWeekRange(weekStart: string) {
  const week = getWeekInfo(parseIsoDate(weekStart) ?? new Date());
  weekRange.value = [week.start, week.end];
  selectedWeekStart.value = week.weekStart;
  meta.value = {
    ...meta.value,
    weekStart: week.weekStart,
    weekLabel: week.weekLabel
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

  if (week.weekStart === selectedWeekStart.value) {
    meta.value = { ...meta.value, weekStart: week.weekStart, weekLabel: week.weekLabel };
    return;
  }

  selectedWeekStart.value = week.weekStart;
  void loadBoard(week.weekStart);
}

async function loadBoard(weekStart: string) {
  try {
    const res = await fetch(`/api/tasks?week=${encodeURIComponent(weekStart)}`, {
      headers: { ...authHeaders() }
    });
    if (!res.ok) {
      personnel.value = defaultPersonnel;
      syncWeekRange(weekStart);
      return;
    }
    const data = await res.json();
    if (data.meta) {
      meta.value = {
        department: data.meta.department ?? meta.value.department,
        weekStart: data.meta.weekStart ?? weekStart,
        weekLabel: data.meta.weekLabel ?? meta.value.weekLabel,
        deadlineNote: data.meta.deadlineNote ?? meta.value.deadlineNote
      };
      syncWeekRange(meta.value.weekStart);
    }
    personnel.value =
      Array.isArray(data.personnel) && data.personnel.length > 0
        ? data.personnel
        : defaultPersonnel;
    groups.value = data.groups ?? [];
    collapsed.value = new Set();
    const maxId = groups.value
      .flatMap((g) => g.tasks)
      .reduce((max, t) => Math.max(max, t.id), 0);
    nextTaskId = maxId + 1;
  } catch {
    personnel.value = defaultPersonnel;
  }
}

onMounted(() => {
  void loadBoard(selectedWeekStart.value);
});
</script>

<style scoped>
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
  border-radius: 9999px;
  background: #fff;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.04), 0 1px 3px rgb(0 0 0 / 0.06);
  padding-inline: 0.5rem;
  transition: background-color 0.15s ease;
}

.week-datepicker :deep(.p-datepicker:hover),
.week-datepicker :deep(.p-inputwrapper:hover) {
  background: var(--color-secondary-container);
}

.week-datepicker :deep(.p-datepicker-input-icon-container),
.week-datepicker :deep(.p-datepicker-dropdown) {
  color: var(--color-primary);
}

.new-task-row :deep(.p-inputtext),
.new-task-row :deep(.p-textarea),
.new-task-row :deep(.p-multiselect) {
  width: 100%;
  border-radius: 6px;
  border: 1px solid var(--color-surface-container-high);
  background: #fff;
  box-shadow: none;
  font-size: 0.875rem;
  color: var(--color-on-surface);
  transition: border-color 0.15s ease;
}

.new-task-row :deep(.p-inputtext),
.new-task-row :deep(.p-multiselect) {
  min-height: 2.75rem;
  height: 2.75rem;
}

.new-task-row :deep(.p-textarea) {
  min-height: 5.25rem;
  height: 5.25rem;
  resize: vertical;
  line-height: 1.5;
}

.new-task-row :deep(.p-inputtext:enabled:hover),
.new-task-row :deep(.p-textarea:enabled:hover),
.new-task-row :deep(.p-multiselect:not(.p-disabled):hover) {
  border-color: var(--color-outline-variant);
}

.new-task-row :deep(.p-inputtext:enabled:focus),
.new-task-row :deep(.p-textarea:enabled:focus),
.new-task-row :deep(.p-multiselect:not(.p-disabled).p-focus) {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 16%, transparent);
}

.new-task-row :deep(.p-multiselect-label) {
  display: flex;
  align-items: center;
  padding-block: 0.5rem;
  font-size: 0.875rem;
}

.new-task-row :deep(.p-multiselect-dropdown) {
  width: 2.25rem;
}

.new-task-row :deep(.p-chip),
.new-task-row :deep(.p-multiselect-chip) {
  border-radius: 4px;
  font-size: 0.75rem;
}
</style>
