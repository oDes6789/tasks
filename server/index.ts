import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createSessionToken, verifySessionToken } from "./sessionToken";
import { getUserById, toPublicUser, upsertUserFromEdutalk } from "./users";
import { resolveWeekStart } from "../src/lib/week";

dotenv.config();
if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production", override: true });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

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

async function verifyEdutalkToken(
  token: string
): Promise<{ id: number; name: string; email: string } | null> {
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
    const payload = (await res.json()) as { data?: { id: number; name: string; email: string } };
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
  user?: { id: number; name: string; email: string };
  error?: string;
}> {
  const apiBase = getEdutalkApiBase();
  if (!apiBase) {
    return { token: null, error: "Chưa cấu hình EDUTALK_API_URL trên server." };
  }

  const clientId = process.env.OAUTH_CLIENT_ID || "tochuc-giaovien";
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || "change-me";
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
      data?: { token?: string; user?: { id: number; name: string; email: string } };
      message?: string;
    };

    if (!res.ok) {
      console.error("Edutalk OAuth token exchange failed:", res.status, payload);
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
  let edutalkUser: { id: number; name: string; email: string } | null = null;

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
  if (!edutalkUser) {
    return res.status(401).json({ error: "Phiên đăng nhập Edutalk không hợp lệ hoặc đã hết hạn." });
  }

  const user = upsertUserFromEdutalk(edutalkUser);
  const sessionToken = createSessionToken(user.id, SESSION_TTL_MS);

  res.json({ token: sessionToken, user: toPublicUser(user) });
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
  app.post("/api/auth/login/dev", (req, res) => {
    const name = typeof req.body?.name === "string" ? req.body.name : "John Doe";
    const email = typeof req.body?.email === "string" ? req.body.email : "john@edutalk.edu.vn";
    const user = upsertUserFromEdutalk({ id: 999001, name, email });
    const sessionToken = createSessionToken(user.id, SESSION_TTL_MS);
    res.json({ token: sessionToken, user: toPublicUser(user) });
  });
}

app.get("/api/dashboard/summary", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  res.json({
    greetingName: user.name.split(" ").pop() || user.name,
    stats: {
      totalTasks: 42,
      completed: 28,
      inProgress: 10,
      overdue: 4
    },
    activities: [
      {
        id: 1,
        name: "Sarah Chen",
        action: "đã cập nhật",
        target: "Design System OKR",
        targetTone: "primary",
        time: "2 giờ trước",
        team: "Product Design Team",
        icon: "edit",
        iconBg: "primary",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCo9hCw9neJWcpfjSu_JKgEvXK7nuw9SL_s-Rr0eo1TIjdRYt6XEjf0ykaI-MiesLZVVewQVm9hIfI8XBGibRxvlKGuccOW-iLkpw4rmXBExsv1PpwkucpRAUAejj55ddow-U9Kat6itZi9koij7zMeRlYCdz1GHVqapjOn0nWrzsfq7gUOIE8KfxhLy4WaE3hCopghZ9Hi9HXtZIsrfKipu6SdfMoMPNXTUOZhbz1NASorwJBlFYjwKfGvDnV5A-ceyzFOMngy4dY"
      },
      {
        id: 2,
        name: "Marcus Thorne",
        action: "đã hoàn thành task",
        target: "API Documentation",
        targetTone: "secondary",
        time: "4 giờ trước",
        team: "Backend Infrastructure",
        icon: "check",
        iconBg: "secondary",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuA6JQvFMA8FHXeAZvG0z11m6kprFlMN4QswQRPSVreMd2wXQOhrUM5PWCjBLK4rqzLfBoXNqGLBz8_5hnO5YXkkVrCHa1RGiANY1iIZJRHCpRFaidKD1LsoHMxMq9PsYioPoZij-sqBO3UqNoR3A7zhGIBVCyqn2JBWn-Nsy5cUy4tuStgmx0egCgFqHW0NWrs12FDeGQaJun8KPCAx_DTRpieqsSzAJEy-ICR43QbflbnheZW2wi6haV1rnicyUWIFklhDWRgyBKI"
      },
      {
        id: 3,
        name: "Elena Rodriguez",
        action: "đã thêm 3 task mới vào",
        target: "Q4 Launch Planning",
        targetTone: "primary",
        time: "Hôm qua lúc 17:30",
        team: "Marketing",
        icon: "add",
        iconBg: "primary-container",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuBNgchBwr9N6odH3kFSNc_qWK3YQUvvk3cq-m62wSSU3UMT2DZ5KmfBfmNv3DbjAmSZ2gYqh7G06ydumBRw_IAz1jkuwKRNfE9nMuNch7442B07XttklrBTZPmFanRIvRwoWsfJcHBx4WAaY1cXd1apgulsmkGktjCPlOvarFrXttoWz26nBjATFYu4pQgEge_lDu2NomhOmjSlXU85jjan-g8a_OR35wV4ZzOnMzPfg9itwt-9kvLuElsVR8DqWQuD-_OJ6aQ5wJU"
      }
    ],
    team: [
      {
        id: 1,
        name: "David Kim",
        role: "Lead Developer",
        status: "online",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuCnP6fcpUGNHTik2VxWfc_wqip-_kadH7OKvYjBKXT7uxNHg0k6B_6YTtI_x2-fPv32lVslQqv10s_02TUxhlBrm0XyqHqsi9O-wc0M2xAunZdsRZpoHwtmTA0xtdxYILLMr37nhaEZ2m9o4-hRiyj64k3RPS-XO46Y_RKk3qaW-uAnVZpGFtnRMLRf5BzJc7z1F2iiLbwEk30Ta6_9G-epnG0FN6DCyX3uBiuprNxzAFEgi66j2O-65muv0Wp-DOPRZMi0JDlHI6c"
      },
      {
        id: 2,
        name: "Avery Smith",
        role: "UI Designer",
        status: "online",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAk8bzc9OoXaGWTJe2GH1DpEx0rHLuTY4aMgzR66mUIT0d5_BGTnOmvj2_21JC9SdbghCfE2qTvd4ks-rMPxdlGiMXdzwqJmexh5Tr5N-EfEeI22h5CDhcvqdKr3klZHrpidDB3XLUX_ZSti_Au_41I6cE3nzAUevWErRLyarUCMZtPxj2PzeoiNiv4uzJwq-rpcZ4CljnL0SYF3wNULQma9sqDcD_XeR-Hmjtau_6u7wU8O-snal_fXdwob-RrobUUhptAQVCbRh8"
      },
      {
        id: 3,
        name: "Julian Rossi",
        role: "Product Manager",
        status: "busy",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuAN8BW_lUd-r7YZfDuDmn72Tc3fwyPDMs-o5Dy4BJa7rC1q3DEXKdXXyqhfbeXSg9JQbn_S79FZvIJzFSF-ANXn4yDvl6vycAJPpNLNr_t7qV171fBVDG4y1RdLtI54zzF3HNDvzSzWCD_dELalabAkJlFWEfsD9fKXA33SBQygZTPyHreOo5o3OCTNzoLkX5zlTh92CIjci8o4avOEMHNdFw5AbNSYfvcG7g3-j3tAgi5tX2XGzilvvgDhbNcyprRYS9qKFhGuGlM"
      },
      {
        id: 4,
        name: "Lily Zhao",
        role: "Junior Dev",
        status: "offline",
        avatar:
          "https://lh3.googleusercontent.com/aida-public/AB6AXuA0rbbBJQKK9LgLwhpNhCb0_XjaoQCMNUtcpqjzuZdxL8yB8Oiro1LnNW9tmpUiQpEC-P5VYvS9nGLSbewOpcPl6yGdQ4Q2UyIUGSuw4GogoqdoDDldKofTjJ2aBzj47r8YlQq07-J2UQDF2p_I28-p7c-hDvtbRY2QxdILADMErXBFE_BEoklFjYgxjj7e4DF-TNLj2rUpyP18J9WPgrz2p99KaF3_3DNO9jgoIQw39sPvp_NeIvf5hosYEOWXGtA8Ry1tBRNpK6Q"
      }
    ],
    teamCapacity: 82
  });
});

const TASK_PERSONNEL = [
  { name: "Ms. Kim Bắc", avatar: null },
  { name: "Mr. Tiến Dũng", avatar: null },
  { name: "Ms. Thu Hà", avatar: null },
  { name: "Mr. Minh Quân", avatar: null },
  { name: "Ms. Lan Anh", avatar: null }
];

const TASK_GROUPS_SEED = [
  {
    id: 4,
    title: "4. TRIỂN KHAI MỚI",
    tasks: [
      {
        id: 1,
        item: "Quản Trị Thu Nhập",
        objective:
          "Hoàn thiện quy trình theo dõi thu nhập giảng viên theo tuần và chuẩn hóa báo cáo phòng.",
        dod: "1. File theo dõi cập nhật đủ cột\n2. Đối soát với kế toán xong\n3. Gửi báo cáo trước deadline",
        pics: [{ name: "Ms. Kim Bắc", avatar: null }],
        status: "pending",
        progress: null,
        progressNote: null
      },
      {
        id: 2,
        item: "Product Updates",
        objective:
          "Tổng hợp cập nhật sản phẩm nội bộ và phổ biến thay đổi cho đội ngũ giáo viên.",
        dod: "1. Slide/note cập nhật\n2. Share trong group phòng\n3. Thu feedback tuần này",
        pics: [{ name: "Mr. Tiến Dũng", avatar: null }],
        status: "pending",
        progress: null,
        progressNote: null
      }
    ]
  },
  {
    id: 5,
    title: "5. OKR MANAGEMENT",
    tasks: [
      {
        id: 3,
        item: "Theo dõi OKR",
        objective: "Review tiến độ OKR tuần của từng nhóm và ghi nhận blocker.",
        dod: "1. Checklist OKR đã review\n2. Ghi chú blocker rõ ràng\n3. Cập nhật board chung",
        pics: [
          { name: "Mr. Tiến Dũng", avatar: null },
          { name: "Ms. Kim Bắc", avatar: null }
        ],
        status: "done",
        progress: 100,
        progressNote: "Đã review và cập nhật board"
      },
      {
        id: 4,
        item: "Đánh giá giữa kỳ",
        objective: "Chuẩn bị khung đánh giá giữa kỳ và phân công PIC hỗ trợ từng nhóm.",
        dod: "1. Form đánh giá\n2. Lịch họp review\n3. Danh sách PIC hỗ trợ",
        pics: [{ name: "Mr. Tiến Dũng", avatar: null }],
        status: "in_progress",
        progress: 45,
        progressNote: "Đang soạn form đánh giá"
      }
    ]
  }
];

app.get("/api/tasks", (req, res) => {
  const user = getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: "Vui lòng đăng nhập." });
  }

  const week = resolveWeekStart(req.query.week);
  const currentWeekStart = resolveWeekStart(undefined).weekStart;
  // Seed data only for the current week; other weeks start empty.
  const groups =
    week.weekStart === currentWeekStart
      ? TASK_GROUPS_SEED
      : TASK_GROUPS_SEED.map((g) => ({ ...g, tasks: [] as typeof g.tasks }));

  res.json({
    meta: {
      department: "Phòng Tổ Chức Giáo Viên",
      weekStart: week.weekStart,
      weekLabel: week.weekLabel,
      deadlineNote: "Deadline: 12h thứ 6 hàng tuần"
    },
    personnel: TASK_PERSONNEL,
    groups
  });
});

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root,
      server: { middlewareMode: true },
      appType: "custom"
    });

    app.use(vite.middlewares);

    app.use("*", async (req, res, next) => {
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
    app.get("*", (_req, res) => {
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
