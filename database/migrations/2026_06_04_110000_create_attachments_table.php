<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            // Hand-rolled polymorphic columns — see the personal_access_tokens migration
            // for why we don't use morphs() (Plesk Antelope 767-byte index limit).
            $table->string('attachable_type', 100);
            $table->unsignedBigInteger('attachable_id');
            $table->index(['attachable_type', 'attachable_id'], 'attachments_attachable_index');

            // Uploader — kept even after the attachable parent goes away so the Files page
            // can show "uploaded by ___" for orphaned uploads.
            $table->foreignId('user_id')->constrained();

            // Disk + path together identify the bytes on disk; original_name is what we
            // show in the UI (the on-disk filename is randomised to avoid collisions).
            $table->string('disk');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 150);
            $table->unsignedBigInteger('size_bytes');

            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
