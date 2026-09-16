# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

ParshCRM — a B2B lead-management CRM (leads, pipeline, calls, WhatsApp, tasks, employees, reports) built by ParshWebCraft as its own CRM SaaS product. Mobile-first installable PWA. It was originally scaffolded on the Emergent agent platform under the working name "Facets CRM AI" for a client called Facets Lifestyle; it has since been fully rebranded to ParshCRM/ParshWebCraft (product name, demo accounts, settings seed, PWA metadata, `localStorage` token key, storage path prefix) and several commits have stripped Emergent's injected branding (badge overlay, service-worker caching of Emergent assets) — do not reintroduce anything that fetches from `emergentagent.com`, injects a builder badge, or reuses the old "Facets"/`facetscrm.com` naming.

Stack: **FastAPI + Motor (async MongoDB)** backend, **React 19 + React Router 7 + Tailwind + shadcn/ui (Radix)** frontend, JWT auth, Claude (`claude-sonnet-4-6`) for AI call summaries via the `emergentintegrations` package and an Emergent "Universal Key".

## Commands

Backend (from `backend/`):
```
pip install -r requirements.txt
uvicorn server:app --reload --port 8001   # REACT_APP_BACKEND_URL in frontend/.env points here
pytest tests/                              # integration tests, see gotcha below
black . && isort . && flake8 && mypy .
```

Frontend (from `frontend/`, uses yarn per `packageManager` field):
```
yarn install
yarn start   # craco start, reads frontend/.env (PORT=3000, HOST=127.0.0.1)
yarn build   # craco build
yarn test    # craco test
```

Run a single backend test: `pytest tests/backend_test.py::TestLeads::test_list_leads`.

**Gotcha — backend tests hit a live HTTP server, not an in-process app.** `backend/tests/backend_test.py` and `test_iteration2.py` use `requests` against `BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lead-pipeline-pro-21.preview.emergentagent.com")`. If `REACT_APP_BACKEND_URL` isn't exported when running pytest, tests silently hit that remote preview URL instead of localhost. Export `REACT_APP_BACKEND_URL=http://127.0.0.1:8001` and have `uvicorn` running first.

Both `backend/.env` and `frontend/.env` are required and are gitignored (`*.env`); `backend/.env` holds `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `CORS_ORIGINS`. Demo login credentials (seeded on backend startup): `admin@parshwebcraft.in` / `sales@parshwebcraft.in` / `manager@parshwebcraft.in`, all password `password123`.

## Architecture

**Backend is a single flat FastAPI app** (`backend/server.py`, ~1000 lines, one `APIRouter` mounted at `/api`) — there's no per-resource module split. When adding an endpoint, follow the existing pattern: Pydantic `*In`/`*Patch` models near the top, route handlers grouped by resource with a `# --- Section ---` comment banner, `Depends(get_current_user)` or `Depends(require_role(...))` for auth. Mongo documents are plain dicts keyed by a `uuid4()` string `id` field (never Mongo's `ObjectId`); `_clean()`/`{"_id": 0}` projections strip `_id` before returning JSON. `db.users.create_index`, etc. run in the `startup` event, followed by `seed_all(db)` (from `seed.py`) which idempotently seeds ~25 employees, 100 Indian-business leads, tasks, calls, WhatsApp threads, and settings if collections are under a size threshold — safe to re-run, never wipes populated data above the threshold.

**Auth** (`backend/auth.py`): bcrypt password hashes, single long-lived (7-day) JWT with `sub`/`email`/`role` claims, no refresh flow. `get_current_user` does a lazy `from server import db` import to dodge a circular import — keep that pattern if you touch auth. `require_role("admin", "manager")` gates employee/settings/lead-delete mutations; most read endpoints (leads, tasks, calls) are **not** filtered by `assigned_to`, so any authenticated user currently sees all records regardless of role (granular per-rep RBAC is an open backlog item — check `memory/PRD.md` before assuming otherwise).

**Object storage** (`backend/storage.py`): documents uploaded on a lead go to Emergent's hosted object store (`https://integrations.emergentagent.com/objstore/api/v1/storage`), authenticated via `EMERGENT_LLM_KEY` → a session `storage_key` obtained from `/init` and cached in a module-level global; a 403 on `put_object`/`get_object` triggers one re-init-and-retry. This is an external dependency, not local disk or S3 — if `EMERGENT_LLM_KEY` is unset, storage silently disables (logs a warning) and uploads fail with 500.

**AI call summaries** (`backend/ai_summary.py`): calls `emergentintegrations.llm.chat.LlmChat` (an Emergent-provided package, **not** in `requirements.txt` and not on PyPI under that name — it's expected to be pre-installed in the deployed environment) configured for `anthropic` / `claude-sonnet-4-6`, prompted to return strict JSON (`summary`, `sentiment`, `lead_score`, `next_action`). Falls back to a deterministic non-LLM summary (`_fallback`) whenever the key is missing, the call errors, or the response isn't parseable JSON — so this path always returns something usable and never raises to the caller.

**Lead scoring** is duplicated: `_score()` in `server.py` and `_score_lead()` in `seed.py` implement the same rule-based heuristic (budget/source/status → 0-100) independently — if you change scoring rules, update both.

**Frontend** (`frontend/src`): routes are declared flat in `App.js` (React Router 7, no nested route files) behind a `Protected`/`PublicOnly` wrapper driven by `AuthProvider` (`lib/auth.jsx`). `lib/api.js` is the single axios instance: it attaches `Bearer <token>` from `localStorage["parshcrm_token"]` on every request and force-redirects to `/login` on any 401. Path alias `@/` → `src/` (configured in `craco.config.js` and `jsconfig.json`). UI primitives live in `src/components/ui` (shadcn/Radix, ~46 generated components — treat as vendored, prefer composing over heavily editing them) with `src/lib/utils.js` (`cn()` helper) and `src/lib/constants.js` (status/source enums, `formatINR`, `relTime`, `initials` — reuse these instead of re-deriving formatting logic per page). Layout (`components/Layout.jsx`) renders `Sidebar` (desktop, `lg:pl-64`) + `TopBar` + `BottomNav` (mobile, 5 items) simultaneously and toggles via Tailwind breakpoints rather than separate mobile/desktop components; the WhatsApp route is special-cased to drop the page padding/footer for a full-screen chat UI.

**Design system**: `design_guidelines.json` at repo root defines the canonical palette, type scale, and spacing rules (Swiss/high-contrast, navy `#0B1B3D` brand, `formatINR`-style ₹ currency formatting) — consult it before introducing new colors/spacing rather than eyeballing existing components.

**PWA**: `frontend/public/manifest.json` + `service-worker.js` + icons make the app installable; the service worker was recently reworked (`Clear cached service worker assets` commit) to stop serving stale/injected assets — bump the cache name/version in `service-worker.js` if you change what it precaches, or clients will keep serving old files.

`memory/PRD.md` tracks the product spec, full API surface, and a prioritized backlog (CSV import and document upload are already shipped despite being listed under "Backlog" near the top of that file — the "Added in v1.1" section further down is the accurate current state).
