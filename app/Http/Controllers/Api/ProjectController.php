<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Support\LexoRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Project::class);

        $user = $request->user();
        $query = Project::query()
            ->with('members:id,name')
            ->withCount('tasks', 'members')
            ->orderBy('position');

        if (! $user->isAdmin()) {
            // Non-admins: hide restricted projects unless they're an explicit member.
            $query->where(function ($q) use ($user) {
                $q->whereDoesntHave('members')
                    ->orWhereHas('members', fn ($mq) => $mq->whereKey($user->id));
            });
        }

        if ($user->isViewer()) {
            // On top of visibility: viewers only see projects where they have ≥1 assigned task.
            $query->whereHas('tasks.assignees', fn ($q) => $q->whereKey($user->id));
        }

        return ProjectResource::collection($query->get());
    }

    public function store(StoreProjectRequest $request): JsonResponse
    {
        $data = $request->validated();

        $project = DB::transaction(function () use ($data, $request) {
            // Append: rank between the current last project and "nothing".
            $last = Project::query()->orderByDesc('position')->value('position');

            $project = Project::create([
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'position' => LexoRank::between($last, null),
                'created_by' => $request->user()->id,
            ]);

            // Spec §10.3 — every project ships with To Do / In Progress / Done so the board isn't empty.
            SetupController::seedDefaultStatuses($project->id);

            return $project;
        });

        return response()->json([
            'project' => new ProjectResource($project->load('statuses')->loadCount('tasks')),
        ], 201);
    }

    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json([
            'project' => new ProjectResource(
                $project->load(['statuses', 'members:id,name,email,role'])
                    ->loadCount('tasks', 'members'),
            ),
        ]);
    }

    /**
     * Replace the project's member list (admin only). Empty array switches the
     * project back to "open to everyone".
     */
    public function updateMembers(Request $request, Project $project): JsonResponse
    {
        $this->authorize('manageMembers', $project);

        $data = $request->validate([
            'user_ids' => ['present', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $project->members()->sync($data['user_ids']);

        return response()->json([
            'project' => new ProjectResource(
                $project->fresh()->load(['statuses', 'members:id,name,email,role'])
                    ->loadCount('tasks', 'members'),
            ),
        ]);
    }

    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('before_id', $data) || array_key_exists('after_id', $data)) {
            $before = isset($data['before_id']) ? Project::find($data['before_id'])?->position : null;
            $after = isset($data['after_id']) ? Project::find($data['after_id'])?->position : null;
            $data['position'] = LexoRank::between($before, $after);
            unset($data['before_id'], $data['after_id']);
        }

        $project->fill($data)->save();

        return response()->json(['project' => new ProjectResource($project->fresh())]);
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        // Cascades to statuses → tasks → comments via the FK chain.
        $project->delete();

        return response()->json(['message' => 'Project deleted.']);
    }
}
