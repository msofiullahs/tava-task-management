<?php

namespace Database\Seeders;

use App\Http\Controllers\Api\SetupController;
use App\Models\Comment;
use App\Models\Project;
use App\Models\Status;
use App\Models\Task;
use App\Models\TaskLink;
use App\Models\User;
use App\Support\LexoRank;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Six projects covering the breadth of features:
 *  - Default-statuses projects, projects with extra columns (Blocked, Review, Backlog)
 *  - Open + restricted (members-only) projects
 *  - Tasks across every priority + due-date variant (overdue, today, future, none)
 *  - Subtasks, multi-comment threads, mixed assignees
 *
 * Data is deterministic — no factories — so screenshots and bug repros stay stable.
 */
class DemoContentSeeder extends Seeder
{
    /** Look-up cache so we don't query the same user five times. */
    private array $users = [];

    public function run(): void
    {
        foreach (User::all() as $u) {
            $this->users[$u->email] = $u;
        }

        $this->seedWebsiteRedesign();
        $this->seedMobileApp();
        $this->seedMarketing();
        $this->seedInternalTooling();
        $this->seedBrandRefresh();
        $this->seedQ2Roadmap();
        $this->seedTaskLinks();
    }

    /**
     * A few cross-project + within-project task links to exercise every UI
     * label combination (Blocks / Blocked by / Related / Duplicates / Duplicated by).
     * Idempotent — uses firstOrCreate with normalised source/target.
     */
    private function seedTaskLinks(): void
    {
        $link = function (string $sourceTitle, string $targetTitle, string $type) {
            $source = Task::where('title', $sourceTitle)->first();
            $target = Task::where('title', $targetTitle)->first();
            if (! $source || ! $target) {
                return;
            }
            [$s, $t] = TaskLink::normalize($source->id, $target->id, $type);
            TaskLink::firstOrCreate(['source_task_id' => $s, 'target_task_id' => $t, 'type' => $type]);
        };

        // "Fix login crash on iOS 16" BLOCKS "Add push-notification permission flow"
        $link('Fix login crash on iOS 16', 'Add push-notification permission flow', TaskLink::TYPE_BLOCKS);

        // "Plan the migration cutover" is RELATED TO "Audit current site analytics"
        $link('Plan the migration cutover', 'Audit current site analytics', TaskLink::TYPE_RELATES);

        // "App size audit" DUPLICATES "Crash-rate dashboard" (contrived but exercises the path)
        $link('App size audit', 'Crash-rate dashboard', TaskLink::TYPE_DUPLICATES);

        // "Sketch homepage wireframes" RELATES_TO "Pick a colour palette"
        $link('Sketch homepage wireframes', 'Pick a colour palette', TaskLink::TYPE_RELATES);

        // "Send brief to agency" BLOCKS "Draft launch announcement"
        $link('Send brief to agency', 'Draft launch announcement', TaskLink::TYPE_BLOCKS);
    }

    // ---------------------------------------------------------------------
    // Project seeders
    // ---------------------------------------------------------------------

    private function seedWebsiteRedesign(): void
    {
        $alex = $this->u('alex');
        $sam = $this->u('sam');
        $jordan = $this->u('jordan');
        $maya = $this->u('maya');
        $chris = $this->u('chris');

        $project = $this->makeProject($alex, 'Website Redesign', 'Refresh of the marketing site for the Q2 launch.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);
        $review = $this->extraStatus($project, 'Review', '#a855f7', between($doing->position, $done->position));
        $blocked = $this->extraStatus($project, 'Blocked', '#dc2626', between($review->position, $done->position));

        $t = [
            $this->task($project, $done, 'Audit current site analytics', $sam, ['priority' => 'high']),
            $this->task($project, $done, 'Stakeholder interviews', [$alex, $jordan], ['priority' => 'normal']),
            $this->task($project, $doing, 'Sketch homepage wireframes', $jordan, ['priority' => 'normal', 'due' => '+3 days']),
            $this->task($project, $doing, 'Build the design system tokens', $maya, ['priority' => 'high', 'due' => '+5 days']),
            $this->task($project, $review, 'About-page copy first draft', $sam, ['priority' => 'normal', 'due' => '+2 days']),
            $this->task($project, $todo, 'Pick a colour palette', $maya, ['priority' => 'low', 'due' => '+7 days']),
            // Overdue + assigned to Chris (Viewer) — proves the viewer scoping
            $this->task($project, $todo, 'Review accessibility checklist', [$sam, $chris], ['priority' => 'urgent', 'due' => '-2 days']),
            $this->task($project, $todo, 'Plan the migration cutover', [$alex, $sam], ['priority' => 'high', 'due' => '+5 days']),
            $this->task($project, $blocked, 'Animate hero section', $jordan, ['priority' => 'normal', 'due' => '+10 days']),
            // No due date, no assignee — exercises the Calendar's "Unscheduled" tray
            $this->task($project, $todo, 'Take final screenshots for the press release', null, ['priority' => 'normal']),
        ];

        // Subtasks under "Build the design system tokens"
        $this->subtask($project, $doing, $t[3], 'Colour ramp', $maya, ['priority' => 'normal']);
        $this->subtask($project, $doing, $t[3], 'Type scale', $maya, ['priority' => 'normal']);
        $this->subtask($project, $todo, $t[3], 'Spacing tokens', $maya, ['priority' => 'low']);

        // Conversations
        $this->comment($t[2], $jordan, 'First pass of the wireframes is in Figma — feedback welcome.');
        $this->comment($t[2], $alex, 'Looks great. Can we explore a hero variant without a stock photo?');
        $this->comment($t[2], $jordan, 'Working on that now — should have a v2 by tomorrow morning.');
        $this->comment($t[3], $maya, 'Tokens are in the design system file under "Foundations".');
        $this->comment($t[3], $sam, 'Nice. Will reference these for the marketing pages.');
        $this->comment($t[6], $sam, 'Found a few contrast issues on the secondary buttons. Working on a patch.');
        $this->comment($t[6], $chris, 'Are alt-tag fixes part of this ticket too?');
        $this->comment($t[6], $sam, 'Good catch — yes. Adding them.');
    }

    private function seedMobileApp(): void
    {
        $alex = $this->u('alex');
        $sam = $this->u('sam');
        $jordan = $this->u('jordan');
        $maya = $this->u('maya');
        $chris = $this->u('chris');

        $project = $this->makeProject($alex, 'Mobile App v2', 'iOS + Android rewrite, targeting the App Store cutoff in May.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);
        $blocked = $this->extraStatus($project, 'Blocked', '#dc2626', between($doing->position, $done->position));

        $t = [
            $this->task($project, $doing, 'Add push-notification permission flow', $jordan, ['priority' => 'high', 'due' => '+1 day']),
            $this->task($project, $blocked, 'Rewrite the onboarding', $maya, ['priority' => 'urgent', 'due' => '+2 days']),
            $this->task($project, $todo, 'Fix login crash on iOS 16', [$sam, $maya], ['priority' => 'urgent', 'due' => '+3 days']),
            $this->task($project, $done, 'Schedule app store screenshots shoot', $alex, ['priority' => 'normal']),
            $this->task($project, $todo, 'Add settings → notifications screen', $chris, ['priority' => 'normal', 'due' => '+8 days']),
            $this->task($project, $todo, 'App size audit', $jordan, ['priority' => 'low', 'due' => '+14 days']),
            $this->task($project, $doing, 'Implement biometric unlock', $sam, ['priority' => 'high', 'due' => '+4 days']),
            $this->task($project, $done, 'Update privacy nutrition labels', $alex, ['priority' => 'normal']),
            $this->task($project, $todo, 'Crash-rate dashboard', $sam, ['priority' => 'low']),
        ];

        // Subtasks under "Rewrite the onboarding"
        $this->subtask($project, $blocked, $t[1], 'Wireframe new flow', $maya, ['priority' => 'high']);
        $this->subtask($project, $blocked, $t[1], 'Localise copy (4 languages)', $jordan, ['priority' => 'normal']);

        $this->comment($t[1], $maya, 'Blocked waiting on the new copy from the brand team.');
        $this->comment($t[1], $alex, 'Pinged Sara — should land tomorrow.');
        $this->comment($t[1], $maya, 'Got the copy. Unblocking and moving back to In Progress.');
        $this->comment($t[2], $sam, 'Repro is consistent on iOS 16.4. Looking at the keychain access pattern.');
        $this->comment($t[2], $maya, 'I had similar issue last sprint — keychain entitlement was missing.');
        $this->comment($t[2], $sam, 'That was it — found it. PR up.');
        $this->comment($t[6], $sam, 'Face ID works. Touch ID needs a fallback prompt — pushing that next.');
    }

    private function seedMarketing(): void
    {
        $alex = $this->u('alex');
        $sam = $this->u('sam');
        $jordan = $this->u('jordan');
        $maya = $this->u('maya');

        $project = $this->makeProject($alex, 'Q1 Marketing Campaign', 'Cross-channel push around the v2 launch.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);

        $t = [
            $this->task($project, $doing, 'Draft launch announcement', $sam, ['priority' => 'high', 'due' => '+4 days']),
            $this->task($project, $done, 'Book the photographer', $maya, ['priority' => 'normal']),
            // Overdue + urgent — surfaces the red overdue styling in List + Calendar
            $this->task($project, $todo, 'Send brief to agency', $alex, ['priority' => 'urgent', 'due' => '-1 day']),
            $this->task($project, $todo, 'Approve hero copy', $jordan, ['priority' => 'normal', 'due' => '+5 days']),
            $this->task($project, $doing, 'Schedule social posts', $sam, ['priority' => 'normal', 'due' => '+6 days']),
            $this->task($project, $todo, 'Brief the partner-marketing team', $alex, ['priority' => 'low', 'due' => '+9 days']),
            $this->task($project, $done, 'Order conference swag', $maya, ['priority' => 'low']),
        ];

        $this->comment($t[0], $sam, 'Draft is in Notion — link in the project description.');
        $this->comment($t[0], $alex, 'Tightened the second paragraph. Take a look when you can.');
        $this->comment($t[2], $alex, 'Following up with the agency tomorrow if no reply.');
    }

    private function seedInternalTooling(): void
    {
        $alex = $this->u('alex');
        $sam = $this->u('sam');
        $jordan = $this->u('jordan');

        $project = $this->makeProject($alex, 'Internal Tooling', 'Quality-of-life upgrades for the engineering team.');
        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);
        $backlog = $this->extraStatus($project, 'Backlog', '#64748b', '0'.LexoRank::initial());

        $t = [
            $this->task($project, $backlog, 'Self-serve dev container reset', $sam, ['priority' => 'low']),
            $this->task($project, $backlog, 'Local cache eviction button in admin panel', $jordan, ['priority' => 'low']),
            $this->task($project, $todo, 'CI: cache composer + npm globally', $jordan, ['priority' => 'normal', 'due' => '+5 days']),
            $this->task($project, $todo, 'Migrate legacy queue workers to Horizon', $sam, ['priority' => 'high', 'due' => '+12 days']),
            $this->task($project, $doing, 'Refactor logging config — split app/audit', $sam, ['priority' => 'normal', 'due' => '+3 days']),
            $this->task($project, $done, 'Bump Node to 22 LTS in CI', $jordan, ['priority' => 'normal']),
            $this->task($project, $done, 'Drop legacy Webpack pipeline', $alex, ['priority' => 'high']),
        ];

        $this->comment($t[2], $jordan, 'Should knock 30s off the average build.');
        $this->comment($t[3], $sam, 'Horizon needs Redis — confirming infra has capacity first.');
        $this->comment($t[4], $sam, 'Drafted in #eng-platform. Will land Wednesday.');
    }

    private function seedBrandRefresh(): void
    {
        $alex = $this->u('alex');
        $maya = $this->u('maya');
        $jordan = $this->u('jordan');

        // RESTRICTED visibility — only Alex + Maya can see this project.
        $project = $this->makeProject($alex, 'Brand Refresh', 'New logo, palette, and typography for the 2026 brand.');
        $project->members()->sync([$alex->id, $maya->id]);

        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);
        $review = $this->extraStatus($project, 'Review', '#a855f7', between($doing->position, $done->position));

        $t = [
            $this->task($project, $done, 'Stakeholder kickoff', $alex, ['priority' => 'normal']),
            $this->task($project, $doing, 'Logo exploration — round 1', $maya, ['priority' => 'high', 'due' => '+2 days']),
            $this->task($project, $review, 'Typography pairing options', $maya, ['priority' => 'normal', 'due' => '+5 days']),
            $this->task($project, $todo, 'Update brand guidelines doc', $maya, ['priority' => 'low', 'due' => '+14 days']),
            $this->task($project, $todo, 'Roll-out plan for the website', $alex, ['priority' => 'normal', 'due' => '+20 days']),
        ];

        $this->comment($t[1], $maya, 'Three directions ready — sharing thumbnails shortly.');
        $this->comment($t[1], $alex, 'Loving direction #2. Can we see it with the existing wordmark for contrast?');
        $this->comment($t[2], $maya, 'Pairing Inter + Source Serif feels right. Open to alternatives.');

        // Note: Jordan is not a member; assigning anyway is fine because the task is in the
        // restricted project — Jordan simply won't see the project (or its tasks) in the SPA.
        unset($jordan);
    }

    private function seedQ2Roadmap(): void
    {
        $alex = $this->u('alex');
        $sam = $this->u('sam');

        // RESTRICTED to admins-only style: only Alex + Sam.
        $project = $this->makeProject($alex, 'Q2 Roadmap', 'Planning doc — themes, big bets, and the rough sequencing.');
        $project->members()->sync([$alex->id, $sam->id]);

        [$todo, $doing, $done] = SetupController::seedDefaultStatuses($project->id);

        $t = [
            $this->task($project, $doing, 'Draft theme proposal', $alex, ['priority' => 'high', 'due' => '+3 days']),
            $this->task($project, $todo, 'Collect input from team leads', $sam, ['priority' => 'normal', 'due' => '+7 days']),
            $this->task($project, $todo, 'Resource estimate per workstream', $sam, ['priority' => 'high', 'due' => '+10 days']),
            $this->task($project, $todo, 'Present to leadership', $alex, ['priority' => 'urgent', 'due' => '+14 days']),
            $this->task($project, $done, 'Sync with Finance on budget envelope', $alex, ['priority' => 'normal']),
        ];

        $this->comment($t[0], $alex, 'First draft mirrors the 2025 themes — open to a reshuffle.');
        $this->comment($t[1], $sam, 'Calendar holds out for next Tuesday. Will share template doc.');
        $this->comment($t[3], $alex, 'Slides due night before. Aiming for 12 slides, ≤20 min.');
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    private function u(string $short): User
    {
        $email = $short.'@lumendgital.id';
        if (! isset($this->users[$email])) {
            throw new \RuntimeException("Seeded user not found: {$email}. Did UserSeeder run?");
        }

        return $this->users[$email];
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

    /** Append an extra status column at the given LexoRank position. */
    private function extraStatus(Project $project, string $name, string $color, string $position): Status
    {
        return Status::create([
            'project_id' => $project->id,
            'name' => $name,
            'color' => $color,
            'position' => $position,
            'is_default' => false,
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
            'created_by' => $project->created_by,
        ]);

        if ($assignees !== null) {
            $ids = collect(is_array($assignees) ? $assignees : [$assignees])->pluck('id')->all();
            $task->assignees()->sync($ids);
        }

        return $task;
    }

    /** Same as task() but with a parent_id — exercises the nascent subtask relation. */
    private function subtask(Project $project, Status $status, Task $parent, string $title, User|array|null $assignees, array $opts = []): Task
    {
        $child = $this->task($project, $status, $title, $assignees, $opts);
        $child->forceFill(['parent_id' => $parent->id])->save();

        return $child;
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

/**
 * Tiny shim around LexoRank::between — keeps the inline status-position math readable.
 * Lives in the same file because nothing else uses it.
 */
function between(?string $prev, ?string $next): string
{
    return \App\Support\LexoRank::between($prev, $next);
}
