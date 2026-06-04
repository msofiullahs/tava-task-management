<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SetupRequest;
use App\Http\Resources\UserResource;
use App\Models\Project;
use App\Models\Status;
use App\Models\Task;
use App\Models\User;
use App\Support\LexoRank;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SetupController extends Controller
{
    /** Tells the SPA whether to redirect to /setup or /login on first paint. */
    public function status(): JsonResponse
    {
        return response()->json(['needs_setup' => User::query()->count() === 0]);
    }

    public function store(SetupRequest $request): JsonResponse
    {
        if (User::query()->count() > 0) {
            // 409 Conflict — setup is one-shot. Once any user exists, this endpoint is closed.
            return response()->json(['message' => 'Setup has already been completed.'], 409);
        }

        $data = $request->validated();

        $admin = DB::transaction(function () use ($data) {
            $admin = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => User::ROLE_ADMIN,
                'must_change_password' => false,
            ]);

            if (! empty($data['seed_sample'])) {
                $this->seedSampleProject($admin);
            }

            return $admin;
        });

        Auth::login($admin);
        $request->session()->regenerate();

        return response()->json([
            'user' => new UserResource($admin),
        ], 201);
    }

    /** A demo project with default statuses + a few tasks, so the first screen has something to learn from. */
    private function seedSampleProject(User $admin): void
    {
        $project = Project::create([
            'name' => 'Welcome to Tava',
            'description' => 'A sample project so you can see how things work. Delete it once you\'re comfortable.',
            'position' => LexoRank::initial(),
            'created_by' => $admin->id,
        ]);

        [$todo, $doing, $done] = $this->seedDefaultStatuses($project->id);

        $samples = [
            ['title' => 'Click a task to open the detail panel', 'status_id' => $todo->id],
            ['title' => 'Drag this card to a different column', 'status_id' => $doing->id],
            ['title' => 'Hit "+ Add a task" to create your own', 'status_id' => $todo->id],
            ['title' => 'You finished the tutorial! 🎉', 'status_id' => $done->id, 'priority' => 'low'],
        ];

        $rank = LexoRank::initial();
        foreach ($samples as $i => $row) {
            Task::create([
                'project_id' => $project->id,
                'status_id' => $row['status_id'],
                'title' => $row['title'],
                'priority' => $row['priority'] ?? 'normal',
                'position' => $rank,
                'created_by' => $admin->id,
            ]);
            $rank = LexoRank::between($rank, null);
        }
    }

    /** Returns [To Do (default), In Progress, Done] in column order. Shared with ProjectController. */
    public static function seedDefaultStatuses(int $projectId): array
    {
        $defaults = [
            ['name' => 'To Do', 'color' => '#94a3b8', 'is_default' => true],
            ['name' => 'In Progress', 'color' => '#3b82f6', 'is_default' => false],
            ['name' => 'Done', 'color' => '#10b981', 'is_default' => false],
        ];

        $created = [];
        $rank = LexoRank::initial();
        foreach ($defaults as $row) {
            $created[] = Status::create([
                'project_id' => $projectId,
                'name' => $row['name'],
                'color' => $row['color'],
                'position' => $rank,
                'is_default' => $row['is_default'],
            ]);
            $rank = LexoRank::between($rank, null);
        }

        return $created;
    }
}
