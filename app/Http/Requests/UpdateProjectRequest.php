<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('project')) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            // Reorder via position-between {before_id?, after_id?} — see ProjectController@update.
            'before_id' => ['sometimes', 'nullable', 'integer', 'exists:projects,id'],
            'after_id' => ['sometimes', 'nullable', 'integer', 'exists:projects,id'],
        ];
    }
}
