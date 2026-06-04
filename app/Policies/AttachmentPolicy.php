<?php

namespace App\Policies;

use App\Models\Attachment;
use App\Models\Comment;
use App\Models\Task;
use App\Models\User;

class AttachmentPolicy
{
    /** Anyone who can see the parent can view its attachments. */
    public function view(User $user, Attachment $attachment): bool
    {
        $parent = $attachment->attachable;

        if ($parent instanceof Task) {
            return app(TaskPolicy::class)->view($user, $parent);
        }
        if ($parent instanceof Comment) {
            return app(TaskPolicy::class)->view($user, $parent->task);
        }

        return false;
    }

    /** Files page is admin/member only — viewers don't get a global browser. */
    public function viewAny(User $user): bool
    {
        return $user->canEditTasks();
    }

    /** Uploader or admin can delete. */
    public function delete(User $user, Attachment $attachment): bool
    {
        return $user->isAdmin() || $attachment->user_id === $user->id;
    }
}
