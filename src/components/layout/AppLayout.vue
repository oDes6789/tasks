<template>
  <div class="min-h-screen bg-background text-on-surface">
    <AppSidebar @new-task="onNewTask"  @show-shortcuts="helpOpen = true" />

    <div class="ml-72 flex min-h-screen flex-col">
      <AppHeader @search="onSearch" />

      <main class="flex-1 pt-24 px-container-padding pb-stack-lg">
        <RouterView />
      </main>

      <AppFooter />
    </div>
    <KeyboardShortcutsHelp :open="helpOpen" @close="helpOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterView } from "vue-router";
import AppSidebar from "./AppSidebar.vue";
import AppHeader from "./AppHeader.vue";
import AppFooter from "./AppFooter.vue";
import Icon from "@/components/Icon.vue";
import KeyboardShortcutsHelp from "@/components/KeyboardShortcutsHelp.vue";
import { useAppKeyboardShortcuts } from "@/composables/useAppKeyboardShortcuts";

const helpOpen = ref(false);
useAppKeyboardShortcuts(helpOpen);

function onNewTask() {
  // Placeholder — sẽ nối form tạo task ở bước sau
  console.info("New task clicked");
}

function onSearch(query: string) {
  console.info("Search:", query);
}
</script>
