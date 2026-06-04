#!/bin/sh
# Tava — container entrypoint.
# Spec §3: a single command should boot a working instance with migrations auto-run.
set -e

cd /var/www/html

# Make sure a .env exists. Installer just needs to set APP_URL + DB password.
if [ ! -f .env ]; then
    cp .env.example .env
fi

# Generate an APP_KEY on first boot — keeps installs from sharing the same secret.
if ! grep -q '^APP_KEY=base64:' .env; then
    php artisan key:generate --force
fi

# Wait for the database when it's an external service (MySQL/Postgres).
DB_CONNECTION="${DB_CONNECTION:-mysql}"
if [ "$DB_CONNECTION" != "sqlite" ]; then
    : "${DB_HOST:=db}"
    : "${DB_PORT:=3306}"
    echo "Waiting for $DB_CONNECTION at $DB_HOST:$DB_PORT…"
    for i in $(seq 1 60); do
        if php -r "exit(@fsockopen('$DB_HOST', $DB_PORT) ? 0 : 1);" 2>/dev/null; then
            echo "Database is reachable."
            break
        fi
        sleep 1
    done
fi

# Always run migrations — additive only, safe on subsequent boots.
php artisan migrate --force --no-interaction
php artisan config:cache
php artisan route:cache
php artisan view:cache

chown -R www-data:www-data storage bootstrap/cache

exec "$@"
