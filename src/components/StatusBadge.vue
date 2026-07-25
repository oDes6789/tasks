<template>
  <span
    class="relative inline-flex overflow-hidden rounded-full text-xs font-semibold"
    :class="wrapClass"
  >
    <span class="px-3 py-1.5">{{ label }}</span>
    <span
      v-if="status === 'in_progress' && progress != null"
      class="absolute bottom-0 left-0 h-1 rounded-full bg-on-primary/50"
      :style="{ width: `${progress}%` }"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  status: "pending" | "done" | "in_progress" | string;
  progress?: number | null;
}>();

const label = computed(() => {
  if (props.status === "done") return "Done";
  if (props.status === "in_progress") return "In Progress";
  return "Pending";
});

const wrapClass = computed(() => {
  if (props.status === "done") return "bg-[#34a853] text-white";
  if (props.status === "in_progress") return "bg-primary text-on-primary";
  return "bg-primary-fixed text-on-primary-fixed-variant";
});
</script>
