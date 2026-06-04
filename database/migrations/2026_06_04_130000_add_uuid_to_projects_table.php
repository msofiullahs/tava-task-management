<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        // 1) Add the column nullable so we can backfill existing rows safely.
        Schema::table('projects', function (Blueprint $table) {
            $table->uuid('uuid')->nullable()->after('id');
        });

        // 2) Backfill — any project missing a uuid gets a fresh one.
        DB::table('projects')->whereNull('uuid')->orderBy('id')->each(function ($row) {
            DB::table('projects')->where('id', $row->id)->update([
                'uuid' => (string) Str::uuid(),
            ]);
        });

        // 3) Make the column unique. Left nullable in the schema so this migration doesn't
        //    require doctrine/dbal for the not-null change — the Project model enforces
        //    "always present on create" via its boot() hook.
        Schema::table('projects', function (Blueprint $table) {
            $table->unique('uuid');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropUnique(['uuid']);
            $table->dropColumn('uuid');
        });
    }
};
