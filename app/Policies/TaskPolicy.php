<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Index endpoint filters viewers down to their assignments.
    }

    public function view(User $user, Task $task): bool
    {
        if ($user->isViewer()) {
            return $task->assignees()->whereKey($user->id)->exists();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->canEditTasks();
    }

    public function update(User $user, Task $task): bool
    {
        return $user->canEditTasks();
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->canEditTasks();
    }

    public function restore(User $user, Task $task): bool
    {
        return $user->canEditTasks();
    }
}
