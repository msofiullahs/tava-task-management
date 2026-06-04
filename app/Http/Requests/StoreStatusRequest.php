<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', \App\Models\Status::class) ?? false;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'before_id' => ['sometimes', 'nullable', 'integer', 'exists:statuses,id'],
            'after_id' => ['sometimes', 'nullable', 'integer', 'exists:statuses,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'color.regex' => 'Please use a 6-digit hex colour like #4f46e5.',
        ];
    }
}
