<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\FileServeController;
use Illuminate\Support\Facades\Route;

/*
 * Authenticated file-serving routes (attachments + avatars). These live in
 * web.php — NOT api.php — so they work when the user opens the URL directly
 * in a new tab. Sanctum's stateful-API middleware on /api requires a Referer
 * matching SANCTUM_STATEFUL_DOMAINS, which bare browser navigations don't
 * have. Web routes use the standard session-backed auth middleware instead.
 */
Route::middleware('auth')->group(function () {
    Route::get('/files/{attachment}', [AttachmentController::class, 'download'])
        ->name('attachments.download');

    Route::get('/avatars/{user}', [FileServeController::class, 'avatar'])
        ->name('users.avatar');
});

// SPA catch-all: every other request returns the React shell so client routing works.
// The negative lookahead excludes API, Sanctum's CSRF endpoint, the /up health-check,
// and the file-serving routes above.
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api|sanctum|up|files|avatars).*$');
