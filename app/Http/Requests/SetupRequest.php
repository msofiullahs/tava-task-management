<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class SetupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Open by design; the controller refuses once any user exists.
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'seed_sample' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.min' => 'Pick a password with at least 8 characters.',
            'email.email' => 'That doesn\'t look like a valid email address.',
        ];
    }
}
