<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['source_task_id', 'target_task_id', 'type'])]
class TaskLink extends Model
{
    public const TYPE_RELATES = 'relates_to';
    public const TYPE_BLOCKS = 'blocks';
    public const TYPE_DUPLICATES = 'duplicates';

    /** Set of types stored in the DB. UI also has "Blocked by" / "Duplicated by"
     * but those are just the inverse of an existing 'blocks' / 'duplicates' row. */
    public const TYPES = [self::TYPE_RELATES, self::TYPE_BLOCKS, self::TYPE_DUPLICATES];

    /** Symmetric types — store only one row regardless of click direction. */
    public const SYMMETRIC = [self::TYPE_RELATES];

    /** @return BelongsTo<Task, $this> */
    public function sourceTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'source_task_id');
    }

    /** @return BelongsTo<Task, $this> */
    public function targetTask(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'target_task_id');
    }

    /**
     * Order source/target for symmetric types so (A, B, relates_to) and
     * (B, A, relates_to) collapse to a single row in the table.
     */
    public static function normalize(int $source, int $target, string $type): array
    {
        if (in_array($type, self::SYMMETRIC, true) && $source > $target) {
            return [$target, $source];
        }

        return [$source, $target];
    }
}
