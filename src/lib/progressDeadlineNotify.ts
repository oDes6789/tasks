import { getDeadlineAt, getDeadlineUrgency, formatDeadlineNote, type DeadlineUrgency } from "./week";

const STORAGE_PREFIX = "tcgv_progress_dl_notify";

export type ProgressDeadlineMilestone = "soon" | "urgent" | "critical" | "overdue";

const MILESTONE_ORDER: ProgressDeadlineMilestone[] = ["soon", "urgent", "critical", "overdue"];

function storageKey(weekStart: string, milestone: ProgressDeadlineMilestone): string {
  return `${STORAGE_PREFIX}:${weekStart}:${milestone}`;
}

function wasFired(weekStart: string, milestone: ProgressDeadlineMilestone): boolean {
  try {
    return localStorage.getItem(storageKey(weekStart, milestone)) === "1";
  } catch {
    return false;
  }
}

function markFired(weekStart: string, milestone: ProgressDeadlineMilestone): void {
  try {
    localStorage.setItem(storageKey(weekStart, milestone), "1");
  } catch {
    /* ignore */
  }
}

export function urgencyToMilestone(urgency: DeadlineUrgency): ProgressDeadlineMilestone | null {
  if (urgency === "ok") return null;
  return urgency;
}

export { formatDeadlineNote as formatProgressDeadlineNote };

export function progressDeadlineMessage(
  milestone: ProgressDeadlineMilestone,
  deadline: Date
): { summary: string; detail: string } {
  const dd = String(deadline.getDate()).padStart(2, "0");
  const mm = String(deadline.getMonth() + 1).padStart(2, "0");
  const when = `12h ${dd}/${mm}`;

  switch (milestone) {
    case "soon":
      return {
        summary: "Sắp đến hạn nhập thành phẩm",
        detail: `Deadline ${when} — còn khoảng 2 ngày. Hãy cập nhật tiến độ / link thành phẩm.`
      };
    case "urgent":
      return {
        summary: "Còn dưới 24 giờ nhập thành phẩm",
        detail: `Deadline ${when}. Ưu tiên điền trạng thái, kết quả và link thành phẩm.`
      };
    case "critical":
      return {
        summary: "Gấp — dưới 3 giờ đến hạn thành phẩm",
        detail: `Deadline ${when}. Nhập thành phẩm ngay trước khi quá hạn.`
      };
    case "overdue":
      return {
        summary: "Đã quá hạn nhập thành phẩm",
        detail: `Đã qua ${when}. Cập nhật thành phẩm càng sớm càng tốt.`
      };
  }
}

export interface ProgressDeadlineNotifyOptions {
  weekStart: string;
  monday: Date;
  now?: Date;
  /** Skip notify when nothing left to fill (optional). Default: always notify. */
  shouldNotify?: boolean;
  onToast: (payload: { summary: string; detail: string; severity: "warn" | "error" }) => void;
}

/** Fire at most once per milestone per week (localStorage). */
export function maybeNotifyProgressDeadline(opts: ProgressDeadlineNotifyOptions): void {
  if (opts.shouldNotify === false) return;

  const now = opts.now ?? new Date();
  const deadline = getDeadlineAt(opts.monday);
  const urgency = getDeadlineUrgency(deadline, now);
  const current = urgencyToMilestone(urgency);
  if (!current) return;

  for (const milestone of MILESTONE_ORDER) {
    if (wasFired(opts.weekStart, milestone)) {
      if (milestone === current) break;
      continue;
    }

    const reached =
      milestone === current ||
      MILESTONE_ORDER.indexOf(milestone) < MILESTONE_ORDER.indexOf(current);

    if (!reached) break;

    markFired(opts.weekStart, milestone);
    const msg = progressDeadlineMessage(milestone, deadline);
    opts.onToast({
      summary: msg.summary,
      detail: msg.detail,
      severity: milestone === "overdue" || milestone === "critical" ? "error" : "warn"
    });

    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(msg.summary, {
          body: msg.detail,
          tag: `progress-dl-${opts.weekStart}-${milestone}`
        });
      } catch {
        /* ignore */
      }
    }

    if (milestone === current) break;
  }
}

export async function ensureProgressDeadlinePermission(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  try {
    await Notification.requestPermission();
  } catch {
    /* ignore */
  }
}
