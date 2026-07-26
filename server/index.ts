import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createSessionToken, verifySessionToken } from "./sessionToken";
import {
  deleteUserById,
  getUserById,
  isAppUserDepartmentHead,
  canEditSaturdayLeaveFor,
  canManagePersonRecord,
  isCreatedByDepartmentHead,
  listPublicUsers,
  loadUsersFromDb,
  toPublicUser,
  updateUserLeaveSettings,
  upsertUserFromEdutalk,
  type EdutalkUserInput
} from "./users";
import { migrate } from "./migrate";
import { ensureDatabase } from "./ensureDatabase";
import { createWeeklyTask, deleteWeeklyTask, getTaskBoard, updateWeeklyTask } from "./tasksRepo";
import {
  createPersonalGoal,
  deletePersonalGoal,
  getPersonalGoalsBoard,
  getPersonalGoalById,
  updatePersonalGoal
} from "./personalGoalsRepo";
import {
  createDayPlan,
  deleteDayPlan,
  getDayPlanBoard,
  reorderDayPlans,
  updateDayPlan
} from "./dayPlansRepo";
import {
  createMeeting,
  deleteMeeting,
  listMeetings,
  updateMeeting
} from "./meetingsRepo";
import {
  clearSaturdayLeave,
  listSaturdayLeave,
  upsertSaturdayLeave
} from "./saturdayLeaveRepo";
import { getDashboardSummary } from "./dashboardRepo";
import {
  countUnreadNotices,
  listNoticesForUser,
  markAllNoticesRead,
  markNoticeRead,
  notifyPeopleByName
} from "./noticesRepo";
import { resolveWeekStart } from "../src/lib/week";
import { DEFAULT_MEETING_OWNER } from "../src/lib/meetings";
import { isLeaveBrand, type LeaveBrand } from "../src/lib/saturdayLeave";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

dotenv.config({ path: path.resolve(root, ".env") });
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: path.resolve(root, ".env.production"), override: true });
}

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_OAUTH_CLIENT_ID = "tochuc-giaovien";
const DEFAULT_OAUTH_CLIENT_SECRET = "cdc8a13d-facf-4a3d-8af8-0c9fd96f4c09";

function getBearerToken(req: express.Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

function getSessionUser(req: express.Request) {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = verifySessionToken(token);
  if (!payload) return null;
  return getUserById(payload.userId);
}

function getEdutalkApiBase(): string | null {
  const raw = process.env.EDUTALK_API_URL?.replace(/\/$/, "");
  if (!raw) return null;
  return raw.replace(/\/\/localhost\b/i, "//127.0.0.1");
}

function normalizeRedirectUri(uri: string): string {
  return uri.trim().replace(/\/$/, "");
}

function getOAuthRedirectUri(): string {
  return normalizeRedirectUri(
    process.env.OAUTH_REDIRECT_URI || "http://localhost:3000/dang-nhap/callback"
  );
}

async function verifyEdutalkToken(token: string): Promise<EdutalkUserInput | null> {
  const apiBase = getEdutalkApiBase();
  if (!apiBase) {
    console.warn("EDUTALK_API_URL is not configured.");
    return null;
  }

  try {
    const res = await fetch(`${apiBase}/adn/verify-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ token })
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { data?: EdutalkUserInput };
    return payload.data ?? null;
  } catch (err) {
    console.error("Edutalk token verification failed:", err);
    return null;
  }
}

async function exchangeEdutalkCode(
  code: string,
  redirectUri: string
): Promise<{
  token: string | null;
  user?: EdutalkUserInput;
  error?: string;
}> {
  const apiBase = getEdutalkApiBase();
  if (!apiBase) {
    return { token: null, error: "Chưa cấu hình EDUTALK_API_URL trên server." };
  }

  const clientId = process.env.OAUTH_CLIENT_ID || DEFAULT_OAUTH_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || DEFAULT_OAUTH_CLIENT_SECRET;
  const normalizedRedirectUri = normalizeRedirectUri(redirectUri);

  try {
    const res = await fetch(`${apiBase}/adn/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: normalizedRedirectUri
      })
    });
    const payload = (await res.json().catch(() => ({}))) as {
      data?: { token?: string; user?: EdutalkUserInput };
      message?: string;
    };

    if (!res.ok) {
      console.error("Edutalk OAuth token exchange failed:", res.status, payload, {
        client_id: clientId,
        redirect_uri: normalizedRedirectUri,
        api: `${apiBase}/adn/oauth/token`
      });
      return {
        token: null,
        error: payload.message ?? `Đổi mã OAuth thất bại (HTTP ${res.status}).`
      };
    }

    return {
      token: payload.data?.token ?? null,
      user: payload.data?.user,
      error: payload.data?.token ? undefined : "API không trả về token."
    };
  } catch (err) {
    console.error("Edutalk OAuth code exchange failed:", err);
    return { token: null, error: "Không kết nối được tới API Edutalk." };
  }
}

app.post("/api/auth/login/edutalk", async (req, res) => {
  const { token, code, redirect_uri: redirectUriSnake, redirectUri: redirectUriCamel } =
    req.body ?? {};
  const redirectUri = normalizeRedirectUri(
    typeof redirectUriSnake === "string"
      ? redirectUriSnake
      : typeof redirectUriCamel === "string"
        ? redirectUriCamel
        : getOAuthRedirectUri()
  );

  let edutalkToken = typeof token === "string" ? token : null;
  let edutalkUser: EdutalkUserInput | null = null;

  if (!edutalkToken && typeof code === "string") {
    const exchange = await exchangeEdutalkCode(code, redirectUri);
    if (!exchange.token) {
      return res.status(400).json({
        error: exchange.error ?? "Thiếu hoặc không hợp lệ thông tin đăng nhập Edutalk."
      });
    }
    edutalkToken = exchange.token;
    edutalkUser = exchange.user ?? null;
  }

  if (!edutalkToken) {
    return res.status(400).json({ error: "Thiếu hoặc không hợp lệ thông tin đăng nhập Edutalk." });
  }

  if (!edutalkUser) {
    edutalkUser = await verifyEdutalkToken(edutalkToken);
  }
  if (!edutalkUser?.id || !edutalkUser.name) {
    return res.status(401).json({ error: "Phiên đăng nhập Edutalk không hợp lệ hoặc đã hết hạn." });
  }

  try {
    const user = await upsertUserFromEdutalk({
      id: edutalkUser.id,
      name: edutalkUser.name,
      email: edutalkUser.email ?? "",
      employeeCode: edutalkUser.employeeCode,
      image: edutalkUser.image,
      parent_id: edutalkUser.parent_id,
      manager: edutalkUser.manager,
      account_type: edutalkUser.account_type,
      department: edutalkUser.department
    });
    const sessionToken = createSessionToken(user.id, SESSION_TTL_MS);
    res.json({ token: sessionToken, user: toPublicUser(user) });
  } catch (err) {
    console.error("Failed to upsert Edutalk user:", err);
    res.status(500).json({ error: "Không lưu được thông tin người dùng." });
  }
});

app.get("/api/auth/me", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Phiên đăng nhập không hợp lệ." });
  }
  res.json(toPublicUser(user));
});

app.post("/api/auth/logout", (_req, res) => {
  res.json({ success: true });
});

if (process.env.NODE_ENV !== "production") {
  app.post("/api/auth/login/dev", async (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name : "John Doe";
    const email = typeof req.body?.email === "string" ? req.body.email : "john@edutalk.edu.vn";
    try {
      const user = await upsertUserFromEdutalk({ id: 999001, name, email });
      const sessionToken = createSessionToken(user.id, SESSION_TTL_MS);
      res.json({ token: sessionToken, user: toPublicUser(user) });
    } catch (err) {
      console.error("Dev login failed:", err);
      res.status(500).json({ error: "Không tạo được phiên dev." });
    }
  });
}

app.get("/api/dashboard/summary", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const greetingName = user.name.split(" ").pop() || user.name;
    const summary = await getDashboardSummary(req.query.week, greetingName);
    res.json(summary);
  } catch (err) {
    console.error("Dashboard summary failed:", err);
    res.status(500).json({ error: "Không tải được tổng quan dashboard." });
  }
});

app.get("/api/notices", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? limitRaw : 30;
  const unreadOnly =
    req.query.unreadOnly === "1" ||
    req.query.unreadOnly === "true" ||
    req.query.unread === "1";

  try {
    const [items, unreadCount] = await Promise.all([
      listNoticesForUser(user.id, { limit, unreadOnly }),
      countUnreadNotices(user.id)
    ]);
    res.json({ items, unreadCount });
  } catch (err) {
    console.error("Failed to load notices:", err);
    res.status(500).json({ error: "Không tải được thông báo." });
  }
});

app.get("/api/notices/unread-count", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const unreadCount = await countUnreadNotices(user.id);
    res.json({ unreadCount });
  } catch (err) {
    console.error("Failed to count unread notices:", err);
    res.status(500).json({ error: "Không đếm được thông báo." });
  }
});

app.post("/api/notices/:id/read", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const notice = await markNoticeRead(user.id, id);
    if (!notice) {
      return res.status(404).json({ error: "Không tìm thấy thông báo." });
    }
    const unreadCount = await countUnreadNotices(user.id);
    res.json({ notice, unreadCount });
  } catch (err) {
    console.error("Failed to mark notice read:", err);
    res.status(500).json({ error: "Không đánh dấu đã đọc." });
  }
});

app.post("/api/notices/read-all", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const updated = await markAllNoticesRead(user.id);
    res.json({ updated, unreadCount: 0 });
  } catch (err) {
    console.error("Failed to mark all notices read:", err);
    res.status(500).json({ error: "Không đánh dấu tất cả đã đọc." });
  }
});

app.get("/api/tasks", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const board = await getTaskBoard(req.query.week);
    res.json(board);
  } catch (err) {
    console.error("Failed to load task board:", err);
    res.status(500).json({ error: "Không tải được mục tiêu tuần." });
  }
});

app.post("/api/tasks", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const categoryId = Number(req.body?.categoryId);
  if (!Number.isInteger(categoryId) || categoryId < 1 || categoryId > 8) {
    return res.status(400).json({ error: "categoryId không hợp lệ." });
  }

  const week = resolveWeekStart(req.body?.weekStart ?? req.query.week);

  try {
    const actorName = user.name || user.email || "";
    const task = await createWeeklyTask({
      weekStart: week.weekStart,
      categoryId,
      item: req.body?.item,
      objective: req.body?.objective,
      dod: req.body?.dod,
      pics: req.body?.pics,
      status: req.body?.status,
      kpi: req.body?.kpi,
      progress: req.body?.progress,
      progressNote: req.body?.progressNote,
      createdBy: actorName
    });
    const title = task.item?.trim() || "Mục tiêu tuần mới";
    await notifyPeopleByName({
      names: task.pics.map((p) => p.name),
      excludeUserId: user.id,
      excludeName: actorName,
      type: "task",
      title: `${actorName || "Hệ thống"} đã giao mục tiêu tuần`,
      body: title,
      link: "/tasks",
      actorName,
      meta: { taskId: task.id }
    }).catch((err) => console.error("Notice emit (create task) failed:", err));
    res.status(201).json({ task, weekStart: week.weekStart });
  } catch (err) {
    console.error("Failed to create weekly task:", err);
    res.status(500).json({ error: "Không tạo được mục tiêu." });
  }
});

app.patch("/api/tasks/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const actorName = user.name || user.email || "";
    const task = await updateWeeklyTask(id, {
      item: String(req.body?.item ?? ""),
      objective: String(req.body?.objective ?? ""),
      dod: String(req.body?.dod ?? ""),
      pics: Array.isArray(req.body?.pics) ? req.body.pics : [],
      status: String(req.body?.status ?? "pending"),
      kpi: String(req.body?.kpi ?? ""),
      progress: req.body?.progress == null ? null : Number(req.body.progress),
      progressNote: req.body?.progressNote == null ? null : String(req.body.progressNote)
    });
    if (!task) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu." });
    }
    const title = task.item?.trim() || "Mục tiêu tuần";
    await notifyPeopleByName({
      names: task.pics.map((p) => p.name),
      excludeUserId: user.id,
      excludeName: actorName,
      type: "task",
      title: `${actorName || "Hệ thống"} đã cập nhật mục tiêu tuần`,
      body: title,
      link: "/tasks",
      actorName,
      meta: { taskId: task.id }
    }).catch((err) => console.error("Notice emit (update task) failed:", err));
    res.json({ task });
  } catch (err) {
    console.error("Failed to update weekly task:", err);
    res.status(500).json({ error: "Không lưu được mục tiêu." });
  }
});

app.delete("/api/tasks/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const ok = await deleteWeeklyTask(id);
    if (!ok) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete weekly task:", err);
    res.status(500).json({ error: "Không xóa được mục tiêu." });
  }
});

app.get("/api/personal-goals", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const board = await getPersonalGoalsBoard(req.query.week);
    if (!isAppUserDepartmentHead(user)) {
      const mine = user.name || "";
      board.rows = board.rows.filter((row) => canManagePersonRecord(user, row.personName));
      board.personnel = board.personnel.filter((p) => canManagePersonRecord(user, p.name));
      if (mine && board.personnel.length === 0) {
        board.personnel = [{ name: mine, avatar: user.avatarUrl ?? null }];
      }
    }
    res.json(board);
  } catch (err) {
    console.error("Failed to load personal goals:", err);
    res.status(500).json({ error: "Không tải được mục tiêu cá nhân." });
  }
});

app.post("/api/personal-goals", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const week = resolveWeekStart(req.body?.weekStart ?? req.query.week);
  let personName = String(req.body?.personName ?? "").trim();
  let personAvatar =
    req.body?.personAvatar == null ? null : String(req.body.personAvatar);

  if (!isAppUserDepartmentHead(user)) {
    personName = user.name || "";
    personAvatar = user.avatarUrl ?? null;
    if (!personName) {
      return res.status(400).json({ error: "Không xác định được nhân sự đăng nhập." });
    }
  }

  try {
    const actorName = user.name || user.email || "";
    const row = await createPersonalGoal({
      weekStart: week.weekStart,
      personName,
      personAvatar,
      goals: req.body?.goals,
      status: req.body?.status,
      progress: req.body?.progress,
      nextFocus: req.body?.nextFocus,
      createdBy: actorName
    });
    await notifyPeopleByName({
      names: [personName],
      excludeUserId: user.id,
      excludeName: actorName,
      type: "goal",
      title: `${actorName || "Hệ thống"} đã tạo mục tiêu cá nhân`,
      body: String(row.goals ?? "").trim().slice(0, 200) || "Mục tiêu cá nhân mới",
      link: "/muc-tieu-ca-nhan",
      actorName,
      meta: { goalId: row.id }
    }).catch((err) => console.error("Notice emit (create goal) failed:", err));
    res.status(201).json({ row, weekStart: week.weekStart });
  } catch (err) {
    console.error("Failed to create personal goal:", err);
    res.status(500).json({ error: "Không tạo được mục tiêu cá nhân." });
  }
});

app.patch("/api/personal-goals/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const existing = await getPersonalGoalById(id);
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu cá nhân." });
    }
    if (!canManagePersonRecord(user, existing.personName)) {
      return res.status(403).json({ error: "Chỉ được sửa mục tiêu của chính mình." });
    }

    let personName = String(req.body?.personName ?? "");
    let personAvatar =
      req.body?.personAvatar == null ? null : String(req.body.personAvatar);

    if (!isAppUserDepartmentHead(user)) {
      personName = existing.personName;
      personAvatar = existing.personAvatar;
    }

    const actorName = user.name || user.email || "";
    const row = await updatePersonalGoal(id, {
      personName,
      personAvatar,
      goals: String(req.body?.goals ?? ""),
      status: String(req.body?.status ?? "pending"),
      progress: String(req.body?.progress ?? ""),
      nextFocus: String(req.body?.nextFocus ?? "")
    });
    if (!row) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu cá nhân." });
    }
    await notifyPeopleByName({
      names: [row.personName],
      excludeUserId: user.id,
      excludeName: actorName,
      type: "goal",
      title: `${actorName || "Hệ thống"} đã cập nhật mục tiêu cá nhân`,
      body: String(row.goals ?? "").trim().slice(0, 200) || "Mục tiêu cá nhân",
      link: "/muc-tieu-ca-nhan",
      actorName,
      meta: { goalId: row.id }
    }).catch((err) => console.error("Notice emit (update goal) failed:", err));
    res.json({ row });
  } catch (err) {
    console.error("Failed to update personal goal:", err);
    res.status(500).json({ error: "Không lưu được mục tiêu cá nhân." });
  }
});

app.delete("/api/personal-goals/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const existing = await getPersonalGoalById(id);
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu cá nhân." });
    }
    if (!canManagePersonRecord(user, existing.personName)) {
      return res.status(403).json({ error: "Chỉ được xóa mục tiêu của chính mình." });
    }
    if (isCreatedByDepartmentHead(existing.createdBy)) {
      return res.status(403).json({
        error: "Không thể xóa mục tiêu do Trưởng phòng tạo."
      });
    }

    const ok = await deletePersonalGoal(id);
    if (!ok) {
      return res.status(404).json({ error: "Không tìm thấy mục tiêu cá nhân." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete personal goal:", err);
    res.status(500).json({ error: "Không xóa được mục tiêu cá nhân." });
  }
});

app.get("/api/day-plans", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const person = String(req.query.person ?? "").trim();
  if (!person) {
    return res.status(400).json({ error: "Thiếu tên nhân sự." });
  }

  try {
    const board = await getDayPlanBoard(req.query.week, person);
    res.json(board);
  } catch (err) {
    console.error("Failed to load day plans:", err);
    res.status(500).json({ error: "Không tải được kế hoạch ngày." });
  }
});

app.post("/api/day-plans", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const week = resolveWeekStart(req.body?.weekStart ?? req.query.week);
  const personName = String(req.body?.personName ?? "").trim();
  const planDate = String(req.body?.planDate ?? "").trim();

  if (!personName || !planDate) {
    return res.status(400).json({ error: "Thiếu nhân sự hoặc ngày." });
  }

  try {
    const item = await createDayPlan({
      weekStart: week.weekStart,
      personName,
      planDate,
      endDate: req.body?.endDate,
      title: req.body?.title,
      notes: req.body?.notes,
      startMinute: req.body?.startMinute,
      endMinute: req.body?.endMinute,
      sourceType: req.body?.sourceType,
      sourceKey: req.body?.sourceKey,
      status: req.body?.status,
      sortOrder: req.body?.sortOrder,
      reminderEnabled: req.body?.reminderEnabled,
      reminderMinutesBefore: req.body?.reminderMinutesBefore,
      createdBy: user.name || user.email || ""
    });
    res.status(201).json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "DATE_OUT_OF_WEEK") {
      return res.status(400).json({ error: "Ngày không thuộc tuần đang chọn." });
    }
    console.error("Failed to create day plan:", err);
    res.status(500).json({ error: "Không tạo được mục trong kế hoạch." });
  }
});

app.patch("/api/day-plans/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const item = await updateDayPlan(id, {
      planDate: req.body?.planDate,
      endDate: req.body?.endDate,
      title: req.body?.title,
      notes: req.body?.notes,
      startMinute: req.body?.startMinute,
      endMinute: req.body?.endMinute,
      status: req.body?.status,
      sortOrder: req.body?.sortOrder,
      reminderEnabled: req.body?.reminderEnabled,
      reminderMinutesBefore: req.body?.reminderMinutesBefore
    });
    if (!item) {
      return res.status(404).json({ error: "Không tìm thấy mục kế hoạch." });
    }
    res.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "DATE_OUT_OF_WEEK") {
      return res.status(400).json({ error: "Ngày không thuộc tuần đang chọn." });
    }
    console.error("Failed to update day plan:", err);
    res.status(500).json({ error: "Không lưu được mục kế hoạch." });
  }
});

app.post("/api/day-plans/reorder", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const personName = String(req.body?.personName ?? "").trim();
  const week = resolveWeekStart(req.body?.weekStart ?? req.query.week);
  const orderedIds = Array.isArray(req.body?.orderedIds)
    ? req.body.orderedIds.map((v: unknown) => Number(v))
    : [];

  if (!personName) {
    return res.status(400).json({ error: "Thiếu nhân sự." });
  }

  try {
    const items = await reorderDayPlans(personName, week.weekStart, orderedIds);
    res.json({ items });
  } catch (err) {
    console.error("Failed to reorder day plans:", err);
    res.status(500).json({ error: "Không sắp xếp được kế hoạch." });
  }
});

app.delete("/api/day-plans/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const ok = await deleteDayPlan(id);
    if (!ok) {
      return res.status(404).json({ error: "Không tìm thấy mục kế hoạch." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete day plan:", err);
    res.status(500).json({ error: "Không xóa được mục kế hoạch." });
  }
});

app.get("/api/meetings", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const board = await listMeetings(
      req.query.owner ?? DEFAULT_MEETING_OWNER,
      req.query.week
    );
    res.json(board);
  } catch (err) {
    console.error("Failed to load meetings:", err);
    res.status(500).json({ error: "Không tải được lịch họp." });
  }
});

app.post("/api/meetings", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const item = await createMeeting({
      ownerKey: req.body?.ownerKey,
      weekStart: req.body?.weekStart,
      weekday: req.body?.weekday,
      startMin: req.body?.startMin,
      endMin: req.body?.endMin,
      title: req.body?.title,
      attendees: req.body?.attendees,
      location: req.body?.location,
      note: req.body?.note,
      isBlock: req.body?.isBlock
    });
    res.status(201).json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_WEEKDAY") {
      return res.status(400).json({ error: "Thứ không hợp lệ." });
    }
    console.error("Failed to create meeting:", err);
    res.status(500).json({ error: "Không tạo được lịch họp." });
  }
});

app.patch("/api/meetings/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const item = await updateMeeting(id, {
      weekStart: req.body?.weekStart,
      weekday: req.body?.weekday,
      startMin: req.body?.startMin,
      endMin: req.body?.endMin,
      title: req.body?.title,
      attendees: req.body?.attendees,
      location: req.body?.location,
      note: req.body?.note,
      isBlock: req.body?.isBlock
    });
    if (!item) {
      return res.status(404).json({ error: "Không tìm thấy lịch họp." });
    }
    res.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_WEEKDAY") {
      return res.status(400).json({ error: "Thứ không hợp lệ." });
    }
    console.error("Failed to update meeting:", err);
    res.status(500).json({ error: "Không lưu được lịch họp." });
  }
});

app.delete("/api/meetings/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "id không hợp lệ." });
  }

  try {
    const ok = await deleteMeeting(id);
    if (!ok) {
      return res.status(404).json({ error: "Không tìm thấy lịch họp." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete meeting:", err);
    res.status(500).json({ error: "Không xóa được lịch họp." });
  }
});

app.get("/api/users", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }
  if (!isAppUserDepartmentHead(user)) {
    return res.status(403).json({ error: "Chỉ Trưởng phòng được xem quản lý nhân sự." });
  }

  try {
    res.json({ items: listPublicUsers() });
  } catch (err) {
    console.error("Failed to load users:", err);
    res.status(500).json({ error: "Không tải được danh sách người dùng." });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }
  if (!isAppUserDepartmentHead(user)) {
    return res.status(403).json({ error: "Chỉ Trưởng phòng được chỉnh sửa." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }

  const body = (req.body ?? {}) as {
    leaveBrand?: unknown;
    saturdayLeaveTracked?: unknown;
  };

  const patch: {
    leaveBrand?: LeaveBrand | null;
    saturdayLeaveTracked?: boolean;
  } = {};

  if ("leaveBrand" in body) {
    if (body.leaveBrand === null || body.leaveBrand === "") {
      patch.leaveBrand = null;
    } else if (isLeaveBrand(body.leaveBrand)) {
      patch.leaveBrand = body.leaveBrand;
    } else {
      return res.status(400).json({ error: "Brand không hợp lệ." });
    }
  }

  if ("saturdayLeaveTracked" in body) {
    if (typeof body.saturdayLeaveTracked !== "boolean") {
      return res.status(400).json({ error: "Giá trị theo dõi nghỉ Thứ 7 không hợp lệ." });
    }
    patch.saturdayLeaveTracked = body.saturdayLeaveTracked;
  }

  if (!("leaveBrand" in patch) && !("saturdayLeaveTracked" in patch)) {
    return res.status(400).json({ error: "Không có dữ liệu cập nhật." });
  }

  try {
    const updated = await updateUserLeaveSettings(id, patch);
    if (!updated) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }
    res.json({ item: toPublicUser(updated) });
  } catch (err) {
    console.error("Failed to update user leave settings:", err);
    res.status(500).json({ error: "Không cập nhật được tài khoản." });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }
  if (!isAppUserDepartmentHead(user)) {
    return res.status(403).json({ error: "Chỉ Trưởng phòng được xóa." });
  }

  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "ID không hợp lệ." });
  }
  if (id === user.id) {
    return res.status(400).json({ error: "Không thể xóa tài khoản đang đăng nhập." });
  }

  try {
    const ok = await deleteUserById(id);
    if (!ok) {
      return res.status(404).json({ error: "Không tìm thấy người dùng." });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete user:", err);
    res.status(500).json({ error: "Không xóa được người dùng." });
  }
});

app.get("/api/saturday-leave", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  try {
    const board = await listSaturdayLeave(req.query.month);
    res.json(board);
  } catch (err) {
    console.error("Failed to load saturday leave:", err);
    res.status(500).json({ error: "Không tải được lịch nghỉ Thứ 7." });
  }
});

app.put("/api/saturday-leave", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const personName = String(req.body?.personName ?? "").trim();
  if (!canEditSaturdayLeaveFor(user, personName)) {
    return res.status(403).json({
      error: "Chỉ được sửa đăng ký của chính mình. Trưởng phòng được sửa tất cả."
    });
  }

  try {
    const actorName = user.name || user.email || "unknown";
    const item = await upsertSaturdayLeave({
      workDate: req.body?.workDate,
      personName,
      status: req.body?.status,
      updatedBy: actorName
    });
    await notifyPeopleByName({
      names: [personName],
      excludeUserId: user.id,
      excludeName: actorName,
      type: "leave",
      title: `${actorName || "Hệ thống"} đã cập nhật nghỉ Thứ 7`,
      body: `${personName} · ${item.workDate} · ${item.status}`,
      link: "/nghi-thu-7",
      actorName,
      meta: { workDate: item.workDate, status: item.status }
    }).catch((err) => console.error("Notice emit (saturday leave) failed:", err));
    res.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INVALID_DATE") {
      return res.status(400).json({ error: "Ngày không hợp lệ." });
    }
    if (message === "NOT_SATURDAY") {
      return res.status(400).json({ error: "Chỉ đăng ký được ngày Thứ 7." });
    }
    if (message === "UNKNOWN_PERSON") {
      return res.status(400).json({ error: "Nhân sự không có trong danh sách." });
    }
    if (message === "INVALID_STATUS") {
      return res.status(400).json({ error: "Trạng thái không hợp lệ." });
    }
    console.error("Failed to save saturday leave:", err);
    res.status(500).json({ error: "Không lưu được lịch nghỉ Thứ 7." });
  }
});

app.delete("/api/saturday-leave", async (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const personName = String(req.body?.personName ?? req.query.personName ?? "").trim();
  if (!canEditSaturdayLeaveFor(user, personName)) {
    return res.status(403).json({
      error: "Chỉ được sửa đăng ký của chính mình. Trưởng phòng được sửa tất cả."
    });
  }

  try {
    const ok = await clearSaturdayLeave({
      workDate: req.body?.workDate ?? req.query.workDate,
      personName
    });
    res.json({ ok });
  } catch (err) {
    console.error("Failed to clear saturday leave:", err);
    res.status(500).json({ error: "Không xóa được đăng ký nghỉ." });
  }
});

async function start() {
  await ensureDatabase();
  await migrate();
  await loadUsersFromDb();
  console.log("PostgreSQL schema ready.");

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root,
      configFile: path.join(root, "vite.config.ts"),
      server: {
        middlewareMode: true,
        // Force re-optimize when cache is stale / missing chunks after restarts.
        force: process.env.VITE_FORCE_OPTIMIZE === "1"
      },
      appType: "custom"
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) {
        return res.status(404).json({ error: "API không tồn tại." });
      }
      try {
        const url = req.originalUrl;
        const template = await vite.transformIndexHtml(
          url,
          await (await import("fs/promises")).readFile(path.join(root, "index.html"), "utf-8")
        );
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err) {
        vite.ssrFixStacktrace(err as Error);
        next(err);
      }
    });
  } else {
    const dist = path.join(root, "dist", "client");
    app.use(express.static(dist));
    app.get("*", (req, res) => {
      if (req.originalUrl.startsWith("/api")) {
        return res.status(404).json({ error: "API không tồn tại." });
      }
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`TaskSpace running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
