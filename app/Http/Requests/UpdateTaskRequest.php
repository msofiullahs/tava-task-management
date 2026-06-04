<?php

namespace App\Http\Requests;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('task')) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $projectId = $this->route('task')?->project_id;

        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status_id' => ['sometimes', 'integer', Rule::exists('statuses', 'id')->where('project_id', $projectId)],
            // parent_id changes are validated for cycles inside the controller (the model
            // already knows its descendant chain). null clears the parent (promotes to top-level).
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('tasks', 'id')->whereNull('deleted_at')->where('project_id', $projectId)],
            'priority' => ['sometimes', 'nullable', Rule::in(Task::PRIORITIES)],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'assignee_ids' => ['sometimes', 'nullable', 'array'],
            'assignee_ids.*' => ['integer', 'exists:users,id'],
        ];
    }
}
