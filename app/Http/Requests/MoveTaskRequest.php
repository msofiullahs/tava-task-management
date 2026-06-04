<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveTaskRequest extends FormRequest
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
            'status_id' => ['required', 'integer', Rule::exists('statuses', 'id')->where('project_id', $projectId)],
            // Drop position is expressed as a neighbour pair so callers don't need to know LexoRank.
            'before_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'after_id' => ['nullable', 'integer', 'exists:tasks,id'],
        ];
    }
}
