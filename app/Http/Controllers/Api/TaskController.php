<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\MoveTaskRequest;
use App\Http\Requests\StoreTaskRequest;
use App\Http\Requests\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Project;
use App\Models\Status;
use App\Models\Task;
use App\Support\LexoRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class TaskController extends Controller
{
    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        $user = $request->user();
        $query = $project->tasks()
            // project:id,uuid is one row; eager-loading it lets TaskResource emit project_uuid
            // so the SPA can invalidate the right project-scoped cache without prop-plumbing.
            ->with(['assignees', 'project:id,uuid', 'parent:id,title'])
            ->withCount('comments', 'attachments', 'children')
            ->orderBy('position');

        if ($user->isViewer()) {
            // Viewers see assigned tasks only.
            $query->whereHas('assignees', fn ($q) => $q->whereKey($user->id));
        }

        return TaskResource::collection($query->get());
    }

    public function store(StoreTaskRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        // Default status if not given. Spec §10.3 guarantees one exists per project.
        $statusId = $data['status_id'] ?? Status::where('project_id', $project->id)
            ->where('is_default', true)
            ->value('id') ?? Status::where('project_id', $project->id)->orderBy('position')->value('id');

        $task = DB::transaction(function () use ($project, $request, $data, $statusId) {
            $last = Task::where('project_id', $project->id)
                ->where('status_id', $statusId)
                ->orderByDesc('position')
                ->value('position');

            $task = Task::create([
                'project_id' => $project->id,
                'status_id' => $statusId,
                'parent_id' => $data['parent_id'] ?? null,
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'priority' => $data['priority'] ?? null,
                'due_date' => $data['due_date'] ?? null,
                'position' => LexoRank::between($last, null),
                'created_by' => $request->user()->id,
            ]);

            if (! empty($data['assignee_ids'])) {
                $task->assignees()->sync($data['assignee_ids']);
            }

            return $task;
        });

        return response()->json([
            'task' => new TaskResource($task->load('assignees', 'attachments.uploader', 'project:id,uuid', 'parent:id,title')->loadCount('comments', 'attachments', 'children')),
        ], 201);
    }

    public function show(Request $request, Task $task): JsonResponse
    {
        $this->authorize('view', $task);

        return response()->json([
            'task' => new TaskResource($task->load('assignees', 'attachments.uploader', 'project:id,uuid', 'parent:id,title')->loadCount('comments', 'attachments', 'children')),
        ]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();

        // Cycle check — moving a task under one of its own descendants would create a loop.
        if (array_key_exists('parent_id', $data) && $data['parent_id'] !== null && $data['parent_id'] !== $task->parent_id) {
            $candidate = Task::find($data['parent_id']);
            if ($candidate && $candidate->hasAncestor($task->id)) {
                return response()->json([
                    'message' => 'You can\'t make a task a child of one of its own subtasks.',
                ], 422);
            }
        }

        DB::transaction(function () use ($task, $data) {
            if (array_key_exists('assignee_ids', $data)) {
                $task->assignees()->sync($data['assignee_ids'] ?? []);
                unset($data['assignee_ids']);
            }

            $task->fill($data)->save();
        });

        return response()->json([
            'task' => new TaskResource($task->fresh()->load('assignees', 'attachments.uploader', 'project:id,uuid', 'parent:id,title')->loadCount('comments', 'attachments', 'children')),
        ]);
    }

    /**
     * Convenience endpoint for adding a subtask. Inherits the parent's project +
     * default status so the SPA doesn't have to thread either through every call.
     */
    public function storeSubtask(StoreTaskRequest $request, Task $task): JsonResponse
    {
        $this->authorize('update', $task);

        $statusId = $request->input('status_id') ?? Status::where('project_id', $task->project_id)
            ->where('is_default', true)
            ->value('id') ?? Status::where('project_id', $task->project_id)->orderBy('position')->value('id');

        $last = Task::where('project_id', $task->project_id)
            ->where('status_id', $statusId)
            ->orderByDesc('position')
            ->value('position');

        $child = DB::transaction(function () use ($task, $request, $statusId, $last) {
            $child = Task::create([
                'project_id' => $task->project_id,
                'status_id' => $statusId,
                'parent_id' => $task->id,
                'title' => $request->string('title'),
                'description' => $request->input('description'),
                'priority' => $request->input('priority'),
                'due_date' => $request->input('due_date'),
                'position' => LexoRank::between($last, null),
                'created_by' => $request->user()->id,
            ]);
            if ($request->filled('assignee_ids')) {
                $child->assignees()->sync($request->input('assignee_ids', []));
            }

            return $child;
        });

        return response()->json([
            'task' => new TaskResource($child->load('assignees', 'project:id,uuid', 'parent:id,title')->loadCount('comments', 'attachments', 'children')),
        ], 201);
    }

    public function move(MoveTaskRequest $request, Task $task): JsonResponse
    {
        $data = $request->validated();

        $before = isset($data['before_id']) ? Task::find($data['before_id'])?->position : null;
        $after = isset($data['after_id']) ? Task::find($data['after_id'])?->position : null;

        $task->forceFill([
            'status_id' => $data['status_id'],
            'position' => LexoRank::between($before, $after),
        ])->save();

        return response()->json([
            'task' => new TaskResource($task->fresh()->load('assignees')->loadCount('comments')),
        ]);
    }

    public function destroy(Request $request, Task $task): JsonResponse
    {
        $this->authorize('delete', $task);
        $task->delete(); // soft delete — see TaskPolicy@restore for undo.

        return response()->json(['message' => 'Task deleted.']);
    }

    public function restore(Request $request, Task $task): JsonResponse
    {
        // Route is registered with ->withTrashed() so soft-deleted tasks resolve here.
        $this->authorize('restore', $task);
        $task->restore();

        return response()->json([
            'task' => new TaskResource($task->fresh()->load('assignees')->loadCount('comments')),
        ]);
    }
}
