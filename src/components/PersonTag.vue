<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full bg-secondary-container px-2.5 py-1 text-xs font-medium text-primary"
  >
    <img
      v-if="avatar"
      :src="avatar"
      :alt="name"
      class="h-5 w-5 rounded-full object-cover"
    />
    <span
      v-else
      class="flex h-5 w-5 items-center justify-center rounded-full bg-surface-container-lowest text-[10px] font-bold text-primary"
    >
      {{ initials }}
    </span>
    {{ name }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  name: string;
  avatar?: string | null;
}>();

const initials = computed(() => {
  const parts = props.name.replace(/^(Ms\.|Mr\.)\s*/i, "").split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
});
</script>
