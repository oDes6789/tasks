export type ShortcutAction =
  | { type: "navigate"; to: string }
  | { type: "focus-search" }
  | { type: "toggle-help" };

export type ShortcutDef = {
  id: string;
  keys: string[];
  label: string;
  group: "Điều hướng" | "Chung";
  action: ShortcutAction;
};

export const NAV_SHORTCUTS: ShortcutDef[] = [
  {
    id: "go-dashboard",
    keys: ["F1"],
    label: "Dashboard",
    group: "Điều hướng",
    action: { type: "navigate", to: "/" }
  },
  {
    id: "go-tasks",
    keys: ["F2"],
    label: "Mục tiêu tuần",
    group: "Điều hướng",
    action: { type: "navigate", to: "/tasks" }
  },
  {
    id: "go-personal",
    keys: ["F3"],
    label: "Mục tiêu cá nhân",
    group: "Điều hướng",
    action: { type: "navigate", to: "/muc-tieu-ca-nhan" }
  },
  {
    id: "go-day-plan",
    keys: ["F4"],
    label: "Kế hoạch ngày",
    group: "Điều hướng",
    action: { type: "navigate", to: "/ke-hoach" }
  },
  {
    id: "go-meetings",
    keys: ["F5"],
    label: "Lịch họp",
    group: "Điều hướng",
    action: { type: "navigate", to: "/lich-hop" }
  },
  {
    id: "go-saturday",
    keys: ["F6"],
    label: "Nghỉ Thứ 7",
    group: "Điều hướng",
    action: { type: "navigate", to: "/nghi-thu-7" }
  }
];

export const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  {
    id: "focus-search",
    keys: ["/"],
    label: "Tìm kiếm",
    group: "Chung",
    action: { type: "focus-search" }
  },
  {
    id: "toggle-help",
    keys: ["?"],
    label: "Hiện / ẩn phím tắt",
    group: "Chung",
    action: { type: "toggle-help" }
  }
];

export const ALL_SHORTCUTS: ShortcutDef[] = [...NAV_SHORTCUTS, ...GLOBAL_SHORTCUTS];

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return Boolean(target.closest("[contenteditable='true'], [role='textbox']"));
}
