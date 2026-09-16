# ParshCRM — PRD

## Original problem statement
Build "ParshCRM", a complete production-grade SaaS CRM (inspired by Superfone, LeadSquared, HubSpot) for ParshWebCraft — Lead Management, AI-Assisted Calling, WhatsApp Communication, Follow-up Tracking, Sales Pipeline, Employee Management, Analytics Dashboard. Mobile-first PWA installable on Android/iOS/Desktop with bottom navigation for sales reps.

## Stack (deployed)
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn UI + Recharts + Phosphor Icons
- **Backend**: FastAPI + Motor (MongoDB async) + PyJWT + bcrypt + emergentintegrations
- **DB**: MongoDB (`parshcrm_local` db)
- **LLM**: Claude Sonnet (`claude-sonnet-4-6`) via Emergent Universal Key for AI call summaries

## User personas
1. **Admin** — full access, employee CRUD, settings
2. **Manager** — leads + employees, no delete admin
3. **Sales** — leads, calls, WhatsApp, tasks for own/assigned leads

## Test credentials
- admin@parshwebcraft.in / password123
- sales@parshwebcraft.in / password123
- manager@parshwebcraft.in / password123

## Implemented in v1 (Feb 2026)
- JWT auth (Bearer token in localStorage) + protected routes + role-aware UI
- Idempotent seed: 25 employees, 100 Indian-business leads, 50 tasks, 200 activities, 100 calls, 50 WhatsApp conversations, 8 notifications, company settings
- **Dashboard** — 8 KPIs + weekly leads line chart + lead sources pie + funnel + recent activity feed + employee performance table
- **Leads** — searchable/filterable table + drag-and-drop Kanban view; CSV export; New lead dialog; quick call/WhatsApp shortcuts; rule-based lead scoring
- **Lead detail** — tabs (Overview / Timeline / Calls / WhatsApp / Tasks) + right rail (score, stage, owner, source) + notes + delete
- **Pipeline** — full-width drag-and-drop board with budget totals per stage
- **Calls** — quick-dial deck + simulated dialer modal (dialing → ringing → connected → wrap-up) + AI summary generation (Claude) + call history with sentiment/score/next-action chips
- **WhatsApp** — two-pane WhatsApp-style chat UI with conversation list, message bubbles, quick-reply templates, unread badges, send/receive
- **Tasks** — list view + 14-day calendar view + new task dialog + priority badges + status toggle
- **Employees** — table with role badges, performance stats, add/delete (admin only)
- **Reports** — funnel chart, lead sources pie, weekly leads line, call outcomes bar, employee ranking, revenue table
- **Settings** — company info + integration placeholders (WhatsApp / Calling / OpenAI)
- **Notifications** — sheet drawer with unread badge
- **Global search** in top bar (debounced lead search)
- **Mobile/PWA**: manifest.json, service worker, install metadata, 192/512 icons, mobile bottom nav (5 items), responsive layout, WhatsApp full-screen on mobile

## Added in v1.1 (Feb 2026)
- **CSV bulk import** for leads — `POST /api/leads/import` (multipart) + Import dialog with sample CSV download, error preview, success toast
- **Documents tab** on lead detail — upload/list/download/soft-delete via Emergent Object Storage (`parshcrm/leads/{lead_id}/{uuid}.{ext}`), 15 MB cap, MIME-aware icons, signed `?auth=` download URLs for `<a>` tags
- **Per-employee dashboard** at `/employees/:id` — 8 KPI cards (won, lost, conversion, revenue, calls, connect rate, talk time, pending tasks), leads-by-status bar chart, recent activity feed, open-pipeline total, top-leads-by-score clickable list
- Employees table rows are now clickable → detail page
- Backend test suite expanded to 33 tests (all passing)

## Backlog (P1 / next iteration)
- CSV import for leads (parse + upsert)
- Document tab on lead detail (file upload)
- Push notification permission flow & demo trigger
- IndexedDB offline sync for leads/tasks
- Calendar full-month view for tasks
- Capacitor config for Android APK packaging
- Lead bulk-assign, bulk-status-change
- Real-time updates via WebSocket
- Per-employee dashboard view
- Email integration (Resend / SendGrid)
- Granular RBAC (sales sees only own leads)

## API surface (today)
- Auth: `POST /api/auth/login`, `GET /api/auth/me`
- Leads: `GET|POST|PUT|DELETE /api/leads`, `GET /api/leads/:id/timeline`
- Tasks: `GET|POST|PUT|DELETE /api/tasks`
- Calls: `GET|POST /api/calls`, `POST /api/calls/:id/ai-summary`, `POST /api/ai/summarize`
- WhatsApp: `GET /api/whatsapp/conversations`, `GET /api/whatsapp/messages?lead_id=`, `POST /api/whatsapp/send`
- Employees: `GET|POST|PUT|DELETE /api/employees`
- Notifications: `GET /api/notifications`, `POST /api/notifications/:id/read`
- Settings: `GET|PUT /api/settings`
- Dashboard/reports: `/api/dashboard/stats`, `/api/reports/{lead-sources, status-funnel, weekly-leads, employee-performance, recent-activities}`

## Next tasks (priority)
1. End-to-end test pass via testing subagent → fix any blockers
2. CSV import for leads (BulkImportDialog)
3. Push notification web-push subscription flow
4. IndexedDB offline read-cache for leads/tasks
5. Document upload (object storage integration)
