<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreTaskLinkRequest;
use App\Http\Resources\TaskLinkResource;
use App\Models\Task;
use App\Models\TaskLink;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class TaskLinkController extends Controller
{
    /** List both directions of links for a task, with each entry's "other side" task summary. */
    public function index(Request $request, Task $task): AnonymousResourceCollection
    {
        $this->authorize('viewAny', [TaskLink::class, $task]);

        $user = $request->user();

        $with = ['sourceTask.project:id,uuid', 'sourceTask.status:id,name,color',
            'targetTask.project:id,uuid', 'targetTask.status:id,name,color'];

        $rows = TaskLink::query()
            ->with($with)
            ->where(fn ($q) => $q->where('source_task_id', $task->id)->orWhere('target_task_id', $task->id))
            ->get();

        // Filter out links whose "other side" the viewer can't see (e.g. cross-project to a restricted project).
        $rows = $rows->filter(function (TaskLink $link) use ($task, $user) {
            $other = $link->source_task_id === $task->id ? $link->targetTask : $link->sourceTask;

            return $other && $user->can('view', $other);
        })->values();

        // Stamp the viewing perspective so the resource knows which side is "us".
        $rows->each(fn (TaskLink $link) => $link->viewing_task_id = $task->id);

        return TaskLinkResource::collection($rows);
    }

    public function store(StoreTaskLinkRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();
        $target = Task::find($data['target_task_id']);

        if (! $target || ! $request->user()->can('create', [TaskLink::class, $task, $target])) {
            return response()->json(['message' => 'You don\'t have access to one of those tasks.'], 403);
        }

        // Normalise symmetric types so (A, B, relates_to) and (B, A, relates_to)
        // collapse to the same row in the DB.
        [$sourceId, $targetId] = TaskLink::normalize($task->id, $target->id, $data['type']);

        $link = TaskLink::firstOrCreate(
            ['source_task_id' => $sourceId, 'target_task_id' => $targetId, 'type' => $data['type']],
        );

        $link->setRelations([]) // ensure fresh load below
            ->load(['sourceTask.project:id,uuid', 'sourceTask.status:id,name,color',
                'targetTask.project:id,uuid', 'targetTask.status:id,name,color']);
        $link->viewing_task_id = $task->id;

        return response()->json(['link' => new TaskLinkResource($link)], 201);
    }

    public function destroy(Request $request, TaskLink $link): JsonResponse
    {
        $this->authorize('delete', $link);
        $link->delete();

        return response()->json(['message' => 'Link removed.']);
    }
}
