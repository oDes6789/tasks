<template>
  <div class="min-h-screen bg-background text-on-surface">
    <AppSidebar @new-task="onNewTask" />

    <div class="ml-72 flex min-h-screen flex-col">
      <AppHeader @search="onSearch" />

      <main class="flex-1 pt-24 px-container-padding pb-stack-lg">
        <RouterView />
      </main>

      <AppFooter />
    </div>

    <button
      type="button"
      class="fixed bottom-8 right-8 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-on-primary shadow-2xl transition-all hover:scale-110 active:scale-95"
      aria-label="New task"
      @click="onNewTask"
    >
      <Icon name="add" icon-class="text-3xl" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import AppSidebar from "./AppSidebar.vue";
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";
import Icon from "@/components/Icon.vue";

function onNewTask() {
  // Placeholder — sẽ nối form tạo task ở bước sau
  console.info("New task clicked");
}

function onSearch(query: string) {
  console.info("Search:", query);
}
</script>
