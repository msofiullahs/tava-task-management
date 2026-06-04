<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Five test users covering every role. Same password for all (so logins are easy
 * to remember during exploration). One of the members has `must_change_password`
 * set so you can exercise the force-change-password flow without rummaging
 * through the People page.
 */
class UserSeeder extends Seeder
{
    public const PASSWORD = 'password';

    public function run(): void
    {
        User::updateOrCreate(['email' => 'alex@tava.test'], [
            'name' => 'Alex Park',
            'password' => self::PASSWORD,
            'role' => User::ROLE_ADMIN,
        ]);

        User::updateOrCreate(['email' => 'sam@tava.test'], [
            'name' => 'Sam Rivera',
            'password' => self::PASSWORD,
            'role' => User::ROLE_MEMBER,
        ]);

        User::updateOrCreate(['email' => 'jordan@tava.test'], [
            'name' => 'Jordan Lee',
            'password' => self::PASSWORD,
            'role' => User::ROLE_MEMBER,
        ]);

        // Maya simulates a freshly-invited teammate — must change her password on first sign-in.
        User::updateOrCreate(['email' => 'maya@tava.test'], [
            'name' => 'Maya Singh',
            'password' => self::PASSWORD,
            'role' => User::ROLE_MEMBER,
            'must_change_password' => true,
        ]);

        // Viewer / "guest" role — only sees tasks they're explicitly assigned.
        User::updateOrCreate(['email' => 'chris@tava.test'], [
            'name' => 'Chris Okafor',
            'password' => self::PASSWORD,
            'role' => User::ROLE_GUEST,
        ]);
    }
}
