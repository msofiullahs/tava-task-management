<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        // Forced-change flow skips the current-password check (the temp password is what we're replacing).
        $skipCurrent = (bool) $this->user()?->must_change_password;

        return [
            'current_password' => [$skipCurrent ? 'nullable' : 'required', 'string'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ];
    }

    public function messages(): array
    {
        return [
            'password.min' => 'Pick a password with at least 8 characters.',
            'password.confirmed' => 'The two passwords don\'t match.',
        ];
    }
}
