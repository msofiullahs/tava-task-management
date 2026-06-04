<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class UserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', User::class);

        return UserResource::collection(User::query()->orderBy('name')->get());
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        // Email is out of scope (spec §12) — admin generates the temp password and shares it manually.
        $tempPassword = self::generateTempPassword();

        $user = User::create([
            'name' => $request->string('name'),
            'email' => $request->string('email'),
            'password' => $tempPassword,
            'role' => $request->string('role'),
            'must_change_password' => true,
        ]);

        return response()->json([
            'user' => new UserResource($user),
            'temp_password' => $tempPassword,
        ], 201);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();

        // Guard against demoting the last admin — leaves the install with no one who can manage users.
        if (isset($data['role']) && $user->role === User::ROLE_ADMIN && $data['role'] !== User::ROLE_ADMIN) {
            $otherAdmins = User::where('role', User::ROLE_ADMIN)->where('id', '!=', $user->id)->count();
            if ($otherAdmins === 0) {
                return response()->json([
                    'message' => 'You can\'t change the role of the only Admin. Promote someone else first.',
                ], 422);
            }
        }

        $user->fill($data)->save();

        return response()->json(['user' => new UserResource($user->fresh())]);
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->can('resetPassword', $user)) {
            throw new AuthorizationException;
        }

        $temp = self::generateTempPassword();
        $user->forceFill([
            'password' => $temp,
            'must_change_password' => true,
        ])->save();

        return response()->json([
            'user' => new UserResource($user->fresh()),
            'temp_password' => $temp,
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if (! $request->user()->can('delete', $user)) {
            throw new AuthorizationException;
        }

        $user->delete();

        return response()->json(['message' => 'User removed.']);
    }

    /** Friendly-but-strong: 12 chars, mix of letters/digits, no easily-confused glyphs (0/O, 1/l). */
    public static function generateTempPassword(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        $out = '';
        for ($i = 0; $i < 12; $i++) {
            $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $out;
    }
}
