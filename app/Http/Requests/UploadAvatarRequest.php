<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UploadAvatarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            // 2MB cap is comfortable for an avatar — keeps uploads quick and Plesk php.ini happy.
            'avatar' => ['required', 'file', 'image', 'mimes:jpg,jpeg,png,gif,webp', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'avatar.required' => 'Pick an image to upload.',
            'avatar.image' => 'Only JPG, PNG, GIF, or WebP images are supported.',
            'avatar.max' => 'That image is over 2 MB. Try a smaller one.',
        ];
    }
}
