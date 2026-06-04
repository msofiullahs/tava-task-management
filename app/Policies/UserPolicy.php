<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, User $target): bool
    {
        return $user->isAdmin();
    }

    public function delete(User $user, User $target): bool
    {
        // Admin can remove anyone except themselves — preserves the "always one admin" guard
        // and avoids the awkward case of an admin deleting their own session mid-request.
        return $user->isAdmin() && $user->id !== $target->id;
    }

    public function resetPassword(User $user, User $target): bool
    {
        return $user->isAdmin();
    }
}
