<template>
  <span class="material-symbols-outlined" :class="iconClass" aria-hidden="true">{{ name }}</span>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  iconClass?: string;
}>();
</script>
