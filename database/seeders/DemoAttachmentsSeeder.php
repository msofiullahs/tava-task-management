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
 * Seeds a few sample attachments + one pending password-reset request so the
 * Files page and admin People-page banner aren't empty on first load.
 *
 * Files are tiny inline blobs — we don't ship real images in the repo.
 */
class DemoAttachmentsSeeder extends Seeder
{
    public function run(): void
    {
        $alex = User::where('email', 'alex@tava.test')->first();
        $sam = User::where('email', 'sam@tava.test')->first();
        $jordan = User::where('email', 'jordan@tava.test')->first();
        $chris = User::where('email', 'chris@tava.test')->first();

        if (! $alex || ! $sam) {
            return;
        }

        // Pick a few tasks that already exist from DemoContentSeeder and attach files to them.
        $wireframes = Task::where('title', 'Sketch homepage wireframes')->first();
        $accessibility = Task::where('title', 'Review accessibility checklist')->first();
        $launchAnnouncement = Task::where('title', 'Draft launch announcement')->first();

        if ($wireframes) {
            $this->attach($wireframes, $jordan ?? $alex, 'homepage-wireframe.png', 'image/png', $this->fakeImageBytes());
            $this->attach($wireframes, $jordan ?? $alex, 'feedback-notes.txt', 'text/plain', "Hero needs more whitespace.\nCTA copy is too long — try 'Get started free'.\n");
        }

        if ($accessibility) {
            $this->attach($accessibility, $sam, 'a11y-audit.txt', 'text/plain', "Contrast issues on secondary buttons (3.1:1).\nMissing alt text on hero image.\nKeyboard trap in the cookie banner.\n");
        }

        if ($launchAnnouncement) {
            $this->attach($launchAnnouncement, $sam, 'launch-copy-v1.txt', 'text/plain', "Tava is here. The task manager built for teams who want a board, not a megalith.\n");

            // Attach a file to a comment too, so the comment-attachment UI is exercised.
            $comment = Comment::where('task_id', $launchAnnouncement->id)->first();
            if ($comment) {
                $this->attach($comment, $sam, 'press-list.txt', 'text/plain', "TechCrunch — Sarah\nThe Verge — Liam\nIndie Hackers — newsletter\n");
            }
        }

        // One pending forgot-password request so admins see the banner on the People page.
        if ($chris) {
            PasswordResetRequest::firstOrCreate(
                ['email' => $chris->email, 'fulfilled_at' => null],
                ['user_id' => $chris->id],
            );
        }
    }

    /**
     * Save a fake file on the local disk and create the Attachment row.
     *
     * @param  \Illuminate\Database\Eloquent\Model  $parent  Task or Comment
     */
    private function attach($parent, User $uploader, string $name, string $mime, string $content): void
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

    /** Minimal 1×1 PNG so the Files page shows an image thumbnail. */
    private function fakeImageBytes(): string
    {
        // 1×1 transparent PNG (67 bytes). Enough to exercise the image branch.
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
    }
}
