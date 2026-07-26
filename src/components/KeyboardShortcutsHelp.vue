<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/40 p-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      @click.self="emit('close')"
    >
      <div
        class="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-auto rounded-2xl bg-surface-bright p-6 ambient-shadow-lg"
      >
        <div class="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="shortcuts-title" class="text-headline-md font-bold text-primary">
              Phím tắt
            </h2>
            <p class="mt-1 text-label-md text-on-surface-variant">
              Nhấn <kbd class="shortcut-kbd">?</kbd> để mở lại, <kbd class="shortcut-kbd">Esc</kbd> để đóng
            </p>
          </div>
          <button
            type="button"
            class="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="Đóng"
            @click="emit('close')"
          >
            <Icon name="close" />
          </button>
        </div>

        <section v-for="group in groups" :key="group.name" class="mb-5 last:mb-0">
          <h3 class="mb-2 text-label-md font-bold text-on-surface-variant">{{ group.name }}</h3>
          <ul class="divide-y divide-surface-container-high overflow-hidden rounded-xl bg-surface-container-low">
            <li
              v-for="item in group.items"
              :key="item.id"
              class="flex items-center justify-between gap-4 px-4 py-3"
            >
              <span class="text-label-md text-on-surface">{{ item.label }}</span>
              <span class="flex items-center gap-1">
                <kbd
                  v-for="(key, index) in item.keys"
                  :key="`${item.id}-${key}-${index}`"
                  class="shortcut-kbd"
                >
                  {{ displayKey(key) }}
                </kbd>
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Icon from "@/components/Icon.vue";
import { ALL_SHORTCUTS, type ShortcutDef } from "@/lib/keyboardShortcuts";
import { useAuthStore } from "@/stores/auth";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const auth = useAuthStore();

const groups = computed(() => {
  const map = new Map<string, ShortcutDef[]>();
  for (const item of ALL_SHORTCUTS) {
    if (item.id === "go-personnel" && !auth.isDepartmentHead) continue;
    const list = map.get(item.group) ?? [];
    list.push(item);
    map.set(item.group, list);
  }
  return [...map.entries()].map(([name, items]) => ({ name, items }));
});

function displayKey(key: string) {
  return key;
}
</script>
