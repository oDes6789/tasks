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
      class="mb-3 hidden grid-cols-[minmax(120px,0.85fr)_minmax(160px,1.15fr)_minmax(180px,1.25fr)_minmax(150px,1fr)_110px_minmax(120px,0.9fr)_88px] gap-4 px-5 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary/70 lg:grid"
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
          <article
            v-for="(task, index) in visibleRows(group)"
            :key="task.isDraft ? `draft-${group.id}` : task.id"
            class="grid grid-cols-1 items-start gap-4 px-4 py-4 transition-colors hover:bg-surface-container-low/50 sm:px-5 lg:grid-cols-[minmax(120px,0.85fr)_minmax(160px,1.15fr)_minmax(180px,1.25fr)_minmax(150px,1fr)_110px_minmax(120px,0.9fr)_88px] lg:gap-4"
            :class="[
              index > 0 ? 'border-t border-surface-container' : '',
              isEditing(task) || task.isDraft ? 'bg-primary-fixed/25 new-task-row' : ''
            ]"
            :data-draft-group="task.isDraft ? group.id : undefined"
            @keydown.enter.exact="onEditRowEnter($event, task, group.id)"
          >
            <div data-field="item">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Hạng mục
              </p>
              <InputText
                v-if="isEditing(task)"
                v-model="task.item"
                class="w-full text-sm font-semibold"
                placeholder="Hạng mục..."
              />
              <p v-else class="text-sm font-semibold text-on-surface">
                {{ task.item || "—" }}
              </p>
            </div>

            <div data-field="objective">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                Mục tiêu
              </p>
              <Textarea
                v-if="isEditing(task)"
                v-model="task.objective"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="Mục tiêu..."
              />
              <p v-else class="whitespace-pre-line text-sm leading-relaxed text-on-surface">
                {{ task.objective || "—" }}
              </p>
            </div>

            <div data-field="dod">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                DOD / Tiêu chuẩn
              </p>
              <Textarea
                v-if="isEditing(task)"
                v-model="task.dod"
                rows="3"
                class="w-full text-sm leading-relaxed"
                placeholder="DOD / tiêu chuẩn..."
              />
              <p v-else class="whitespace-pre-line text-sm leading-relaxed text-on-surface-variant">
                {{ task.dod || "—" }}
              </p>
            </div>

            <div data-field="pics">
              <p class="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary/50 lg:hidden">
                PIC
              </p>
              <div class="flex flex-wrap items-center gap-1.5">
                <MultiSelect
                  v-if="isEditing(task)"
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
                  <span v-if="task.pics.length === 0" class="text-sm text-on-surface-variant">—</span>
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
                v-if="isEditing(task)"
                v-model="task.progressNote"
                class="w-full text-sm"
                placeholder="Tiến độ..."
                @keydown.enter.exact.prevent="saveTask(task, group.id)"
              />
              <p v-else class="text-sm text-on-surface-variant">
                {{ task.progressNote || "—" }}
              </p>
            </div>

            <div class="flex items-start justify-end gap-1 pt-0.5 lg:justify-start">
              <button
                v-if="isEditing(task)"
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
                v-else
                type="button"
                class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-low text-primary transition-colors hover:bg-secondary-container"
                title="Sửa"
                aria-label="Sửa"
                @click="task.isEditing = true"
              >
                <Icon name="edit" icon-class="text-[18px]" />
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
import { computed, onMounted, ref } from "vue";
import Chip from "primevue/chip";
import DatePicker from "primevue/datepicker";
import InputText from "primevue/inputtext";
import MultiSelect from "primevue/multiselect";
import Textarea from "primevue/textarea";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
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
  isEditing?: boolean;
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
  ""
];

const toast = useToast();
const confirm = useConfirm();
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
const savingIds = ref(new Set<number>());
const deletingIds = ref(new Set<number>());
let nextTaskId = 1000;

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
    progress: null,
    progressNote: "",
    isEditing: true,
    isDraft: true
  };
}

const drafts = ref<Record<number, WeeklyTask>>(
  Object.fromEntries(DEFAULT_GROUPS.map((g) => [g.id, createEmptyDraft(g.id)]))
);

function resetDraft(groupId: number) {
  drafts.value[groupId] = createEmptyDraft(groupId);
}

function visibleRows(group: TaskGroup): WeeklyTask[] {
  return [...group.tasks, drafts.value[group.id]];
}

const defaultPersonnel: Pic[] = [
  { name: "Ms. Kim Bắc", avatar: null },
  { name: "Mr. Tiến Dũng", avatar: null },
  { name: "Ms. Thu Hà", avatar: null },
  { name: "Mr. Minh Quân", avatar: null },
  { name: "Ms. Lan Anh", avatar: null }
];

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
  return {
    ...task,
    progressNote: task.progressNote ?? "",
    isEditing: false,
    isDraft: false
  };
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

function isEditing(task: WeeklyTask) {
  return Boolean(task.isEditing || task.isDraft);
}

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

const EDIT_ROW_FIELDS = ["item", "objective", "dod", "pics", "progress"] as const;

function picNames(task: WeeklyTask) {
  return task.pics.map((p) => p.name);
}

function picInitials(name: string) {
  const parts = name.replace(/^(Ms\.|Mr\.)\s*/i, "").split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function onEditRowEnter(event: KeyboardEvent, task: WeeklyTask, groupId: number) {
  if (!isEditing(task)) return;

  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest(".p-multiselect-overlay, .p-multiselect-list, .p-overlay")) return;

  const fieldEl = target.closest<HTMLElement>("[data-field]");
  const field = fieldEl?.dataset.field;
  if (!field) return;

  const idx = EDIT_ROW_FIELDS.indexOf(field as (typeof EDIT_ROW_FIELDS)[number]);
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
  if (savingIds.value.has(task.id)) return;

  const next = new Set(savingIds.value);
  next.add(task.id);
  savingIds.value = next;

  try {
    if (task.isDraft) {
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
      saved.isEditing = false;
      group?.tasks.push(saved);
      nextTaskId = Math.max(nextTaskId, saved.id + 1);
      resetDraft(groupId);

      toast.add({
        severity: "success",
        summary: "Đã lưu",
        detail: "Mục tiêu đã được thêm thành công.",
        life: 2500
      });
      return;
    }

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
    task.item = saved.item;
    task.objective = saved.objective;
    task.dod = saved.dod;
    task.pics = saved.pics ?? [];
    task.status = saved.status;
    task.progress = saved.progress;
    task.progressNote = saved.progressNote ?? "";
    task.isEditing = false;

    toast.add({
      severity: "success",
      summary: "Đã lưu",
      detail: "Mục tiêu đã được lưu thành công.",
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
      groups.value = mergeFixedGroups([]);
      for (const g of DEFAULT_GROUPS) resetDraft(g.id);
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
    groups.value = mergeFixedGroups(data.groups);
    for (const g of DEFAULT_GROUPS) resetDraft(g.id);
    collapsed.value = new Set();
    const maxId = groups.value
      .flatMap((g) => g.tasks)
      .reduce((max, t) => Math.max(max, t.id), 0);
    nextTaskId = maxId + 1;
  } catch {
    personnel.value = defaultPersonnel;
    groups.value = mergeFixedGroups([]);
    for (const g of DEFAULT_GROUPS) resetDraft(g.id);
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

.pic-chip {
  background: var(--color-secondary-container);
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 500;
}

.pic-chip :deep(.p-chip-label) {
  font-size: 0.75rem;
}
</style>
