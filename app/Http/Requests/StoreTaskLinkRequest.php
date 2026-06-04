<?php

namespace App\Http\Requests;

use App\Models\TaskLink;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $sourceId = $this->route('task')?->id;

        return [
            'target_task_id' => [
                'required',
                'integer',
                Rule::exists('tasks', 'id'),
                // Source ≠ target — a task can't link to itself.
                Rule::notIn([$sourceId]),
            ],
            'type' => ['required', Rule::in(TaskLink::TYPES)],
        ];
    }

    public function messages(): array
    {
        return [
            'target_task_id.not_in' => 'A task can\'t be linked to itself.',
        ];
    }
}
