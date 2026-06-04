<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            // Hand-rolled morphs with a shorter type column. Default morphs() would
            // create VARCHAR(191) under our 191 cap, and a composite index on
            // (191 × 4 bytes utf8mb4) + bigint = 772 bytes — over InnoDB Antelope's
            // 767-byte limit on older Plesk MariaDB. 100 chars is plenty for class names.
            $table->string('tokenable_type', 100);
            $table->unsignedBigInteger('tokenable_id');
            $table->index(['tokenable_type', 'tokenable_id'], 'personal_access_tokens_tokenable_index');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
