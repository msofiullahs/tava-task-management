<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One link entry from the perspective of a particular task ("the viewing task").
 * `direction` says whether the viewing task is the source or target of the row,
 * and `task` is always the OTHER side (the one the UI displays as "linked to").
 *
 * The TaskLinkController sets the `viewing_task_id` accessor on each model
 * before resourcing — see index() there.
 */
class TaskLinkResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $viewingId = (int) ($this->viewing_task_id ?? 0);
        $isSource = $this->source_task_id === $viewingId;
        $otherTask = $isSource ? $this->targetTask : $this->sourceTask;

        return [
            'id' => $this->id,
            'type' => $this->type,
            'direction' => $isSource ? 'outgoing' : 'incoming',
            'task' => $otherTask ? [
                'id' => $otherTask->id,
                'title' => $otherTask->title,
                'project_id' => $otherTask->project_id,
                'project_uuid' => $otherTask->project?->uuid,
                'status' => $otherTask->status ? [
                    'id' => $otherTask->status->id,
                    'name' => $otherTask->status->name,
                    'color' => $otherTask->status->color,
                ] : null,
            ] : null,
        ];
    }
}
