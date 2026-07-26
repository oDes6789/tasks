<template>
  <div>
    <!-- Page header -->
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="mb-1 text-headline-lg text-primary">MỤC TIÊU TUẦN</h2>
        <div class="flex flex-wrap items-center gap-2 text-body-md text-on-surface-variant">
          <span>{{ meta.weekLabel }}</span>
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
          class="inline-flex flex-wrap items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_1px_3px_rgb(0_0_0/0.06)]"
        >
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#34a853]" />
            On Track
          </span>
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#f9ab00]" />
            Pending
          </span>
          <span class="inline-flex items-center gap-1.5 px-1 text-xs font-semibold text-on-surface-variant">
            <span class="size-2 rounded-full bg-[#1e8e3e]" />
            Done
          </span>
        </span>
      </div>
    </div>

    <!-- Toolbar -->
    <div
      class="mb-4 flex flex-col gap-3 rounded-md bg-white px-5 py-4 ambient-shadow sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <label
          class="flex min-w-[14rem] max-w-md flex-1 items-center gap-2 rounded-full bg-surface-container-low px-3.5 py-2 transition-all focus-within:ring-2 focus-within:ring-primary/20"
        >
          <Icon name="search" icon-class="shrink-0 text-[18px] text-outline" />
          <input
            v-model="searchQuery"
            type="search"
            class="w-full min-w-0 border-none bg-transparent text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-0"
            placeholder="Tìm hạng mục, mục tiêu, PIC, status..."
            aria-label="Tìm kiếm mục tiêu"
          />
          <button
            v-if="searchQuery.trim()"
            type="button"
            class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            title="Xóa tìm kiếm"
            aria-label="Xóa tìm kiếm"
            @click="searchQuery = ''"
          >
            <Icon name="close" icon-class="text-[16px]" />
          </button>
        </label>
        <p
          v-if="searchQuery.trim()"
          class="text-xs text-on-surface-variant"
        >
          {{ filteredMatchCount }} kết quả
        </p>
      </div>
      <p
        class="deadline-badge inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium not-italic"
        :class="`deadline-${deadlineUrgency}`"
        :title="deadlineHint"
      >
        <Icon
          :name="deadlineUrgency === 'ok' ? 'schedule' : 'warning'"
          icon-class="text-[18px]"
        />
        <span>{{ meta.deadlineNote }}</span>
      </p>
    </div>

    <!-- Column labels -->
    <div
      class="board-col-headers sticky top-16 z-30 mb-3 hidden grid-cols-[minmax(120px,0.85fr)_minmax(160px,1.15fr)_minmax(180px,1.25fr)_minmax(150px,1fr)_minmax(128px,0.7fr)_minmax(120px,0.9fr)_minmax(110px,0.65fr)_88px] items-center gap-4 rounded-md bg-secondary-container px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/70 lg:grid"
    >
      <span v-for="col in columns" :key="col">{{ col }}</span>
    </div>

    <!-- Groups -->
    <div class="flex flex-col gap-4">
      <p
        v-if="searchQuery.trim() && visibleGroups.length === 0"
        class="rounded-md bg-white px-5 py-10 text-center text-sm text-on-surface-variant ambient-shadow"
      >
        Không tìm thấy mục tiêu khớp “{{ searchQuery.trim() }}”.
      </p>
      <section
        v-for="group in visibleGroups"
        :key="group.id"
        class="rounded-md bg-white ambient-shadow"
      >
        <!-- Category header -->
        <div
          class="category-header sticky top-17 z-20 flex items-center gap-3 rounded-t-md border-b px-4 py-3 sm:px-5 lg:top-[calc(4rem+2.75rem)]"
          :style="categoryStyle(group.id)"
        >
          <button
            type="button"
            class="flex min-w-0 flex-1 items-center gap-3 text-left"
            :aria-expanded="!isCollapsed(group.id)"
            @click="toggleGroup(group.id)"
          >
            <span
              class="category-chevron flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition-colors"
            >
              <Icon
                :name="isCollapsed(group.id) ? 'chevron_right' : 'expand_more'"
                icon-class="text-[20px]"
              />
            </span>
            <span class="min-w-0 flex-1">
              <span class="category-title block truncate text-[15px] font-semibold">
                {{ group.title }}
              </span>
              <span class="category-meta text-xs">
                {{ filteredTaskCount(group) }} mục tiêu
                <span v-if="searchQuery.trim() && filteredTaskCount(group) !== group.tasks.length">
                  / {{ group.tasks.length }}
                </span>
                <span v-if="isCollapsed(group.id)"> · đã thu gọn</span>
              </span>
            </span>
          </button>

          <button
            type="button"
            class="category-add inline-flex shrink-0 items-center gap-1 rounded-full border bg-white px-3.5 py-2 text-xs font-semibold transition-colors"
            @click="addRow(group.id)"
          >
            <Icon name="add" icon-class="text-[16px]" />
            Thêm dòng
          </button>
        </div>

        <!-- Tasks -->
        <div v-show="!isCollapsed(group.id)">
          <article
            v-for="(task, index) in visibleRows(group)"
            :key="task.isDraft ? `draft-${group.id}` : task.id"
            class="grid grid-cols-1 items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-container-low/50 sm:px-5 lg:grid-cols-[minmax(120px,0.85fr)_minmax(160px,1.15fr)_minmax(180px,1.25fr)_minmax(150px,1fr)_minmax(128px,0.7fr)_minmax(120px,0.9fr)_minmax(110px,0.65fr)_88px] lg:gap-4"
            :class="[
              index > 0 ? 'border-t border-surface-container' : '',
              task.isDraft || isRowEditing(task) ? 'bg-primary-fixed/25 new-task-row' : ''
            ]"
            :data-draft-group="task.isDraft ? group.id : undefined"
            :data-task-id="task.isDraft ? undefined : task.id"
            @keydown.enter.exact="onEditRowEnter($event, task, group.id)"
            @keydown.escape.exact="onEditEscape(task)"
          >
            <div
              data-field="item"
              class="group relative rounded-md pr-7"
              :class="!task.isDraft && !isFieldEditing(task, 'item') ? 'cursor-text' : ''"
              @dblclick="startFieldEdit(task, 'item')"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Hạng mục
              </p>
              <InputText
                v-if="isFieldEditing(task, 'item')"
                v-model="task.item"
                class="w-full text-sm font-semibold"
                placeholder="Hạng mục..."
                @blur="finishFieldEdit(task, 'item')"
              />
              <template v-else>
                <p class="text-sm font-semibold text-on-surface">
                  {{ task.item || "ㅤ" }}
                </p>
                <p
                  v-if="task.createdBy"
                  class="mt-1 text-[10px] text-outline"
                  :title="`Người tạo: ${task.createdBy}`"
                >
                  Tạo bởi {{ task.createdBy }}
                </p>
                <button
                  v-if="!task.isDraft"
                  type="button"
                  class="field-edit-btn"
                  title="Sửa"
                  aria-label="Sửa hạng mục"
                  @click.stop="startFieldEdit(task, 'item')"
                >
                  <Icon name="edit" icon-class="text-[14px]" />
                </button>
              </template>
            </div>

            <div
              data-field="objective"
              class="group relative rounded-md pr-7"
              :class="!task.isDraft && !isFieldEditing(task, 'objective') ? 'cursor-text' : ''"
              @dblclick="startFieldEdit(task, 'objective')"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Mục tiêu
              </p>
              <Textarea
                v-if="isFieldEditing(task, 'objective')"
                v-model="task.objective"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="Mục tiêu..."
                @blur="finishFieldEdit(task, 'objective')"
              />
              <template v-else>
                <p class="whitespace-pre-line text-sm leading-relaxed text-on-surface">
                  {{ task.objective || "ㅤ" }}
                </p>
                <button
                  v-if="!task.isDraft"
                  type="button"
                  class="field-edit-btn"
                  title="Sửa"
                  aria-label="Sửa mục tiêu"
                  @click.stop="startFieldEdit(task, 'objective')"
                >
                  <Icon name="edit" icon-class="text-[14px]" />
                </button>
              </template>
            </div>

            <div
              data-field="dod"
              class="group relative rounded-md pr-7"
              :class="!task.isDraft && !isFieldEditing(task, 'dod') ? 'cursor-text' : ''"
              @dblclick="startFieldEdit(task, 'dod')"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                DOD / Tiêu chuẩn
              </p>
              <Textarea
                v-if="isFieldEditing(task, 'dod')"
                v-model="task.dod"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="DOD / tiêu chuẩn..."
                @blur="finishFieldEdit(task, 'dod')"
              />
              <template v-else>
                <p class="whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                  {{ task.dod || "ㅤ" }}
                </p>
                <button
                  v-if="!task.isDraft"
                  type="button"
                  class="field-edit-btn"
                  title="Sửa"
                  aria-label="Sửa DOD"
                  @click.stop="startFieldEdit(task, 'dod')"
                >
                  <Icon name="edit" icon-class="text-[14px]" />
                </button>
              </template>
            </div>

            <div
              data-field="pics"
              class="group relative rounded-md pr-7"
              :class="!task.isDraft && !isFieldEditing(task, 'pics') ? 'cursor-pointer' : ''"
              @dblclick="startFieldEdit(task, 'pics')"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                PIC
              </p>
              <div class="flex flex-wrap items-center gap-1.5">
                <MultiSelect
                  v-if="isFieldEditing(task, 'pics')"
                  :modelValue="picNames(task)"
                  :options="picOptionsFor(task)"
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
                  @hide="finishFieldEdit(task, 'pics')"
                />
                <template v-else>
                  <Chip
                    v-for="pic in task.pics"
                    :key="pic.name"
                    :label="pic.name"
                    class="pic-chip"
                  >
                    <template #icon>
                      <img
                        v-if="pic.avatar"
                        :src="pic.avatar"
                        :alt="pic.name"
                        class="mr-1 h-5 w-5 rounded-full object-cover"
                      />
                      <span
                        v-else
                        class="mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary"
                      >
                        {{ picInitials(pic.name) }}
                      </span>
                    </template>
                  </Chip>
                  <span v-if="task.pics.length === 0" class="text-sm text-on-surface-variant">ㅤ</span>
                  <button
                    v-if="!task.isDraft"
                    type="button"
                    class="field-edit-btn"
                    title="Sửa"
                    aria-label="Sửa PIC"
                    @click.stop="startFieldEdit(task, 'pics')"
                  >
                    <Icon name="edit" icon-class="text-[14px]" />
                  </button>
                </template>
              </div>
            </div>

            <div data-field="status" class="pt-0.5">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Status
              </p>
              <StatusSelect
                :modelValue="task.status"
                :disabled="savingIds.has(task.id)"
                @update:modelValue="(value) => onStatusChange(task, value)"
              />
            </div>

            <div
              data-field="progress"
              class="group relative min-w-0 rounded-md pr-7"
              :class="!task.isDraft && !isFieldEditing(task, 'progress') ? 'cursor-text' : ''"
              @dblclick="startFieldEdit(task, 'progress')"
            >
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Tiến độ
              </p>
              <Textarea
                v-if="isFieldEditing(task, 'progress')"
                v-model="task.progressNote"
                rows="3"
                class="w-full min-w-0 text-sm leading-relaxed"
                placeholder="Tiến độ / link thành phẩm..."
                @blur="finishFieldEdit(task, 'progress')"
              />
              <template v-else>
                <div class="min-w-0 text-sm leading-relaxed text-on-surface-variant">
                  <template v-if="!task.progressNote?.trim()">ㅤ</template>
                  <a
                    v-else-if="isSingleUrl(task.progressNote)"
                    :href="normalizeHref(task.progressNote)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="progress-link"
                    :title="task.progressNote.trim()"
                    @click.stop
                    @dblclick.prevent.stop
                  >
                    <Icon name="link" icon-class="shrink-0 text-[16px]" />
                    <span class="truncate">{{ linkLabel(task.progressNote) }}</span>
                    <Icon name="open_in_new" icon-class="shrink-0 text-[14px] opacity-70" />
                  </a>
                  <p
                    v-else
                    class="whitespace-pre-line break-words [overflow-wrap:anywhere] line-clamp-4"
                    :title="task.progressNote"
                  >
                    <template
                      v-for="(part, i) in progressNoteParts(task.progressNote)"
                      :key="`${task.id}-p-${i}`"
                    >
                      <a
                        v-if="part.href"
                        :href="part.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="progress-link-inline"
                        :title="part.text"
                        @click.stop
                        @dblclick.prevent.stop
                      >{{ part.label }}</a>
                      <template v-else>{{ part.text }}</template>
                    </template>
                  </p>
                </div>
                <button
                  v-if="!task.isDraft"
                  type="button"
                  class="field-edit-btn"
                  title="Sửa"
                  aria-label="Sửa tiến độ"
                  @click.stop="startFieldEdit(task, 'progress')"
                >
                  <Icon name="edit" icon-class="text-[14px]" />
                </button>
              </template>
            </div>

            <div data-field="kpi" class="pt-0.5">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                KPIs
              </p>
              <KpiSelect
                :modelValue="task.kpi"
                :disabled="savingIds.has(task.id)"
                @update:modelValue="(value) => onKpiChange(task, value)"
              />
            </div>

            <div class="flex items-start justify-end gap-1 pt-0.5 lg:justify-start">
              <button
                v-if="task.isDraft"
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
                :disabled="savingIds.has(task.id)"
                title="Lưu"
                aria-label="Lưu"
                @click="saveTask(task, group.id)"
              >
                <Icon name="check" icon-class="text-[18px]" />
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-error transition-colors hover:bg-error-container/50 disabled:opacity-50"
                :disabled="savingIds.has(task.id) || deletingIds.has(task.id)"
                :title="task.isDraft ? 'Xóa nội dung' : 'Xóa'"
                :aria-label="task.isDraft ? 'Xóa nội dung' : 'Xóa'"
                @click="deleteTask(group.id, task)"
              >
                <Icon name="delete" icon-class="text-[18px]" />
              </button>
            </div>
          </article>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import Chip from "primevue/chip";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import KpiSelect from "@/components/KpiSelect.vue";
import StatusSelect from "@/components/StatusSelect.vue";
import { authHeaders } from "@/lib/auth";
import {
  ensureProgressDeadlinePermission,
  maybeNotifyProgressDeadline
} from "@/lib/progressDeadlineNotify";
import {
  formatDeadlineNote,
  getDeadlineAt,
  getDeadlineUrgency,
  getWeekInfo,
  parseIsoDate,
  type DeadlineUrgency
} from "@/lib/week";

interface Pic {
  name: string;
  avatar?: string | null;
}

type EditField = "item" | "objective" | "dod" | "pics" | "status" | "progress" | "kpi";

interface WeeklyTask {
  id: number;
  item: string;
  objective: string;
  dod: string;
  pics: Pic[];
  status: string;
  kpi: string;
  progress: number | null;
  progressNote: string | null;
  createdBy?: string;
  isDraft?: boolean;
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
  "Tiến độ / Thành phẩm",
  "KPIs",
  ""
];

const toast = useToast();
const confirm = useConfirm();
const initialWeek = getWeekInfo();

const meta = ref<BoardMeta>({
  department: "",
  weekStart: initialWeek.weekStart,
  weekLabel: initialWeek.weekLabel,
  deadlineNote: formatDeadlineNote(initialWeek.start)
});

const nowTick = ref(Date.now());
let deadlineTimer: ReturnType<typeof setInterval> | null = null;

const deadlineAt = computed(() => {
  const monday = parseIsoDate(meta.value.weekStart) ?? initialWeek.start;
  return getDeadlineAt(monday);
});

const deadlineUrgency = computed<DeadlineUrgency>(() =>
  getDeadlineUrgency(deadlineAt.value, new Date(nowTick.value))
);

const deadlineHint = computed(() => {
  const ms = deadlineAt.value.getTime() - nowTick.value;
  if (ms < 0) {
    const hoursLate = Math.ceil(-ms / (1000 * 60 * 60));
    return hoursLate <= 24
      ? `Đã quá hạn nhập thành phẩm ${hoursLate} giờ`
      : `Đã quá hạn nhập thành phẩm ${Math.ceil(hoursLate / 24)} ngày`;
  }
  const hours = ms / (1000 * 60 * 60);
  if (hours <= 1) return `Còn khoảng ${Math.max(1, Math.ceil(hours * 60))} phút nhập thành phẩm — gấp!`;
  if (hours <= 3) return `Còn khoảng ${Math.ceil(hours)} giờ nhập thành phẩm — gấp!`;
  if (hours <= 24) return `Còn khoảng ${Math.ceil(hours)} giờ đến hạn nhập thành phẩm`;
  if (hours <= 48) return `Sắp đến hạn nhập thành phẩm — còn khoảng ${Math.ceil(hours)} giờ`;
  return `Hạn nhập thành phẩm: 12h thứ Sáu`;
});

function hasPendingTaskProgress(): boolean {
  return groups.value.some((g) =>
    g.tasks.some((t) => !t.isDraft && !(t.progressNote ?? "").trim() && t.status !== "done")
  );
}

function runProgressDeadlineNotify() {
  const monday = parseIsoDate(meta.value.weekStart);
  if (!monday) return;
  const currentWeek = getWeekInfo();
  if (meta.value.weekStart !== currentWeek.weekStart) return;

  maybeNotifyProgressDeadline({
    weekStart: meta.value.weekStart,
    monday,
    now: new Date(nowTick.value),
    shouldNotify: hasPendingTaskProgress(),
    onToast: ({ summary, detail, severity }) => {
      toast.add({ severity, summary, detail, life: 9000 });
    }
  });
}

const groups = ref<TaskGroup[]>([]);
const personnel = ref<Pic[]>([]);
const collapsed = ref(new Set<number>());
const selectedWeekStart = ref(initialWeek.weekStart);
const weekRange = ref<Date[] | null>([initialWeek.start, initialWeek.end]);
const savingIds = ref(new Set<number>());
const deletingIds = ref(new Set<number>());
const editingCell = ref<{ taskId: number; field: EditField } | null>(null);
const baselines = new Map<number, string>();
const autoSaveTimers = new Map<number, ReturnType<typeof setTimeout>>();
let nextTaskId = 1000;
const AUTO_SAVE_DELAY_MS = 400;

/** Màu từng category — đổi hex tại đây để chỉnh màu. */
const CATEGORY_COLORS: Record<number, { accent: string; soft: string }> = {
  1: { accent: "#1a73e8", soft: "#e8f0fe" }, // TUYỂN DỤNG
  2: { accent: "#188038", soft: "#e6f4ea" }, // ĐÀO TẠO
  3: { accent: "#e37400", soft: "#fef7e0" }, // VẬN HÀNH
  4: { accent: "#d93025", soft: "#fce8e6" }, // TRIỂN KHAI MỚI
  5: { accent: "#0d652d", soft: "#ceead6" }, // OKR
  6: { accent: "#b06000", soft: "#fef0d5" }, // VẤN ĐỀ TỒN ĐỌNG
  7: { accent: "#0b57d0", soft: "#d3e3fd" }, // ĐỀ XUẤT
  8: { accent: "#5f6368", soft: "#f1f3f4" } // NOTE
};

const DEFAULT_CATEGORY_COLOR = { accent: "#4648d4", soft: "#eff4ff" };

function categoryStyle(groupId: number) {
  const tone = CATEGORY_COLORS[groupId] ?? DEFAULT_CATEGORY_COLOR;
  return {
    "--cat-accent": tone.accent,
    "--cat-soft": tone.soft
  };
}

const DEFAULT_GROUPS: TaskGroup[] = [
  { id: 1, title: "1. TUYỂN DỤNG", tasks: [] },
  { id: 2, title: "2. ĐÀO TẠO", tasks: [] },
  { id: 3, title: "3. VẬN HÀNH", tasks: [] },
  { id: 4, title: "4. TRIỂN KHAI MỚI", tasks: [] },
  { id: 5, title: "5. OKR", tasks: [] },
  { id: 6, title: "6. VẤN ĐỀ TỒN ĐỌNG", tasks: [] },
  { id: 7, title: "7. ĐỀ XUẤT", tasks: [] },
  { id: 8, title: "8. NOTE", tasks: [] }
];

function createEmptyDraft(groupId: number): WeeklyTask {
  return {
    id: -groupId,
    item: "",
    objective: "",
    dod: "",
    pics: [],
    status: "pending",
    kpi: "",
    progress: null,
    progressNote: "",
    createdBy: "",
    isDraft: true
  };
}

function snapshotKey(task: WeeklyTask) {
  return JSON.stringify({
    item: task.item ?? "",
    objective: task.objective ?? "",
    dod: task.dod ?? "",
    pics: (task.pics ?? []).map((p) => p.name),
    status: task.status ?? "pending",
    kpi: task.kpi ?? "",
    progress: task.progress,
    progressNote: task.progressNote ?? ""
  });
}

function markClean(task: WeeklyTask) {
  if (task.isDraft) return;
  baselines.set(task.id, snapshotKey(task));
}

function isDirty(task: WeeklyTask) {
  if (task.isDraft) return false;
  return baselines.get(task.id) !== snapshotKey(task);
}

function clearAutoSaveTimer(taskId: number) {
  const timer = autoSaveTimers.get(taskId);
  if (timer) {
    clearTimeout(timer);
    autoSaveTimers.delete(taskId);
  }
}

const drafts = ref<Record<number, WeeklyTask>>(
  Object.fromEntries(DEFAULT_GROUPS.map((g) => [g.id, createEmptyDraft(g.id)]))
);
const searchQuery = ref("");

const STATUS_SEARCH_LABELS: Record<string, string> = {
  pending: "pending",
  in_progress: "on track in_progress",
  done: "done hoàn thành"
};

const KPI_SEARCH_LABELS: Record<string, string> = {
  achieved: "đạt achieved",
  not_achieved: "chưa đạt not_achieved",
  delayed: "delayed trễ"
};

function resetDraft(groupId: number) {
  drafts.value[groupId] = createEmptyDraft(groupId);
}

function taskSearchHaystack(task: WeeklyTask): string {
  return [
    task.item,
    task.objective,
    task.dod,
    task.progressNote,
    ...(task.pics ?? []).map((p) => p.name),
    STATUS_SEARCH_LABELS[task.status] ?? task.status,
    KPI_SEARCH_LABELS[task.kpi ?? ""] ?? task.kpi
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesSearch(task: WeeklyTask, query: string): boolean {
  if (!query) return true;
  return taskSearchHaystack(task).includes(query);
}

function filteredTasks(group: TaskGroup): WeeklyTask[] {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return group.tasks;
  if (group.title.toLowerCase().includes(q)) return group.tasks;
  return group.tasks.filter((t) => matchesSearch(t, q));
}

function filteredTaskCount(group: TaskGroup): number {
  return filteredTasks(group).length;
}

function visibleRows(group: TaskGroup): WeeklyTask[] {
  return [...filteredTasks(group), drafts.value[group.id]];
}

const visibleGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return groups.value;
  return groups.value.filter(
    (g) => filteredTasks(g).length > 0 || g.title.toLowerCase().includes(q)
  );
});

const filteredMatchCount = computed(() =>
  groups.value.reduce((sum, g) => sum + filteredTaskCount(g), 0)
);

const defaultPersonnel: Pic[] = [];

function isBlankDraft(
  task: Pick<WeeklyTask, "item" | "objective" | "dod" | "progressNote" | "pics">
) {
  return (
    !task.item?.trim() &&
    !task.objective?.trim() &&
    !task.dod?.trim() &&
    !task.progressNote?.trim() &&
    (!task.pics || task.pics.length === 0)
  );
}

function hydrateTask(task: WeeklyTask): WeeklyTask {
  const hydrated: WeeklyTask = {
    ...task,
    kpi: task.kpi ?? "",
    progressNote: task.progressNote ?? "",
    createdBy: task.createdBy ?? "",
    isDraft: false
  };
  markClean(hydrated);
  return hydrated;
}

function mergeFixedGroups(incoming: TaskGroup[] | null | undefined): TaskGroup[] {
  const byId = new Map((incoming ?? []).map((g) => [g.id, g]));
  return DEFAULT_GROUPS.map((def) => {
    const found = byId.get(def.id);
    return {
      id: def.id,
      title: found?.title || def.title,
      tasks: (found?.tasks ?? []).map((t) => hydrateTask(t))
    };
  });
}

const allCollapsed = computed(() => {
  if (groups.value.length === 0) return false;
  return groups.value.every((g) => collapsed.value.has(g.id));
});

function isCollapsed(groupId: number) {
  if (searchQuery.value.trim()) return false;
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

const EDIT_ROW_FIELDS = ["item", "objective", "dod", "pics", "status", "progress", "kpi"] as const;

function isFieldEditing(task: WeeklyTask, field: EditField) {
  if (task.isDraft) return true;
  return editingCell.value?.taskId === task.id && editingCell.value?.field === field;
}

function isRowEditing(task: WeeklyTask) {
  if (task.isDraft) return true;
  return editingCell.value?.taskId === task.id;
}

function picNames(task: WeeklyTask) {
  return task.pics.map((p) => p.name);
}

/** Keep already-selected PIC names in the dropdown even if they haven't logged in. */
function picOptionsFor(task: WeeklyTask): Pic[] {
  const byName = new Map(personnel.value.map((p) => [p.name, p]));
  for (const pic of task.pics) {
    if (!byName.has(pic.name)) byName.set(pic.name, pic);
  }
  return Array.from(byName.values());
}

function picInitials(name: string) {
  const parts = name.replace(/^(Ms\.|Mr\.)\s*/i, "").split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"'）】\]]+/gi;

function isSingleUrl(text: string | null | undefined): boolean {
  if (!text) return false;
  return /^https?:\/\/\S+$/i.test(text.trim());
}

function normalizeHref(text: string): string {
  return text.trim().replace(/[.,;:!?)]+$/, "");
}

function linkLabel(url: string): string {
  try {
    const u = new URL(normalizeHref(url));
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname.toLowerCase();
    if (host.includes("docs.google.com") && path.includes("/spreadsheets")) return "Google Sheets";
    if (host.includes("docs.google.com") && path.includes("/document")) return "Google Docs";
    if (host.includes("docs.google.com") && path.includes("/presentation")) return "Google Slides";
    if (host.includes("drive.google.com")) return "Google Drive";
    if (host.includes("notion.so") || host.includes("notion.site")) return "Notion";
    if (host.includes("figma.com")) return "Figma";
    if (host.includes("github.com")) return "GitHub";
    return host;
  } catch {
    const t = url.trim();
    return t.length > 36 ? `${t.slice(0, 33)}…` : t;
  }
}

function progressNoteParts(text: string): Array<{ text: string; href?: string; label?: string }> {
  const parts: Array<{ text: string; href?: string; label?: string }> = [];
  let last = 0;
  const re = new RegExp(URL_IN_TEXT_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }
    const raw = match[0];
    const href = normalizeHref(raw);
    parts.push({ text: raw, href, label: linkLabel(raw) });
    last = match.index + raw.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

async function startFieldEdit(task: WeeklyTask, field: EditField) {
  if (task.isDraft) return;
  if (isFieldEditing(task, field)) return;

  if (editingCell.value) {
    const prev =
      editingCell.value.taskId === task.id
        ? task
        : findTaskById(editingCell.value.taskId);
    if (prev) await finishFieldEdit(prev, editingCell.value.field);
  }

  editingCell.value = { taskId: task.id, field };
  await nextTick();
  const row = document.querySelector<HTMLElement>(`article[data-task-id="${task.id}"]`);
  if (row) focusEditRowField(row, field);
}

async function finishFieldEdit(task: WeeklyTask, field: EditField) {
  if (task.isDraft) return;
  if (!isFieldEditing(task, field)) return;

  editingCell.value = null;
  await persistTask(task, { quiet: true });
}

function onEditEscape(task: WeeklyTask) {
  if (task.isDraft || !editingCell.value || editingCell.value.taskId !== task.id) return;
  restoreFromBaseline(task);
  editingCell.value = null;
}

function findTaskById(taskId: number): WeeklyTask | undefined {
  for (const group of groups.value) {
    const found = group.tasks.find((t) => t.id === taskId);
    if (found) return found;
  }
  return undefined;
}

function restoreFromBaseline(task: WeeklyTask) {
  const raw = baselines.get(task.id);
  if (!raw) return;
  try {
    const data = JSON.parse(raw) as {
      item: string;
      objective: string;
      dod: string;
      pics: string[];
      status: string;
      kpi: string;
      progress: number | null;
      progressNote: string;
    };
    task.item = data.item;
    task.objective = data.objective;
    task.dod = data.dod;
    task.status = data.status;
    task.kpi = data.kpi ?? "";
    task.progress = data.progress;
    task.progressNote = data.progressNote;
    task.pics = data.pics.map((name) => {
      const person = personnel.value.find((p) => p.name === name);
      return person ? { ...person } : { name, avatar: null };
    });
  } catch {
    // ignore invalid baseline
  }
}

function onEditRowEnter(event: KeyboardEvent, task: WeeklyTask, groupId: number) {
  if (!task.isDraft && !isRowEditing(task)) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (
    target.closest(
      ".p-multiselect-overlay, .p-multiselect-list, .p-overlay, .p-select-overlay, .p-select-list"
    )
  ) {
    return;
  }

  // Textarea: Enter = newline; only draft row advances fields on Enter from inputs.
  if (target.tagName === "TEXTAREA") return;

  const fieldEl = target.closest<HTMLElement>("[data-field]");
  const field = fieldEl?.dataset.field as EditField | undefined;
  if (!field) return;

  if (!task.isDraft) {
    event.preventDefault();
    void finishFieldEdit(task, field);
    return;
  }

  const idx = EDIT_ROW_FIELDS.indexOf(field);
  if (idx < 0) return;

  if (idx >= EDIT_ROW_FIELDS.length - 1) {
    event.preventDefault();
    void saveTask(task, groupId);
    return;
  }

  event.preventDefault();
  const row = event.currentTarget as HTMLElement;
  focusEditRowField(row, EDIT_ROW_FIELDS[idx + 1]);
}

function focusEditRowField(row: HTMLElement, field: string) {
  const wrap = row.querySelector<HTMLElement>(`[data-field="${field}"]`);
  if (!wrap) return;

  if (field === "pics") {
    const trigger = wrap.querySelector<HTMLElement>(".p-multiselect");
    trigger?.focus();
    trigger?.click();
    return;
  }

  if (field === "status" || field === "kpi") {
    const trigger = wrap.querySelector<HTMLElement>(".p-select");
    trigger?.focus();
    trigger?.click();
    return;
  }

  const input = wrap.querySelector<HTMLElement>("input, textarea");
  input?.focus();
}

async function onStatusChange(task: WeeklyTask, status: string | null | undefined) {
  const nextStatus = status || "pending";
  if (task.status === nextStatus) return;
  task.status = nextStatus;

  // Draft chưa có id — status sẽ lưu cùng lúc thêm dòng.
  if (task.isDraft) return;

  clearAutoSaveTimer(task.id);
  const ok = await persistTask(task, { quiet: true });
  if (ok) {
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "Trạng thái đã được cập nhật thành công.",
      life: 2500
    });
  }
}

async function onKpiChange(task: WeeklyTask, kpi: string | null | undefined) {
  const nextKpi = kpi || "";
  if (task.kpi === nextKpi) return;
  task.kpi = nextKpi;

  if (task.isDraft) return;

  clearAutoSaveTimer(task.id);
  const ok = await persistTask(task, { quiet: true });
  if (ok) {
    toast.add({
      severity: "success",
      summary: "Thành công",
      detail: "KPIs đã được cập nhật thành công.",
      life: 2500
    });
  }
}

function setPics(task: WeeklyTask, names: string[] | null | undefined) {
  const selected = names ?? [];
  task.pics = selected.map((name) => {
    const person = personnel.value.find((p) => p.name === name);
    return person ? { ...person } : { name, avatar: null };
  });
}

function scheduleAutoSave(task: WeeklyTask) {
  if (task.isDraft) return;
  clearAutoSaveTimer(task.id);
  autoSaveTimers.set(
    task.id,
    setTimeout(() => {
      autoSaveTimers.delete(task.id);
      void persistTask(task, { quiet: true });
    }, AUTO_SAVE_DELAY_MS)
  );
}

async function persistTask(task: WeeklyTask, options?: { quiet?: boolean }): Promise<boolean> {
  if (task.isDraft) return false;
  if (!isDirty(task)) return true;
  if (savingIds.value.has(task.id)) {
    scheduleAutoSave(task);
    return false;
  }

  const next = new Set(savingIds.value);
  next.add(task.id);
  savingIds.value = next;

  const sentKey = snapshotKey(task);

  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        item: task.item ?? "",
        objective: task.objective ?? "",
        dod: task.dod ?? "",
        pics: task.pics ?? [],
        status: task.status ?? "pending",
        kpi: task.kpi ?? "",
        progress: task.progress,
        progressNote: task.progressNote || null
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.task) throw new Error("Phản hồi lưu không hợp lệ.");
    const saved = data.task as WeeklyTask;

    // Keep newer local edits if the user typed during the request.
    if (snapshotKey(task) === sentKey) {
      task.item = saved.item;
      task.objective = saved.objective;
      task.dod = saved.dod;
      task.pics = saved.pics ?? [];
      task.status = saved.status;
      task.kpi = saved.kpi ?? "";
      task.progress = saved.progress;
      task.progressNote = saved.progressNote ?? "";
      markClean(task);
    }

    if (!options?.quiet) {
      toast.add({
        severity: "success",
        summary: "Đã lưu",
        detail: "Mục tiêu đã được lưu thành công.",
        life: 2500
      });
    }
    return true;
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được mục tiêu.",
      life: 3500
    });
    return false;
  } finally {
    const done = new Set(savingIds.value);
    done.delete(task.id);
    savingIds.value = done;
    if (isDirty(task)) scheduleAutoSave(task);
  }
}

function focusDraft(groupId: number) {
  if (collapsed.value.has(groupId)) {
    const next = new Set(collapsed.value);
    next.delete(groupId);
    collapsed.value = next;
  }

  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(`[data-draft-group="${groupId}"]`);
    if (!row) return;
    row.scrollIntoView({ behavior: "smooth", block: "nearest" });
    focusEditRowField(row, "item");
  });
}

function addRow(groupId: number) {
  focusDraft(groupId);
}

async function saveTask(task: WeeklyTask, groupId: number) {
  if (!task.isDraft) {
    if (editingCell.value?.taskId === task.id) {
      await finishFieldEdit(task, editingCell.value.field);
    } else {
      await persistTask(task, { quiet: true });
    }
    return;
  }
  if (savingIds.value.has(task.id)) return;
  if (isBlankDraft(task)) {
    toast.add({
      severity: "warn",
      summary: "Thiếu nội dung",
      detail: "Nhập ít nhất một trường trước khi lưu.",
      life: 2500
    });
    return;
  }

  const next = new Set(savingIds.value);
  next.add(task.id);
  savingIds.value = next;

  try {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders()
      },
      body: JSON.stringify({
        weekStart: selectedWeekStart.value,
        categoryId: groupId,
        item: task.item ?? "",
        objective: task.objective ?? "",
        dod: task.dod ?? "",
        pics: task.pics ?? [],
        status: task.status ?? "pending",
        kpi: task.kpi ?? "",
        progress: task.progress,
        progressNote: task.progressNote || null
      })
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.error || `HTTP ${res.status}`);
    }
    const data = await res.json();
    if (!data?.task) throw new Error("Phản hồi lưu không hợp lệ.");

    const group = groups.value.find((g) => g.id === groupId);
    const saved = hydrateTask(data.task as WeeklyTask);
    group?.tasks.push(saved);
    nextTaskId = Math.max(nextTaskId, saved.id + 1);
    resetDraft(groupId);

    toast.add({
      severity: "success",
      summary: "Đã lưu",
      detail: "Mục tiêu đã được thêm thành công.",
      life: 2500
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không lưu được mục tiêu.",
      life: 3500
    });
  } finally {
    const done = new Set(savingIds.value);
    done.delete(task.id);
    savingIds.value = done;
  }
}

function clearDraft(groupId: number) {
  resetDraft(groupId);
  toast.add({
    severity: "info",
    summary: "Đã xóa nội dung",
    detail: "Dòng thêm mới đã được làm trống.",
    life: 2000
  });
}

async function deleteTask(groupId: number, task: WeeklyTask) {
  if (deletingIds.value.has(task.id)) return;

  if (task.isDraft) {
    if (isBlankDraft(task)) {
      focusDraft(groupId);
      return;
    }
    confirm.require({
      message: "Xóa nội dung đang nhập trên dòng thêm mới?",
      header: "Xóa nội dung",
      icon: "pi pi-exclamation-triangle",
      rejectProps: {
        label: "Hủy",
        severity: "secondary",
        outlined: true
      },
      acceptProps: {
        label: "Xóa",
        severity: "danger"
      },
      accept: () => clearDraft(groupId)
    });
    return;
  }

  confirm.require({
    message: "Bạn có chắc muốn xóa mục tiêu này? Hành động không thể hoàn tác.",
    header: "Xóa mục tiêu",
    icon: "pi pi-exclamation-triangle",
    rejectProps: {
      label: "Hủy",
      severity: "secondary",
      outlined: true
    },
    acceptProps: {
      label: "Xóa",
      severity: "danger"
    },
    accept: () => {
      void performDeleteTask(groupId, task);
    }
  });
}

async function performDeleteTask(groupId: number, task: WeeklyTask) {
  if (deletingIds.value.has(task.id)) return;

  const next = new Set(deletingIds.value);
  next.add(task.id);
  deletingIds.value = next;

  try {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) throw new Error("delete failed");

    const group = groups.value.find((g) => g.id === groupId);
    if (group) {
      group.tasks = group.tasks.filter((t) => t.id !== task.id);
    }
    clearAutoSaveTimer(task.id);
    baselines.delete(task.id);
    if (editingCell.value?.taskId === task.id) editingCell.value = null;

    toast.add({
      severity: "success",
      summary: "Đã xóa",
      detail: "Mục tiêu đã được xóa.",
      life: 2500
    });
  } catch {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: "Không xóa được mục tiêu.",
      life: 3000
    });
  } finally {
    const done = new Set(deletingIds.value);
    done.delete(task.id);
    deletingIds.value = done;
  }
}

function syncWeekRange(weekStart: string) {
  const week = getWeekInfo(parseIsoDate(weekStart) ?? new Date());
  weekRange.value = [week.start, week.end];
  selectedWeekStart.value = week.weekStart;
  meta.value = {
    ...meta.value,
    weekStart: week.weekStart,
    weekLabel: week.weekLabel,
    deadlineNote: formatDeadlineNote(week.start)
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
    meta.value = {
      ...meta.value,
      weekStart: week.weekStart,
      weekLabel: week.weekLabel,
      deadlineNote: formatDeadlineNote(week.start)
    };
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
      groups.value = mergeFixedGroups([]);
      for (const g of DEFAULT_GROUPS) resetDraft(g.id);
      syncWeekRange(weekStart);
      return;
    }
    const data = await res.json();
    if (data.meta) {
      const resolvedWeek = data.meta.weekStart ?? weekStart;
      const monday = parseIsoDate(resolvedWeek) ?? getWeekInfo().start;
      meta.value = {
        department: data.meta.department ?? meta.value.department,
        weekStart: resolvedWeek,
        weekLabel: data.meta.weekLabel ?? meta.value.weekLabel,
        deadlineNote: formatDeadlineNote(monday)
      };
      syncWeekRange(meta.value.weekStart);
    }
    personnel.value =
      Array.isArray(data.personnel) && data.personnel.length > 0
        ? data.personnel
        : defaultPersonnel;
    groups.value = mergeFixedGroups(data.groups);
    for (const g of DEFAULT_GROUPS) resetDraft(g.id);
    editingCell.value = null;
    collapsed.value = new Set();
    const maxId = groups.value
      .flatMap((g) => g.tasks)
      .reduce((max, t) => Math.max(max, t.id), 0);
    nextTaskId = maxId + 1;
    runProgressDeadlineNotify();
  } catch {
    personnel.value = defaultPersonnel;
    groups.value = mergeFixedGroups([]);
    for (const g of DEFAULT_GROUPS) resetDraft(g.id);
  }
}

onMounted(() => {
  void loadBoard(selectedWeekStart.value);
  void ensureProgressDeadlinePermission();
  runProgressDeadlineNotify();
  deadlineTimer = setInterval(() => {
    nowTick.value = Date.now();
    runProgressDeadlineNotify();
  }, 30_000);
});

onUnmounted(() => {
  for (const timer of autoSaveTimers.values()) clearTimeout(timer);
  autoSaveTimers.clear();
  if (deadlineTimer) {
    clearInterval(deadlineTimer);
    deadlineTimer = null;
  }
});

</script>

<style scoped>
.board-col-headers {
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--color-primary) 8%, transparent),
    0 8px 20px rgb(70 72 212 / 0.06);
}

.deadline-badge {
  transition:
    color 0.25s ease,
    background-color 0.25s ease,
    box-shadow 0.25s ease;
}

.deadline-ok {
  color: var(--color-on-surface-variant);
  background: transparent;
  font-style: italic;
  font-weight: 400;
}

.deadline-soon {
  color: #b06000;
  background: #fef0e6;
  animation: deadline-pulse-soft 2.4s ease-in-out infinite;
}

.deadline-urgent {
  color: #c77700;
  background: #fff3cd;
  box-shadow: 0 0 0 0 rgba(249, 171, 0, 0.45);
  animation: deadline-pulse 1.6s ease-in-out infinite;
}

.deadline-critical {
  color: #93000a;
  background: #ffdad6;
  animation:
    deadline-pulse 1.1s ease-in-out infinite,
    deadline-shake 0.55s ease-in-out infinite;
}

.deadline-overdue {
  color: #fff;
  background: #ba1a1a;
  animation:
    deadline-flash 1.4s ease-in-out infinite,
    deadline-shake 0.7s ease-in-out infinite;
}

@keyframes deadline-pulse-soft {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(176, 96, 0, 0.2);
  }
  50% {
    transform: scale(1.02);
    box-shadow: 0 0 0 6px rgba(176, 96, 0, 0);
  }
}

@keyframes deadline-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(249, 171, 0, 0.45);
  }
  50% {
    transform: scale(1.04);
    box-shadow: 0 0 0 8px rgba(249, 171, 0, 0);
  }
}

@keyframes deadline-shake {
  0%,
  100% {
    translate: 0 0;
  }
  20% {
    translate: -1.5px 0;
  }
  40% {
    translate: 1.5px 0;
  }
  60% {
    translate: -1px 0;
  }
  80% {
    translate: 1px 0;
  }
}

@keyframes deadline-flash {
  0%,
  100% {
    background: #ba1a1a;
    box-shadow: 0 0 0 0 rgba(186, 26, 26, 0.5);
  }
  50% {
    background: #d93025;
    box-shadow: 0 0 12px 2px rgba(186, 26, 26, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .deadline-soon,
  .deadline-urgent,
  .deadline-critical,
  .deadline-overdue {
    animation: none;
  }
}

.category-header {
  background: var(--cat-soft);
  border-bottom-color: color-mix(in srgb, var(--cat-accent) 28%, transparent);
  border-left: 4px solid var(--cat-accent);
}

.category-title {
  color: var(--cat-accent);
}

.category-meta {
  color: color-mix(in srgb, var(--cat-accent) 72%, #464554);
}

.category-chevron {
  color: var(--cat-accent);
}

.category-chevron:hover {
  background: var(--cat-accent);
  color: #fff;
}

.category-add {
  border-color: color-mix(in srgb, var(--cat-accent) 28%, transparent);
  color: var(--cat-accent);
}

.category-add:hover {
  border-color: var(--cat-accent);
  background: var(--cat-accent);
  color: #fff;
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

.pic-chip {
  background: var(--color-secondary-container);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
}

.pic-chip :deep(.p-chip-label) {
  font-size: 0.75rem;
}

.progress-link {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 0.35rem;
  border-radius: 0.375rem;
  padding: 0.2rem 0.45rem;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;
  transition: background-color 0.15s ease;
}

.progress-link:hover {
  background: color-mix(in srgb, var(--color-primary) 14%, transparent);
  text-decoration: underline;
}

.progress-link-inline {
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

.field-edit-btn {
  position: absolute;
  top: 1.25rem;
  right: 0;
  display: inline-flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: var(--color-primary);
  background: var(--color-surface-container-low);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease;
}

@media (min-width: 1024px) {
  .field-edit-btn {
    top: 0;
  }
}

.group:hover > .field-edit-btn,
.group:hover .field-edit-btn,
.group:focus-within > .field-edit-btn,
.field-edit-btn:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.field-edit-btn:hover {
  background: var(--color-secondary-container);
}

@media (hover: none) {
  .field-edit-btn {
    opacity: 0.85;
    pointer-events: auto;
  }
}
</style>
