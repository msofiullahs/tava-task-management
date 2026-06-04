<?php

namespace App\Policies;

use App\Models\Comment;
use App\Models\Task;
use App\Models\User;

class CommentPolicy
{
    /** Everyone — including Viewers — can comment (spec §6). They just need access to the task. */
    public function viewAny(User $user, Task $task): bool
    {
        return app(TaskPolicy::class)->view($user, $task);
    }

    public function create(User $user, Task $task): bool
    {
        return app(TaskPolicy::class)->view($user, $task);
    }

    /** Only the author or an admin can delete a comment. Members can't delete each other's. */
    public function delete(User $user, Comment $comment): bool
    {
        return $user->isAdmin() || $comment->user_id === $user->id;
    }
}
