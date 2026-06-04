<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lives under web.php so the standard session middleware handles auth — bare
 * browser navigations (right-click → open image in new tab) work the same as
 * inline `<img>` tags fetched by the SPA.
 */
class FileServeController extends Controller
{
    /** Stream a user's avatar with permissive cache headers — image is keyed by updated_at. */
    public function avatar(Request $request, User $user): Response
    {
        if (! $user->avatar_path || ! Storage::disk('local')->exists($user->avatar_path)) {
            abort(404);
        }

        $mime = Storage::disk('local')->mimeType($user->avatar_path) ?: 'image/jpeg';

        return Storage::disk('local')->response(
            $user->avatar_path,
            'avatar',
            [
                'Content-Type' => $mime,
                // Avatar URL carries a ?v= cache-buster from User::avatarUrl(),
                // so this can be cached aggressively per-version.
                'Cache-Control' => 'private, max-age=86400',
            ],
            'inline',
        );
    }
}
