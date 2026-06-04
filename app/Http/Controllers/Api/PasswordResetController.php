<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RequestPasswordResetRequest;
use App\Http\Resources\UserResource;
use App\Models\PasswordResetRequest;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PasswordResetController extends Controller
{
    /**
     * Anyone can submit "I forgot my password". We always reply with the same success
     * message (regardless of whether the email matches a real user) so this endpoint
     * doesn't double as an email-existence oracle.
     */
    public function store(RequestPasswordResetRequest $request): JsonResponse
    {
        $email = strtolower(trim($request->input('email')));
        $user = User::where('email', $email)->first();

        // Throttle: collapse repeated requests within the same hour to one row.
        $existing = PasswordResetRequest::where('email', $email)
            ->whereNull('fulfilled_at')
            ->where('created_at', '>=', now()->subHour())
            ->first();

        if (! $existing) {
            PasswordResetRequest::create([
                'email' => $email,
                'user_id' => $user?->id,
            ]);
        }

        return response()->json([
            'message' => 'Got it. An admin will reset your password and share the new one with you.',
        ]);
    }

    /** Admin-only: list pending requests. */
    public function index(Request $request): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            throw new AuthorizationException;
        }

        $requests = PasswordResetRequest::query()
            ->whereNull('fulfilled_at')
            ->with(['user'])
            ->latest()
            ->get()
            ->map(fn (PasswordResetRequest $r) => [
                'id' => $r->id,
                'email' => $r->email,
                'user' => $r->user ? [
                    'id' => $r->user->id,
                    'name' => $r->user->name,
                    'role' => $r->user->role,
                ] : null,
                'created_at' => $r->created_at,
            ]);

        return response()->json(['data' => $requests]);
    }

    /**
     * Admin-only: one-click "reset + share". Generates a new temp password for the
     * requesting user, marks the request fulfilled, and returns the password for the
     * admin to copy and hand over (Slack / in-person / etc — no email is sent).
     */
    public function fulfill(Request $request, PasswordResetRequest $passwordResetRequest): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            throw new AuthorizationException;
        }

        if ($passwordResetRequest->fulfilled_at !== null) {
            return response()->json(['message' => 'That request was already handled.'], 422);
        }

        $user = $passwordResetRequest->user;
        if (! $user) {
            return response()->json([
                'message' => 'No account with that email exists. The user may have typed it wrong.',
            ], 422);
        }

        $temp = UserController::generateTempPassword();
        $user->forceFill([
            'password' => $temp,
            'must_change_password' => true,
        ])->save();

        $passwordResetRequest->forceFill([
            'fulfilled_at' => now(),
            'fulfilled_by' => $request->user()->id,
        ])->save();

        return response()->json([
            'user' => new UserResource($user->fresh()),
            'temp_password' => $temp,
        ]);
    }

    /** Dismiss a request without resetting (e.g. typo / spam). */
    public function destroy(Request $request, PasswordResetRequest $passwordResetRequest): JsonResponse
    {
        if (! $request->user()?->isAdmin()) {
            throw new AuthorizationException;
        }
        $passwordResetRequest->delete();

        return response()->json(['message' => 'Dismissed.']);
    }
}
