import { onMounted, onUnmounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import {
  ALL_SHORTCUTS,
  isTypingTarget,
  type ShortcutAction
} from "@/lib/keyboardShortcuts";
import { useAuthStore } from "@/stores/auth";

function normalizeKey(key: string) {
  return key.length === 1 ? key.toLowerCase() : key.toLowerCase();
}

export function useAppKeyboardShortcuts(helpOpen: Ref<boolean>) {
  const router = useRouter();
  const auth = useAuthStore();

  function runAction(action: ShortcutAction) {
    switch (action.type) {
      case "navigate":
        if (action.to === "/nhan-su" && !auth.isDepartmentHead) return;
        void router.push(action.to);
        break;
      case "focus-search": {
        const input = document.getElementById("app-search") as HTMLInputElement | null;
        input?.focus();
        input?.select();
        break;
      }
      case "toggle-help":
        helpOpen.value = !helpOpen.value;
        break;
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "Escape") {
      if (helpOpen.value) {
        event.preventDefault();
        helpOpen.value = false;
      }
      return;
    }

    const key = normalizeKey(event.key);
    const isFunctionKey = /^f\d{1,2}$/.test(key);
    const typing = isTypingTarget(event.target);

    // Phím F* luôn dùng được; phím chữ chỉ khi không đang gõ
    if (typing && !isFunctionKey) return;

    const match = ALL_SHORTCUTS.find(
      (s) => s.keys.length === 1 && normalizeKey(s.keys[0]) === key
    );
    if (!match) return;
    if (match.id === "go-personnel" && !auth.isDepartmentHead) return;

    // Khi bảng trợ giúp đang mở, chỉ cho phép ? để đóng
    if (helpOpen.value && match.action.type !== "toggle-help") return;

    event.preventDefault();
    runAction(match.action);
  }

  onMounted(() => window.addEventListener("keydown", onKeyDown));
  onUnmounted(() => window.removeEventListener("keydown", onKeyDown));
}
