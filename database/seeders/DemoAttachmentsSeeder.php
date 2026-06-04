<?php

namespace Database\Seeders;

use App\Models\Attachment;
use App\Models\Comment;
use App\Models\PasswordResetRequest;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Storage;

/**
 * Seeds attachments + pending password-reset requests so every "list" page
 * (Files, People reset banner, task detail panel) shows real data on first
 * load. Files are tiny inline blobs — no real binaries in the repo.
 */
class DemoAttachmentsSeeder extends Seeder
{
    public function run(): void
    {
        $alex = User::where('email', 'alex@lumendgital.id')->first();
        $sam = User::where('email', 'sam@lumendgital.id')->first();
        $jordan = User::where('email', 'jordan@lumendgital.id')->first();
        $maya = User::where('email', 'maya@lumendgital.id')->first();
        $chris = User::where('email', 'chris@lumendgital.id')->first();

        if (! $alex || ! $sam) {
            return;
        }

        // --- Task attachments ----------------------------------------------------
        $this->attachTo('Sketch homepage wireframes', $jordan, 'homepage-wireframe.png', 'image/png', $this->fakeImageBytes());
        $this->attachTo('Sketch homepage wireframes', $jordan, 'feedback-notes.txt', 'text/plain',
            "Hero needs more whitespace.\nCTA copy is too long — try 'Get started free'.\n");

        $this->attachTo('Review accessibility checklist', $sam, 'a11y-audit.txt', 'text/plain',
            "Contrast issues on secondary buttons (3.1:1).\nMissing alt text on hero image.\nKeyboard trap in the cookie banner.\n");
        $this->attachTo('Review accessibility checklist', $sam, 'a11y-report.pdf', 'application/pdf',
            $this->fakePdfBytes('Accessibility Audit — Tava marketing site'));

        $this->attachTo('Build the design system tokens', $maya, 'tokens-v1.json', 'application/json',
            "{\n  \"color.primary\": \"#4f46e5\",\n  \"color.accent\": \"#22d3ee\",\n  \"radius.md\": \"8px\"\n}\n");
        $this->attachTo('Build the design system tokens', $maya, 'palette-mood.png', 'image/png', $this->fakeImageBytes());

        $this->attachTo('Draft launch announcement', $sam, 'launch-copy-v1.txt', 'text/plain',
            "Tava is here. The task manager built for teams who want a board, not a megalith.\n");
        $this->attachTo('Draft launch announcement', $alex, 'launch-deck.pdf', 'application/pdf',
            $this->fakePdfBytes('Launch deck — Q1 announcement'));

        $this->attachTo('Logo exploration — round 1', $maya, 'logo-thumbs.png', 'image/png', $this->fakeImageBytes());
        $this->attachTo('Logo exploration — round 1', $maya, 'logo-brief.txt', 'text/plain',
            "Brief: refined, geometric, friendly. Avoid serifs. Mark must read at 16px.\n");

        $this->attachTo('Typography pairing options', $maya, 'type-pairings.png', 'image/png', $this->fakeImageBytes());

        $this->attachTo('Draft theme proposal', $alex, 'q2-themes.txt', 'text/plain',
            "Themes:\n1. Reliability — uptime, perf budgets.\n2. Onboarding — TTFV under 5 min.\n3. Power-user — keyboard, bulk ops.\n");

        $this->attachTo('Resource estimate per workstream', $sam, 'estimate-template.csv', 'text/csv',
            "workstream,owner,weeks,risk\nreliability,Eng,6,low\nonboarding,Design+Eng,8,medium\npower-user,Eng,10,medium\n");

        $this->attachTo('Fix login crash on iOS 16', $sam, 'crash-trace.txt', 'text/plain',
            "Thread 0 Crashed:\n0   Tava                            0x0000000104f02de8 keychainAccess + 200\n…\n");

        $this->attachTo('Refactor logging config — split app/audit', $sam, 'logging-design.txt', 'text/plain',
            "Two channels:\n  - app  → file rotation, 14d\n  - audit → stdout only, immutable, JSON\n");

        // --- Comment attachments -------------------------------------------------
        $this->attachToCommentOn('Draft launch announcement', $sam, 'press-list.txt', 'text/plain',
            "TechCrunch — Sarah\nThe Verge — Liam\nIndie Hackers — newsletter\n");

        $this->attachToCommentOn('Sketch homepage wireframes', $jordan, 'wireframe-thumb-v2.png', 'image/png', $this->fakeImageBytes());

        $this->attachToCommentOn('Logo exploration — round 1', $maya, 'direction-2-with-wordmark.png', 'image/png', $this->fakeImageBytes());

        // --- Password reset requests --------------------------------------------
        // Chris explicitly asked — admin will see this on People page.
        if ($chris) {
            PasswordResetRequest::firstOrCreate(
                ['email' => $chris->email, 'fulfilled_at' => null],
                ['user_id' => $chris->id],
            );
        }

        // Jordan also asked — gives the admin two real requests to act on.
        if ($jordan) {
            PasswordResetRequest::firstOrCreate(
                ['email' => $jordan->email, 'fulfilled_at' => null],
                ['user_id' => $jordan->id],
            );
        }

        // Someone typo'd their email — exercises the "no matching account" path.
        PasswordResetRequest::firstOrCreate(
            ['email' => 'typo@lumendgital.id', 'fulfilled_at' => null],
            ['user_id' => null],
        );
    }

    /** Pick the first task whose title matches and attach a file to it. */
    private function attachTo(string $taskTitle, ?User $uploader, string $name, string $mime, string $content): void
    {
        if (! $uploader) {
            return;
        }
        $task = Task::where('title', $taskTitle)->first();
        if (! $task) {
            return;
        }
        $this->store($task, $uploader, $name, $mime, $content);
    }

    /** Find the first comment on the named task and attach a file to that. */
    private function attachToCommentOn(string $taskTitle, ?User $uploader, string $name, string $mime, string $content): void
    {
        if (! $uploader) {
            return;
        }
        $task = Task::where('title', $taskTitle)->first();
        if (! $task) {
            return;
        }
        $comment = Comment::where('task_id', $task->id)->orderBy('id')->first();
        if (! $comment) {
            return;
        }
        $this->store($comment, $uploader, $name, $mime, $content);
    }

    /**
     * Write a file on the local disk and create the polymorphic Attachment row.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $parent  Task or Comment
     */
    private function store($parent, User $uploader, string $name, string $mime, string $content): void
    {
        $folder = sprintf('attachments/%s', now()->format('Y/m'));
        $disk = 'local';
        $path = $folder.'/'.bin2hex(random_bytes(8)).'-'.preg_replace('/[^A-Za-z0-9._-]/', '_', $name);
        Storage::disk($disk)->put($path, $content);

        Attachment::create([
            'attachable_type' => $parent::class,
            'attachable_id' => $parent->id,
            'user_id' => $uploader->id,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $name,
            'mime_type' => $mime,
            'size_bytes' => strlen($content),
        ]);
    }

    /** 1×1 transparent PNG — enough to exercise the image branch in the UI. */
    private function fakeImageBytes(): string
    {
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }

    /** Minimal valid PDF with a single line of text — viewable in a browser tab. */
    private function fakePdfBytes(string $line): string
    {
        $safe = preg_replace('/[^A-Za-z0-9 .\-_,:]/', '', $line);

        return "%PDF-1.4\n"
            ."1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            ."2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
            ."3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
            ."4 0 obj<</Length 60>>stream\nBT /F1 14 Tf 72 770 Td (".$safe.") Tj ET\nendstream endobj\n"
            ."5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
            ."xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000099 00000 n \n0000000180 00000 n \n0000000260 00000 n \n"
            ."trailer<</Size 6/Root 1 0 R>>\nstartxref\n312\n%%EOF\n";
    }
}
