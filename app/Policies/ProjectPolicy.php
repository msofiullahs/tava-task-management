<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Viewers see the home list; their per-task filtering happens in TaskPolicy.
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->isViewer()) {
            // Viewers only see projects where they're assigned at least one task (spec §6).
            return $project->tasks()->whereHas('assignees', fn ($q) => $q->whereKey($user->id))->exists();
        }

        return true;
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Project $project): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, Project $project): bool
    {
        return $user->isAdmin();
    }
}
