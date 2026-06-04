<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\TaskLink;
use App\Models\User;

class TaskLinkPolicy
{
    /** Anyone with view access on a task can see its links. */
    public function viewAny(User $user, Task $task): bool
    {
        return app(TaskPolicy::class)->view($user, $task);
    }

    /** Creating a link requires edit access on the source task and view access on the target. */
    public function create(User $user, Task $source, Task $target): bool
    {
        return $user->canEditTasks()
            && app(TaskPolicy::class)->view($user, $source)
            && app(TaskPolicy::class)->view($user, $target);
    }

    /** Either side of the link is enough to remove it — the user already had access to see it. */
    public function delete(User $user, TaskLink $link): bool
    {
        if (! $user->canEditTasks()) {
            return false;
        }
        $source = $link->sourceTask;
        $target = $link->targetTask;

        return ($source && app(TaskPolicy::class)->view($user, $source))
            || ($target && app(TaskPolicy::class)->view($user, $target));
    }
}
