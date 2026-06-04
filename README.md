# Tava

A focused, ClickUp-style task manager. Self-hosted, single-tenant. Laravel API + React SPA in one repo.

Projects → Tasks, with three views (List, Board, Calendar), custom per-project statuses, comments, role-based permissions, and light/dark theme. See [tava-build-spec.md](tava-build-spec.md) for the full v1 spec.

## Install (one command)

You need Docker. Then:

```bash
cp .env.example .env
# Edit .env — set APP_URL and DB_PASSWORD. Everything else has safe defaults.
docker compose up -d
```

Open the URL in your browser. On first visit you're sent to the setup wizard — create your admin account (tick "Add a sample project" to see how things work). After that, everything — adding people, creating projects, editing statuses, resetting passwords — happens in the browser.

### What to set in `.env`

- `APP_URL` — the URL you'll visit in the browser (e.g. `http://tava.example.com`)
- `APP_PORT` — host port to expose (default `8080`)
- `DB_PASSWORD`, `DB_ROOT_PASSWORD` — pick strong values before going live
- `SANCTUM_STATEFUL_DOMAINS` — add your `APP_URL`'s host:port (cookie auth requires this)

## Adding teammates

Email is intentionally out of scope so Tava works on a box with no mail server.

1. Sign in as Admin → **People** → **Add person**.
2. Tava generates a temporary password. Copy it and send it to your teammate (Slack, in person, whatever).
3. On their first sign-in they're prompted to set their own password.

Three roles: **Admin** (everything), **Member** (create/edit tasks + statuses), **Viewer** (sees only assigned tasks, can comment).

## Local development (without Docker)

```bash
composer install
npm install
cp .env.example .env
# Point DB_HOST / DB_USERNAME / DB_PASSWORD at a local MySQL/MariaDB.
# Sqlite works too if you just want to poke at the app — set DB_CONNECTION=sqlite.
php artisan key:generate
php artisan migrate

# Two terminals:
php artisan serve            # API + SPA shell on http://localhost:8000
npm run dev                  # Vite dev server (HMR)
```

## Deploying to Plesk (older MariaDB)

Tava is built to drop onto Plesk-managed MariaDB without manual schema tweaks:

- **VARCHAR is capped at 191 chars** via `Schema::defaultStringLength(191)` in
  [app/Providers/AppServiceProvider.php](app/Providers/AppServiceProvider.php).
  This keeps every indexed string column under InnoDB's 767-byte row-format limit
  (utf8mb4 × 191 = 764 bytes), which is what bites you on older Plesk installs
  still on the Antelope file format.
- **No JSON columns anywhere in the schema.** All free-form payloads use
  `text`/`longText`/`mediumText` (cache values, job payloads, Sanctum abilities),
  so the schema deploys on MariaDB versions older than 10.2.7 that lack JSON
  support — and on any install where JSON strict mode is misconfigured.

Just point `.env`'s `DB_HOST` / `DB_USERNAME` / `DB_DATABASE` / `DB_PASSWORD` at
the Plesk database and run `php artisan migrate`.

## What's included

- Laravel 13 + Sanctum (SPA cookie auth)
- React 18 + TypeScript + Vite
- TanStack Query v5 for server state
- Tailwind v4 with class-strategy dark mode (light / dark / system)
- @dnd-kit Kanban drag-and-drop with optimistic updates
- LexoRank for column/card ordering (no sibling renumbering)
- Soft-delete + 7s "Undo" toast on every task delete
- Single Docker image: nginx + PHP-FPM, migrations run on boot

## What's not included (v1)

Multi-tenancy, real-time/WebSockets, custom fields, Gantt, automations, file attachments, email/SMTP, mobile app. See spec §12.
