<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('status_id')->constrained('statuses');
            // Self-reference for subtasks. Model allows it; v1 UI keeps it shallow.
            $table->foreignId('parent_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // urgent | high | normal | low — null = unset.
            $table->string('priority')->nullable();
            $table->date('due_date')->nullable();
            // LexoRank — order within a status column.
            $table->string('position')->index();
            $table->foreignId('created_by')->constrained('users');
            // Soft delete powers the "Task deleted — Undo" toast (§9.4).
            $table->softDeletes();
            $table->timestamps();

            $table->index(['project_id', 'status_id', 'position']);
            $table->index('due_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
