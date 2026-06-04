<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "Forgot password" submissions. Email is intentionally out of scope (spec §12),
        // so this acts as a notification queue for admins: the user asks, an admin sees
        // it on the People page, resets the password via the existing flow, and shares
        // the new temp credential manually.
        Schema::create('password_reset_requests', function (Blueprint $table) {
            $table->id();
            $table->string('email');
            // user_id is nullable — we still record requests for unknown emails so a
            // typo doesn't silently disappear, but only matched ones become actionable.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('fulfilled_at')->nullable();
            $table->foreignId('fulfilled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['fulfilled_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_requests');
    }
};
