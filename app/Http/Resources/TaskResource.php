<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TaskResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            // Tasks are routinely shown outside their project context (drag, file lists,
            // detail panel) and need to invalidate the right project-scoped cache.
            'project_uuid' => $this->whenLoaded('project', fn () => $this->project->uuid),
            'status_id' => $this->status_id,
            'parent_id' => $this->parent_id,
            'title' => $this->title,
            'description' => $this->description,
            'priority' => $this->priority,
            'due_date' => $this->due_date?->toDateString(),
            'position' => $this->position,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'assignees' => UserSummaryResource::collection($this->whenLoaded('assignees')),
            'comment_count' => $this->when(isset($this->comments_count), fn () => (int) $this->comments_count),
            'attachment_count' => $this->when(isset($this->attachments_count), fn () => (int) $this->attachments_count),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            // Parent summary — present when parent_id is set and the relation is loaded
            // (TaskController eager-loads parent:id,title everywhere it returns TaskResource).
            'parent' => $this->whenLoaded('parent', fn () => $this->parent ? [
                'id' => $this->parent->id,
                'title' => $this->parent->title,
            ] : null),
            'subtask_count' => $this->when(isset($this->children_count), fn () => (int) $this->children_count),
        ];
    }
}
