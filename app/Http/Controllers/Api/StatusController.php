<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStatusRequest;
use App\Http\Requests\UpdateStatusRequest;
use App\Http\Resources\StatusResource;
use App\Models\Project;
use App\Models\Status;
use App\Support\LexoRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class StatusController extends Controller
{
    public function index(Request $request, Project $project): AnonymousResourceCollection
    {
        $this->authorize('view', $project);

        return StatusResource::collection($project->statuses);
    }

    public function store(StoreStatusRequest $request, Project $project): JsonResponse
    {
        $data = $request->validated();

        $before = isset($data['before_id']) ? Status::find($data['before_id'])?->position : null;
        $after = isset($data['after_id']) ? Status::find($data['after_id'])?->position : null;

        if ($before === null && $after === null) {
            // Default: append after the current last column.
            $before = Status::where('project_id', $project->id)->orderByDesc('position')->value('position');
        }

        $status = Status::create([
            'project_id' => $project->id,
            'name' => $data['name'],
            'color' => $data['color'] ?? '#94a3b8',
            'position' => LexoRank::between($before, $after),
            'is_default' => false,
        ]);

        return response()->json(['status' => new StatusResource($status)], 201);
    }

    public function update(UpdateStatusRequest $request, Status $status): JsonResponse
    {
        $data = $request->validated();

        if (array_key_exists('before_id', $data) || array_key_exists('after_id', $data)) {
            $before = isset($data['before_id']) ? Status::find($data['before_id'])?->position : null;
            $after = isset($data['after_id']) ? Status::find($data['after_id'])?->position : null;
            $data['position'] = LexoRank::between($before, $after);
            unset($data['before_id'], $data['after_id']);
        }

        DB::transaction(function () use ($status, $data) {
            // Setting is_default = true must clear the flag on the previous default — exactly one per project.
            if (! empty($data['is_default'])) {
                Status::where('project_id', $status->project_id)
                    ->where('id', '!=', $status->id)
                    ->update(['is_default' => false]);
            }
            $status->fill($data)->save();
        });

        return response()->json(['status' => new StatusResource($status->fresh())]);
    }

    public function destroy(Request $request, Status $status): JsonResponse
    {
        $this->authorize('delete', $status);

        $siblings = Status::where('project_id', $status->project_id)->where('id', '!=', $status->id);

        // Spec §10.2 — never leave a project with zero statuses.
        if ($siblings->count() === 0) {
            return response()->json([
                'message' => 'Add another status before deleting this one — a project needs at least one.',
            ], 422);
        }

        $reassignId = $request->integer('reassign_to');
        $reassign = $reassignId ? Status::where('project_id', $status->project_id)->where('id', $reassignId)->first() : null;

        if ($status->tasks()->exists() && ! $reassign) {
            throw ValidationException::withMessages([
                'reassign_to' => ['Move these tasks to another status first.'],
            ]);
        }

        DB::transaction(function () use ($status, $reassign) {
            if ($reassign) {
                $status->tasks()->update(['status_id' => $reassign->id]);
            }

            $wasDefault = $status->is_default;
            $status->delete();

            // Re-point is_default if we removed it.
            if ($wasDefault) {
                $next = Status::where('project_id', $status->project_id)->orderBy('position')->first();
                if ($next) {
                    $next->forceFill(['is_default' => true])->save();
                }
            }
        });

        return response()->json(['message' => 'Status deleted.']);
    }
}
