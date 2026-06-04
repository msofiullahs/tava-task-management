# Tava

A focused, ClickUp-style task manager. Self-hosted, single-tenant. Laravel API + React SPA in one repo.

Projects → Tasks, with three views (List, Board, Calendar), custom per-project statuses, comments, role-based permissions, and light/dark theme.

## Test accounts

Run `php artisan migrate:fresh --seed` to populate the database with five users
covering every role. Sign in at `/login`:

| Email | Password | Role |
|---|---|---|
| `alex@lumendgital.id` | `AdminLumen!26` | Admin |
| `sam@lumendgital.id` | `SamRivera26!` | Member |
| `jordan@lumendgital.id` | `JordanLee26!` | Member |
| `maya@lumendgital.id` | `MayaSingh26!` | Member · forced password change on first sign-in |
| `chris@lumendgital.id` | `ChrisView26!` | Viewer |

Along with the accounts you also get 6 projects (2 of them restricted to specific
members), ~50 tasks across every status / priority / due-date variant, sample
subtasks, task links, attachments, and 3 pending password-reset requests — enough
to exercise every view and role-scoped flow.

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

- **PHP 8.3 compatible** — the Composer lock file pins Symfony to v7.4.x via a
  `platform.php = 8.3.0` constraint in [composer.json](composer.json). `composer
  install --no-dev --optimize-autoloader` on Plesk's PHP 8.3 just works.
- **VARCHAR is capped at 191 chars** via `Schema::defaultStringLength(191)` in
  [app/Providers/AppServiceProvider.php](app/Providers/AppServiceProvider.php).
  This keeps every indexed string column under InnoDB's 767-byte row-format limit
  (utf8mb4 × 191 = 764 bytes), which is what bites you on older Plesk installs
  still on the Antelope file format.
- **No JSON columns anywhere in the schema.** All free-form payloads use
  `text`/`longText`/`mediumText` (cache values, job payloads, Sanctum abilities),
  so the schema deploys on MariaDB versions older than 10.2.7 that lack JSON
  support — and on any install where JSON strict mode is misconfigured.

### Deploy steps

1. **Build the frontend locally before pushing** — `public/build/` is *committed
   to the repo* on purpose (Plesk shared hosting typically can't run `npm`).
   On your Mac, before each `git push`:
   ```bash
   npm run build
   git add public/build && git commit -m "Rebuild assets"
   git push
   ```
   Vite empties `public/build/` on every build, so stale chunks don't pile up
   in git history. If you forget this step you'll see
   `Illuminate\Foundation\VitemanifestNotFoundException` on the home page.
2. On the server: `git pull && composer install --no-dev --optimize-autoloader`.
3. `cp .env.example .env` (if not already present) and edit:
   - `APP_URL` — your full HTTPS URL (`https://your-domain.example`)
   - `APP_KEY` — generate with `php artisan key:generate`
   - `DB_HOST=localhost` — Plesk runs MariaDB on the same machine. **Do not
     leave it as `db`** — that's the docker-compose service name and won't
     resolve here, which is the cause of `getaddrinfo for db failed` errors.
   - `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` — copy verbatim from the
     **Domains → your domain → Databases** panel in Plesk (including any
     `xxxxx_` prefix Plesk adds).
   - `SANCTUM_STATEFUL_DOMAINS` — set to your `APP_URL`'s host (e.g.
     `your-domain.example`); cookie auth refuses requests from any other origin.
   - `SESSION_SECURE_COOKIE=true` if you're serving over HTTPS (you should).
4. `php artisan config:clear && php artisan migrate --force`
5. Point the Plesk document root at `public/` (Plesk → Hosting Settings →
   Document root).

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
