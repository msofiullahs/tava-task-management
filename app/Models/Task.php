<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable([
    'project_id', 'status_id', 'parent_id',
    'title', 'description', 'priority',
    'due_date', 'position', 'created_by',
])]
class Task extends Model
{
    /** @use HasFactory<\Database\Factories\TaskFactory> */
    use HasFactory, SoftDeletes;

    public const PRIORITIES = ['urgent', 'high', 'normal', 'low'];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
        ];
    }

    /** @return BelongsTo<Project, $this> */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** @return BelongsTo<Status, $this> */
    public function status(): BelongsTo
    {
        return $this->belongsTo(Status::class);
    }

    /** @return BelongsTo<Task, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'parent_id');
    }

    /** @return HasMany<Task, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(Task::class, 'parent_id');
    }

    /** @return BelongsTo<User, $this> */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** @return BelongsToMany<User, $this> */
    public function assignees(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_user');
    }

    /** @return HasMany<Comment, $this> */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->orderBy('created_at');
    }

    /** @return MorphMany<Attachment, $this> */
    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable')->latest();
    }

    /** Links where this task is the source. e.g. "this task BLOCKS X". */
    public function outgoingLinks(): HasMany
    {
        return $this->hasMany(TaskLink::class, 'source_task_id');
    }

    /** Links where this task is the target. e.g. "X BLOCKS this task" → shown as "Blocked by X". */
    public function incomingLinks(): HasMany
    {
        return $this->hasMany(TaskLink::class, 'target_task_id');
    }

    /**
     * Walk up the parent chain and return true if $candidateAncestorId is
     * already one of this task's ancestors (or the task itself). Used to
     * reject parent_id changes that would create a cycle.
     */
    public function hasAncestor(int $candidateAncestorId): bool
    {
        if ($this->id === $candidateAncestorId) {
            return true;
        }
        $current = $this->parent;
        $seen = [$this->id];
        while ($current) {
            if (in_array($current->id, $seen, true)) {
                return true; // existing cycle — defensively bail
            }
            if ($current->id === $candidateAncestorId) {
                return true;
            }
            $seen[] = $current->id;
            $current = $current->parent;
        }

        return false;
    }
}
