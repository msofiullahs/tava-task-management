<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Five seeded users on the @lumendgital.id domain. Each gets a unique password
 * so login attempts are realistic — there's no shared default. Maya keeps the
 * must_change_password flag set so the forced-change flow is one click away.
 *
 * The credentials map below is the single source of truth — keep README and
 * any other seeders in sync if you change names/emails here.
 */
class UserSeeder extends Seeder
{
    /** @var array<int, array{name: string, email: string, password: string, role: string, must_change?: bool}> */
    public const ACCOUNTS = [
        [
            'name' => 'Alex Park',
            'email' => 'alex@lumendgital.id',
            'password' => 'AdminLumen!26',
            'role' => User::ROLE_ADMIN,
        ],
        [
            'name' => 'Sam Rivera',
            'email' => 'sam@lumendgital.id',
            'password' => 'SamRivera26!',
            'role' => User::ROLE_MEMBER,
        ],
        [
            'name' => 'Jordan Lee',
            'email' => 'jordan@lumendgital.id',
            'password' => 'JordanLee26!',
            'role' => User::ROLE_MEMBER,
        ],
        [
            'name' => 'Maya Singh',
            'email' => 'maya@lumendgital.id',
            // Same shape as the others, but must_change_password forces the change-screen
            // on first sign-in so the flow can be tested without a real reset.
            'password' => 'MayaSingh26!',
            'role' => User::ROLE_MEMBER,
            'must_change' => true,
        ],
        [
            'name' => 'Chris Okafor',
            'email' => 'chris@lumendgital.id',
            'password' => 'ChrisView26!',
            'role' => User::ROLE_GUEST, // UI label: "Viewer"
        ],
    ];

    public function run(): void
    {
        foreach (self::ACCOUNTS as $account) {
            User::updateOrCreate(
                ['email' => $account['email']],
                [
                    'name' => $account['name'],
                    'password' => $account['password'],
                    'role' => $account['role'],
                    'must_change_password' => $account['must_change'] ?? false,
                ],
            );
        }
    }
}
