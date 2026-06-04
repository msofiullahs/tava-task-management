<?php

namespace Database\Seeders;

use App\Http\Controllers\Api\SetupController;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Status;
use App\Models\Task;
use App\Models\User;
use App\Support\LexoRank;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Three projects with realistic statuses, tasks, and comments — enough variety
 * to exercise every view (overdue tasks, future tasks, unscheduled tasks,
 * tasks with multiple assignees, blocked-status tasks, etc.).
 *
 * Each project reuses SetupController::seedDefaultStatuses for the default
 * three columns, then we add project-specific extras (e.g. "Blocked").
 */
class DemoContentSeeder extends Seeder
{
    public function run(): void
    {
        $alex = User::where('email', 'alex@tava.test')->firstOrFail();
        $sam = User::where('email', 'sam@tava.test')->firstOrFail();
        $jordan = User::where('email', 'jordan@tava.test')->firstOrFail();
        $maya = User::where('email', 'maya@tava.test')->firstOrFail();
        $chris = User::where('email', 'chris@tava.test')->firstOrFail();

        $this->seedWebsiteRedesign($alex, $sam, $jordan, $maya, $chris);
        $this->seedMobileApp($alex, $sam, $jordan, $maya, $chris);
        $this->seedMarketing($alex, $sam, $jordan, $maya);
    }

    private function seedWebsiteRedesign(User $alex, User $sam, User $jordan, User $maya, User $chris): void
    {
        $project = $this->makeProject($alex, 'Website Redesign', 'Refresh of the marketing site for the Q2 launch.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);

        $tasks = [
            $this->task($project, $done, 'Audit current site analytics', $sam, ['priority' => 'high']),
            $this->task($project, $doing, 'Sketch homepage wireframes', $jordan, ['priority' => 'normal', 'due' => '+3 days']),
            $this->task($project, $todo, 'Pick a colour palette', $maya, ['priority' => 'low', 'due' => '+7 days']),
            // Overdue + assigned to Chris (Viewer) so you can verify the viewer sees only their tasks.
            $this->task($project, $todo, 'Review accessibility checklist', [$sam, $chris], ['priority' => 'urgent', 'due' => '-2 days']),
            $this->task($project, $todo, 'Plan the migration cutover', [$alex, $sam], ['priority' => 'high', 'due' => '+5 days']),
            // No due date, no assignee — exercises the Calendar's "Unscheduled" tray and empty-assignee rendering.
            $this->task($project, $todo, 'Take final screenshots for the press release', null, ['priority' => 'normal']),
        ];

        $this->comment($tasks[1], $jordan, 'First pass of the wireframes is in Figma — feedback welcome.');
        $this->comment($tasks[1], $alex, 'Looks great. Can we explore a hero variant without a stock photo?');
        $this->comment($tasks[3], $sam, 'Found a few contrast issues on the secondary buttons. Working on a patch.');
    }

    private function seedMobileApp(User $alex, User $sam, User $jordan, User $maya, User $chris): void
    {
        $project = $this->makeProject($alex, 'Mobile App v2', 'iOS + Android rewrite, targeting the App Store cutoff in May.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);

        // Extra "Blocked" column proves dynamic statuses + non-default columns work.
        $blocked = Status::create([
            'project_id' => $project->id,
            'name' => 'Blocked',
            'color' => '#dc2626',
            'position' => LexoRank::between($doing->position, $done->position),
            'is_default' => false,
        ]);

        $tasks = [
            $this->task($project, $doing, 'Add push-notification permission flow', $jordan, ['priority' => 'high', 'due' => '+1 day']),
            $this->task($project, $blocked, 'Rewrite the onboarding', $maya, ['priority' => 'urgent', 'due' => '+2 days']),
            $this->task($project, $todo, 'Fix login crash on iOS 16', [$sam, $maya], ['priority' => 'urgent', 'due' => '+3 days']),
            $this->task($project, $done, 'Schedule app store screenshots shoot', $alex, ['priority' => 'normal']),
            $this->task($project, $todo, 'Add settings → notifications screen', $chris, ['priority' => 'normal']),
            $this->task($project, $todo, 'App size audit', $jordan, ['priority' => 'low', 'due' => '+14 days']),
        ];

        $this->comment($tasks[1], $maya, 'Blocked waiting on the new copy from the brand team.');
        $this->comment($tasks[1], $alex, 'Pinged Sara — should land tomorrow.');
        $this->comment($tasks[2], $sam, 'Repro is consistent on iOS 16.4. Looking at the keychain access pattern.');
    }

    private function seedMarketing(User $alex, User $sam, User $jordan, User $maya): void
    {
        $project = $this->makeProject($alex, 'Q1 Marketing Campaign', 'Cross-channel push around the v2 launch.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);

        $tasks = [
            $this->task($project, $doing, 'Draft launch announcement', $sam, ['priority' => 'high', 'due' => '+4 days']),
            $this->task($project, $done, 'Book the photographer', $maya, ['priority' => 'normal']),
            // Overdue + urgent — surfaces the red overdue styling in List + Calendar views.
            $this->task($project, $todo, 'Send brief to agency', $alex, ['priority' => 'urgent', 'due' => '-1 day']),
            $this->task($project, $todo, 'Approve hero copy', $jordan, ['priority' => 'normal', 'due' => '+5 days']),
        ];

        $this->comment($tasks[0], $sam, 'Draft is in Notion — link in the project description.');
    }

    private function makeProject(User $creator, string $name, string $description): Project
    {
        $last = Project::query()->orderByDesc('position')->value('position');

        return Project::create([
            'name' => $name,
            'description' => $description,
            'position' => LexoRank::between($last, null),
            'created_by' => $creator->id,
        ]);
    }

    /**
     * Create a task and attach assignees.
     *
     * @param  User|User[]|null  $assignees
     * @param  array{priority?: string, due?: string}  $opts
     */
    private function task(Project $project, Status $status, string $title, User|array|null $assignees, array $opts = []): Task
    {
        $last = Task::where('project_id', $project->id)
            ->where('status_id', $status->id)
            ->orderByDesc('position')
            ->value('position');

        $task = Task::create([
            'project_id' => $project->id,
            'status_id' => $status->id,
            'title' => $title,
            'priority' => $opts['priority'] ?? null,
            'due_date' => isset($opts['due']) ? Carbon::parse($opts['due'])->toDateString() : null,
            'position' => LexoRank::between($last, null),
            // Use the project creator as a fallback "created_by" so we don't have
            // to thread this through every call site.
            'created_by' => $project->created_by,
        ]);

        if ($assignees !== null) {
            $ids = collect(is_array($assignees) ? $assignees : [$assignees])->pluck('id')->all();
            $task->assignees()->sync($ids);
        }

        return $task;
    }

    private function comment(Task $task, User $author, string $body): Comment
    {
        return Comment::create([
            'task_id' => $task->id,
            'user_id' => $author->id,
            'body' => $body,
        ]);
    }
}
