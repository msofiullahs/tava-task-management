<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'name' => $this->name,
            'description' => $this->description,
            'position' => $this->position,
            'created_by' => $this->created_by,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'statuses' => StatusResource::collection($this->whenLoaded('statuses')),
            'task_count' => $this->when(isset($this->tasks_count), fn () => (int) $this->tasks_count),
            'members' => UserSummaryResource::collection($this->whenLoaded('members')),
            'member_count' => $this->when(isset($this->members_count), fn () => (int) $this->members_count),
            // Convenience flag: true when at least one member is set (project is restricted).
            'is_restricted' => $this->when(
                isset($this->members_count) || $this->relationLoaded('members'),
                fn () => (isset($this->members_count) ? (int) $this->members_count : $this->members->count()) > 0,
            ),
        ];
    }
}
