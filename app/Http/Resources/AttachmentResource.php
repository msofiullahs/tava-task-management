<?php

namespace App\Http\Resources;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        // Pre-compute a friendly source label + link for the Files page,
        // without leaking the full task object on every attachment payload.
        $source = $this->resolveSource();

        return [
            'id' => $this->id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => (int) $this->size_bytes,
            'is_image' => $this->isImage(),
            'url' => route('attachments.download', $this->id),
            'created_at' => $this->created_at,
            'uploader' => new UserSummaryResource($this->whenLoaded('uploader')),
            'attachable_type' => $this->shortType(),
            'attachable_id' => $this->attachable_id,
            'source' => $source,
        ];
    }

    private function shortType(): string
    {
        return match ($this->attachable_type) {
            Task::class => 'task',
            Comment::class => 'comment',
            default => 'unknown',
        };
    }

    /** @return array{label: string, project_id: int|null, project_uuid: string|null, task_id: int|null}|null */
    private function resolveSource(): ?array
    {
        if (! $this->relationLoaded('attachable')) {
            return null;
        }
        $parent = $this->attachable;
        if ($parent instanceof Task) {
            return [
                'label' => $parent->title,
                'project_id' => $parent->project_id,
                'project_uuid' => $parent->project?->uuid,
                'task_id' => $parent->id,
            ];
        }
        if ($parent instanceof Comment) {
            return [
                'label' => 'Comment on '.$parent->task?->title,
                'project_id' => $parent->task?->project_id,
                'project_uuid' => $parent->task?->project?->uuid,
                'task_id' => $parent->task_id,
            ];
        }

        return null;
    }
}
