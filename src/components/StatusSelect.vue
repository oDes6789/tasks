<template>
  <Select
    :modelValue="modelValue"
    :options="STATUS_OPTIONS"
    optionLabel="label"
    optionValue="value"
    :disabled="disabled"
    class="w-full"
    :pt="selectPt"
    @update:modelValue="onUpdate"
  >
    <template #value="{ value }">
      <span
        class="inline-flex max-w-full items-center gap-1.5 whitespace-nowrap text-[11px] font-bold leading-tight tracking-wide"
        :class="tone(value).text"
      >
        <span
          class="size-[7px] shrink-0 rounded-full"
          :class="tone(value).dot"
          aria-hidden="true"
        />
        <span class="truncate">{{ labelFor(value) }}</span>
      </span>
    </template>
    <template #option="{ option }">
      <span
        class="inline-flex items-center gap-2 text-[13px] font-semibold"
        :class="tone(option.value).text"
      >
        <span
          class="size-2 shrink-0 rounded-full"
          :class="tone(option.value).dot"
          aria-hidden="true"
        />
        <span>{{ option.label }}</span>
      </span>
    </template>
  </Select>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Select from "primevue/select";

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "On Track", value: "in_progress" },
  { label: "Done", value: "done" }
];

const STATUS_TONE = {
  pending: {
    text: "text-[#c77700]",
    dot: "bg-[#f9ab00] shadow-[0_0_0_2px_rgba(249,171,0,0.25)]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#f5d78e] !bg-[#fff3cd] !text-[#c77700] !shadow-none",
      "hover:!border-[#c77700] hover:!bg-[#ffecb3]",
      "[&.p-focus]:!border-[#c77700] [&.p-focus]:!bg-[#ffecb3] [&.p-focus]:!shadow-[0_0_0_2px_rgba(199,119,0,0.22)]"
    ].join(" ")
  },
  in_progress: {
    text: "text-[#137333]",
    dot: "bg-[#34a853] shadow-[0_0_0_2px_rgba(52,168,83,0.25)]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#a8dab5] !bg-[#e6f4ea] !text-[#137333] !shadow-none",
      "hover:!border-[#137333] hover:!bg-[#d4edda]",
      "[&.p-focus]:!border-[#137333] [&.p-focus]:!bg-[#d4edda] [&.p-focus]:!shadow-[0_0_0_2px_rgba(19,115,51,0.22)]"
    ].join(" ")
  },
  done: {
    text: "text-[#1e8e3e]",
    dot: "bg-[#1e8e3e] shadow-[0_0_0_2px_rgba(30,142,62,0.25)]",
    root: [
      "!min-h-8 !h-auto !rounded-full !border !border-[#8fd19e] !bg-[#ceead6] !text-[#1e8e3e] !shadow-none",
      "hover:!border-[#1e8e3e] hover:!bg-[#b7e1c3]",
      "[&.p-focus]:!border-[#1e8e3e] [&.p-focus]:!bg-[#b7e1c3] [&.p-focus]:!shadow-[0_0_0_2px_rgba(30,142,62,0.22)]"
    ].join(" ")
  }
} as const;

const props = defineProps<{
  modelValue: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

function normalize(status: unknown): keyof typeof STATUS_TONE {
  const value = String(status || "pending");
  if (value === "done" || value === "in_progress") return value;
  return "pending";
}

function tone(status: unknown) {
  return STATUS_TONE[normalize(status)];
}

function labelFor(status: unknown) {
  const value = normalize(status);
  return STATUS_OPTIONS.find((o) => o.value === value)?.label ?? "Pending";
}

function onUpdate(value: string | null | undefined) {
  emit("update:modelValue", value || "pending");
}

const selectPt = computed(() => {
  const current = tone(props.modelValue);
  return {
    root: {
      class: `w-full transition-[background-color,border-color,box-shadow] duration-150 ${current.root}`
    },
    label: {
      class: `flex items-center py-1 pl-2.5 pr-0.5 ${current.text}`
    },
    dropdown: {
      class: `w-6 ${current.text}`
    },
    dropdownicon: {
      class: "text-[10px]"
    }
  };
});
</script>
