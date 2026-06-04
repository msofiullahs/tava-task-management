<?php

namespace App\Providers;

use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Cap default VARCHAR length so indexed string columns fit InnoDB's 767-byte limit
        // on older MySQL/MariaDB (Antelope row format, common on Plesk-managed installs).
        // 191 × 4 bytes (utf8mb4) = 764 bytes, just under the limit.
        // Newer MySQL 8 / MariaDB 10.2+ with DYNAMIC row format don't need this, but the
        // tighter default is harmless there and lets the same schema deploy anywhere.
        Schema::defaultStringLength(191);
    }
}
