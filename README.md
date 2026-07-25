# TaskSpace — Tổ chức giáo viên

Website quản lý công việc giáo viên (Vue 3 + Node.js), thiết kế theo Kindred Interface và login Edutalk giống ADN.

## Stack

- **Frontend:** Vue 3, Vue Router, Pinia, Vite, Tailwind CSS 4
- **Backend:** Express (Node.js), HMAC session token, PostgreSQL
- **Auth:** OAuth Edutalk (noibo authorize → callback → `/api/auth/login/edutalk`)

## Chạy local

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Mở http://localhost:3000

## Biến môi trường

Xem `.env.example`. Cần cấu hình:

- `DATABASE_URL` — PostgreSQL connection string
- `EDUTALK_API_URL` — API đổi code / verify token
- `OAUTH_CLIENT_ID` / `OAUTH_CLIENT_SECRET` — client đăng ký với Edutalk
- `VITE_NOIBO_URL` — cổng noibo authorize
- `SESSION_SECRET` — khóa ký phiên

## Cấu trúc chính

```
src/components/layout/   AppHeader, AppFooter, AppSidebar, AppLayout
src/pages/               Login, Callback, Dashboard, TaskBoard
server/                  Express + Edutalk OAuth + PostgreSQL
```
