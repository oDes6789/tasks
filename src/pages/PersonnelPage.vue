<template>
  <div class="users-page">
    <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h2 class="mb-1 text-headline-lg text-primary">QUẢN LÝ NHÂN SỰ</h2>
        <p class="text-body-md text-on-surface-variant">
          Người đã đăng nhập qua Edutalk · Teamlead gán brand &amp; bật theo dõi nghỉ Thứ 7
        </p>
      </div>
    </header>

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
            placeholder="Tìm tên, email, phòng ban..."
            aria-label="Tìm kiếm người dùng"
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
      </div>
      <p class="text-sm text-on-surface-variant">
        <strong class="tabular-nums text-on-surface">{{ filteredItems.length }}</strong>
        /{{ items.length }} người đã đăng nhập
        <span v-if="trackedCount" class="ml-2 text-primary">
          · {{ trackedCount }} theo dõi T7
        </span>
      </p>
    </div>

    <div
      v-if="!auth.isTeamLead"
      class="mb-4 rounded-md border border-outline-variant/40 bg-surface-container-low/60 px-4 py-3 text-sm text-on-surface-variant"
    >
      Chỉ tài khoản <strong class="text-on-surface">teamlead</strong> mới được gán brand, bật theo dõi nghỉ Thứ 7 và xóa tài khoản.
    </div>

    <div class="overflow-hidden rounded-md border border-outline-variant/40 bg-white ambient-shadow">
      <div
        class="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-outline-variant/40 bg-surface-container-low/70 px-3 py-2.5 sm:px-4"
      >
        <span class="inline-flex items-center gap-1.5 text-[12px] font-semibold text-on-surface">
          <Icon name="group" icon-class="text-[18px] text-primary" />
          Danh sách tài khoản
        </span>
        <span class="text-xs text-on-surface-variant">
          Tài khoản được tạo tự động khi đăng nhập Edutalk
        </span>
      </div>

      <div v-if="loading" class="px-4 py-16 text-center text-sm text-on-surface-variant">
        Đang tải danh sách…
      </div>
      <div
        v-else-if="items.length === 0"
        class="px-4 py-16 text-center text-sm text-on-surface-variant"
      >
        Chưa có ai đăng nhập. Danh sách sẽ hiện sau lần đăng nhập Edutalk đầu tiên.
      </div>
      <div
        v-else-if="filteredItems.length === 0"
        class="px-4 py-16 text-center text-sm text-on-surface-variant"
      >
        Không tìm thấy người dùng khớp “{{ searchQuery.trim() }}”.
      </div>
      <div v-else class="users-table-wrap">
        <table class="users-table">
          <thead>
            <tr>
              <th class="users-th users-th-stt">#</th>
              <th class="users-th">Nhân sự</th>
              <th class="users-th">Email</th>
              <th class="users-th">Phòng ban / Loại TK</th>
              <th class="users-th">Quản lý</th>
              <th class="users-th">Brand</th>
              <th class="users-th">Theo dõi T7</th>
              <th v-if="auth.isTeamLead" class="users-th users-th-actions" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in filteredItems" :key="item.id" class="users-row">
              <td class="users-td users-td-stt">{{ index + 1 }}</td>
              <td class="users-td">
                <div class="flex items-center gap-2.5">
                  <img
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    :alt="item.name"
                    class="h-8 w-8 rounded-full object-cover"
                  />
                  <span
                    v-else
                    class="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-container text-[11px] font-bold text-primary"
                  >
                    {{ initials(item.name) }}
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-on-surface">
                      {{ item.name }}
                      <span
                        v-if="isMe(item.id)"
                        class="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                      >
                        Bạn
                      </span>
                      <span
                        v-if="item.isTeamLead"
                        class="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
                      >
                        Teamlead
                      </span>
                    </p>
                  </div>
                </div>
              </td>
              <td class="users-td">
                <span class="text-sm text-on-surface-variant">{{ item.email || "—" }}</span>
              </td>
              <td class="users-td">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm text-on-surface">
                    {{ item.position?.department || "—" }}
                  </span>
                  <span v-if="item.position?.accountType?.name" class="text-[11px] text-outline">
                    {{ item.position.accountType.name }}
                  </span>
                </div>
              </td>
              <td class="users-td">
                <span class="text-sm text-on-surface-variant">
                  {{ item.manager?.name || "—" }}
                </span>
              </td>
              <td class="users-td">
                <div
                  class="brand-seg"
                  role="group"
                  :aria-label="`Brand ${item.name}`"
                  :class="{ 'is-readonly': !auth.isTeamLead, 'is-busy': savingIds.has(item.id) }"
                >
                  <button
                    v-for="opt in brandSegOptions"
                    :key="opt.value"
                    type="button"
                    class="brand-seg-btn"
                    :data-brand="opt.value"
                    :class="{ 'is-active': item.leaveBrand === opt.value }"
                    :disabled="!auth.isTeamLead || savingIds.has(item.id)"
                    :title="opt.label"
                    @click="onBrandSegClick(item, opt.value)"
                  >
                    <img
                      v-if="opt.logo"
                      :src="opt.logo"
                      :alt="opt.label"
                      class="brand-seg-logo"
                      :class="`is-${opt.value}`"
                    />
                    <span v-else class="brand-seg-text">{{ opt.short }}</span>
                  </button>
                </div>
              </td>
              <td class="users-td">
                <div class="flex items-center gap-2">
                  <ToggleSwitch
                    :modelValue="item.saturdayLeaveTracked"
                    :disabled="!auth.isTeamLead || savingIds.has(item.id)"
                    @update:modelValue="(v: boolean) => onTrackChange(item, v)"
                  />
                  <span
                    class="text-xs font-semibold"
                    :class="item.saturdayLeaveTracked ? 'text-primary' : 'text-outline'"
                  >
                    {{ item.saturdayLeaveTracked ? "Bật" : "Tắt" }}
                  </span>
                </div>
              </td>
              <td v-if="auth.isTeamLead" class="users-td users-td-actions">
                <button
                  v-if="!isMe(item.id)"
                  type="button"
                  class="inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant transition hover:bg-error-container hover:text-error"
                  title="Xóa khỏi hệ thống"
                  aria-label="Xóa người dùng"
                  @click="confirmDelete(item)"
                >
                  <Icon name="delete" icon-class="text-[18px]" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import ToggleSwitch from "primevue/toggleswitch";
import { useConfirm } from "primevue/useconfirm";
import { useToast } from "primevue/usetoast";
import Icon from "@/components/Icon.vue";
import { authHeaders } from "@/lib/auth";
import { BRAND_META, type LeaveBrand } from "@/lib/saturdayLeave";
import { useAuthStore, type AuthUser } from "@/stores/auth";
import logoIm from "@/assets/brands/ieltsmentor.png";
import logoEc from "@/assets/brands/classup.png";

type AppUserRow = AuthUser & {
  createdAt?: number;
  isTeamLead?: boolean;
};

const toast = useToast();
const confirm = useConfirm();
const auth = useAuthStore();

const items = ref<AppUserRow[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const savingIds = ref<Set<number>>(new Set());

const brandSegOptions: {
  value: LeaveBrand;
  label: string;
  short: string;
  logo?: string;
}[] = [
  { value: "general", label: "Ban điều hành", short: "BDH" },
  { value: "im", label: "IELTSMentor", short: "IM", logo: logoIm },
  { value: "ec", label: "ClassUp", short: "EC", logo: logoEc }
];

const trackedCount = computed(
  () => items.value.filter((i) => i.saturdayLeaveTracked).length
);

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return items.value;
  return items.value.filter((item) => {
    const hay = [
      item.name,
      item.email,
      item.employeeCode != null ? String(item.employeeCode) : "",
      item.position?.department ?? "",
      item.position?.accountType?.name ?? "",
      item.manager?.name ?? "",
      item.leaveBrand ? BRAND_META[item.leaveBrand].label : ""
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
});

function isMe(id: number) {
  return auth.user?.id === id;
}

function initials(name: string) {
  const cleaned = name.replace(/^m[rs]\.\s*/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function markSaving(id: number, on: boolean) {
  const next = new Set(savingIds.value);
  if (on) next.add(id);
  else next.delete(id);
  savingIds.value = next;
}

async function loadItems() {
  loading.value = true;
  try {
    const res = await fetch("/api/users", { headers: { ...authHeaders() } });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không tải được.");
    }
    const data = (await res.json()) as { items: AppUserRow[] };
    items.value = Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không tải được danh sách.",
      life: 3000
    });
  } finally {
    loading.value = false;
  }
}

async function patchUser(
  item: AppUserRow,
  body: { leaveBrand?: LeaveBrand | null; saturdayLeaveTracked?: boolean }
) {
  markSaving(item.id, true);
  const prev = {
    leaveBrand: item.leaveBrand,
    saturdayLeaveTracked: item.saturdayLeaveTracked
  };
  if ("leaveBrand" in body) item.leaveBrand = body.leaveBrand ?? null;
  if ("saturdayLeaveTracked" in body) {
    item.saturdayLeaveTracked = Boolean(body.saturdayLeaveTracked);
  }

  try {
    const res = await fetch(`/api/users/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error || "Không cập nhật được.");
    }
    const data = (await res.json()) as { item: AppUserRow };
    const idx = items.value.findIndex((p) => p.id === item.id);
    if (idx >= 0) items.value[idx] = { ...items.value[idx], ...data.item };
    if (isMe(item.id) && auth.user) {
      auth.user = {
        ...auth.user,
        leaveBrand: data.item.leaveBrand,
        saturdayLeaveTracked: data.item.saturdayLeaveTracked
      };
    }
  } catch (err) {
    item.leaveBrand = prev.leaveBrand;
    item.saturdayLeaveTracked = prev.saturdayLeaveTracked;
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không cập nhật được.",
      life: 3000
    });
  } finally {
    markSaving(item.id, false);
  }
}

function onBrandSegClick(item: AppUserRow, value: LeaveBrand) {
  if (!auth.isTeamLead) return;
  const next = item.leaveBrand === value ? null : value;
  void patchUser(item, { leaveBrand: next });
}

function onTrackChange(item: AppUserRow, tracked: boolean) {
  if (!auth.isTeamLead) return;
  if (item.saturdayLeaveTracked === tracked) return;
  void patchUser(item, { saturdayLeaveTracked: tracked });
}

function confirmDelete(item: AppUserRow) {
  confirm.require({
    message: `Xóa “${item.name}” khỏi hệ thống? Người này có thể đăng nhập lại sau.`,
    header: "Xác nhận xóa",
    icon: "pi pi-exclamation-triangle",
    rejectLabel: "Hủy",
    acceptLabel: "Xóa",
    acceptClass: "p-button-danger",
    accept: () => {
      void deleteItem(item);
    }
  });
}

async function deleteItem(item: AppUserRow) {
  try {
    const res = await fetch(`/api/users/${item.id}`, {
      method: "DELETE",
      headers: { ...authHeaders() }
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error || "Không xóa được.");
    }
    items.value = items.value.filter((p) => p.id !== item.id);
    toast.add({
      severity: "success",
      summary: "Đã xóa",
      detail: `Đã xóa “${item.name}”.`,
      life: 2000
    });
  } catch (err) {
    toast.add({
      severity: "error",
      summary: "Lỗi",
      detail: err instanceof Error ? err.message : "Không xóa được người dùng.",
      life: 3000
    });
  }
}

onMounted(() => {
  void loadItems();
});
</script>

<style scoped>
.users-table-wrap {
  overflow-x: auto;
}

.users-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.users-th {
  padding: 0.65rem 0.85rem;
  text-align: left;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-on-surface-variant, #49454e);
  background: color-mix(in srgb, var(--color-surface-container-low, #f7f2fa) 70%, white);
  border-bottom: 1px solid color-mix(in srgb, var(--color-outline-variant, #cac4d0) 40%, transparent);
}

.users-th-stt {
  width: 3rem;
  text-align: center;
}

.users-th-actions {
  width: 3.5rem;
}

.users-td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px dashed color-mix(in srgb, var(--color-outline-variant, #cac4d0) 40%, transparent);
  vertical-align: middle;
}

.users-td-stt {
  text-align: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-on-surface-variant, #49454e);
}

.users-row:hover .users-td {
  background: color-mix(in srgb, var(--color-surface-container-low, #f7f2fa) 45%, transparent);
}

.brand-seg {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f8fafc;
}
.brand-seg.is-busy {
  opacity: 0.65;
  pointer-events: none;
}
.brand-seg-btn {
  display: inline-flex;
  min-width: 2.65rem;
  height: 2rem;
  align-items: center;
  justify-content: center;
  border: 0;
  border-right: 1px solid #e2e8f0;
  background: transparent;
  padding: 0 0.55rem;
  cursor: pointer;
  transition: background 0.12s ease;
}
.brand-seg-btn:last-child {
  border-right: 0;
}
.brand-seg-btn:disabled {
  cursor: default;
}
.brand-seg-btn:hover:not(:disabled):not(.is-active) {
  background: #fff;
}
.brand-seg-btn.is-active[data-brand="general"] {
  background: #fef3c7;
}
.brand-seg-btn.is-active[data-brand="im"] {
  background: #e0f2fe;
}
.brand-seg-btn.is-active[data-brand="ec"] {
  background: #fef9c3;
}
.brand-seg-text {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: #64748b;
}
.brand-seg-btn.is-active .brand-seg-text {
  color: #92400e;
}
.brand-seg-logo {
  display: block;
  object-fit: contain;
}
.brand-seg-logo.is-im {
  height: 14px;
  width: auto;
  max-width: 4.5rem;
}
.brand-seg-logo.is-ec {
  height: 18px;
  width: 18px;
  border-radius: 4px;
}
</style>
