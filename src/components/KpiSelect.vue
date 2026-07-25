<template>
  <Select
    :modelValue="modelValue || null"
    :options="KPI_OPTIONS"
    optionLabel="label"
    optionValue="value"
    :disabled="disabled"
    placeholder=""
    showClear
    class="w-full"
    :pt="selectPt"
    @update:modelValue="onUpdate"
  >
    <template #value="{ value }">
      <span
        v-if="value"
        class="inline-flex max-w-full items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold leading-tight tracking-wide"
        :class="[tone(value).chip, tone(value).text]"
      >
        <span class="truncate">{{ labelFor(value) }}</span>
      </span>
    </template>
    <template #option="{ option }">
      <span
        class="inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold"
        :class="[tone(option.value).chip, tone(option.value).text]"
      >
        {{ option.label }}
      </span>
    </template>
  </Select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Select from "primevue/select";

const KPI_OPTIONS = [
  { label: "Đạt", value: "achieved" },
  { label: "Chưa đạt", value: "not_achieved" },
  { label: "Delayed", value: "delayed" }
];

const EMPTY_TONE = {
  text: "text-on-surface-variant",
  chip: "",
  root: [
    "!min-h-8 !h-auto !rounded-full !border !border-surface-container-high !bg-white !text-on-surface-variant !shadow-none",
    "hover:!border-outline-variant hover:!bg-surface-container-low",
    "[&.p-focus]:!border-primary [&.p-focus]:!bg-white [&.p-focus]:!shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
  ].join(" ")
};

const KPI_TONE = {
  achieved: {
    text: "text-[#137333]",
    chip: "bg-[#e6f4ea]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#a8dab5] !bg-[#e6f4ea] !text-[#137333] !shadow-none",
      "hover:!border-[#137333] hover:!bg-[#d4edda]",
      "[&.p-focus]:!border-[#137333] [&.p-focus]:!bg-[#d4edda] [&.p-focus]:!shadow-[0_0_0_2px_rgba(19,115,51,0.22)]"
    ].join(" ")
  },
  not_achieved: {
    text: "text-[#b06000]",
    chip: "bg-[#fef0e6]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#f5c89a] !bg-[#fef0e6] !text-[#b06000] !shadow-none",
      "hover:!border-[#b06000] hover:!bg-[#fde4d0]",
      "[&.p-focus]:!border-[#b06000] [&.p-focus]:!bg-[#fde4d0] [&.p-focus]:!shadow-[0_0_0_2px_rgba(176,96,0,0.22)]"
    ].join(" ")
  },
  delayed: {
    text: "text-[#3c4043]",
    chip: "bg-[#f1f3f4]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#dadce0] !bg-[#f1f3f4] !text-[#3c4043] !shadow-none",
      "hover:!border-[#5f6368] hover:!bg-[#e8eaed]",
      "[&.p-focus]:!border-[#5f6368] [&.p-focus]:!bg-[#e8eaed] [&.p-focus]:!shadow-[0_0_0_2px_rgba(95,99,104,0.22)]"
    ].join(" ")
  }
} as const;

type KpiValue = keyof typeof KPI_TONE;

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function normalize(kpi: unknown): KpiValue | "" {
  const value = String(kpi || "");
  if (value === "achieved" || value === "not_achieved" || value === "delayed") return value;
  return "";
}

function tone(kpi: unknown) {
  const value = normalize(kpi);
  return value ? KPI_TONE[value] : EMPTY_TONE;
}

function labelFor(kpi: unknown) {
  const value = normalize(kpi);
  if (!value) return "";
  return KPI_OPTIONS.find((o) => o.value === value)?.label ?? "";
}

function onUpdate(value: string | null | undefined) {
  emit("update:modelValue", value || "");
}

const selectPt = computed(() => {
  const current = tone(props.modelValue);
  return {
    root: {
      class: `w-full transition-[background-color,border-color,box-shadow] duration-150 ${current.root}`
    },
    label: {
      class: `flex items-center py-1 pl-1.5 pr-0.5 ${current.text}`
    },
    dropdown: {
      class: `w-6 ${current.text}`
    },
    dropdownicon: {
      class: "text-[10px]"
    },
    clearicon: {
      class: "text-[10px]"
    }
  };
});
</script>
