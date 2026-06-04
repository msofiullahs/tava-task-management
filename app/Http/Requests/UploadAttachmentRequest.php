<?php

namespace App\Http\Requests;

use App\Models\Comment;
use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UploadAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()) {
            return false;
        }
        $parent = $this->resolveAttachable();
        if (! $parent) {
            return false;
        }
        // Anyone with view access on the parent can attach a file (mirrors the comment policy:
        // viewers can post comments, and a file is just a richer form of that).
        if ($parent instanceof Task) {
            return $this->user()->can('view', $parent);
        }
        if ($parent instanceof Comment) {
            return $this->user()->can('view', $parent->task);
        }

        return false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'attachable_type' => ['required', Rule::in(['task', 'comment'])],
            'attachable_id' => ['required', 'integer'],
            // 25MB cap — keeps Plesk's default php.ini upload_max_filesize happy on most installs.
            'file' => ['required', 'file', 'max:25600'],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Pick a file to upload.',
            'file.max' => 'That file is over 25 MB. Try compressing it first.',
        ];
    }

    public function resolveAttachable(): Task|Comment|null
    {
        return match ($this->input('attachable_type')) {
            'task' => Task::find($this->integer('attachable_id')),
            'comment' => Comment::with('task')->find($this->integer('attachable_id')),
            default => null,
        };
    }
}
