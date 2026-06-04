<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return true; // Index applies per-user filtering.
    }

    public function view(User $user, Project $project): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // Restricted project: only the explicit members can see it.
        if ($project->isRestricted() && ! $project->members()->whereKey($user->id)->exists()) {
            return false;
        }

        if ($user->isViewer()) {
            // Viewer: must additionally have at least one assigned task in this project.
            return $project->tasks()
                ->whereHas('assignees', fn ($q) => $q->whereKey($user->id))
                ->exists();
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

    /** Only admins manage the member list. */
    public function manageMembers(User $user, Project $project): bool
    {
        return $user->isAdmin();
    }
}
