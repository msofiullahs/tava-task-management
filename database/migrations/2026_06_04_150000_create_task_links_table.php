<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Directed links between tasks. The TaskLink model normalises ordering for
        // symmetric types (relates_to) so the unique constraint catches duplicates
        // regardless of which side was clicked first.
        Schema::create('task_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('target_task_id')->constrained('tasks')->cascadeOnDelete();
            $table->string('type', 32);
            $table->timestamps();

            $table->unique(['source_task_id', 'target_task_id', 'type'], 'task_links_unique');
            $table->index('target_task_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_links');
    }
};
