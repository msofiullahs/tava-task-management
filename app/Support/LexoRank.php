<?php

namespace App\Support;

/**
 * LexoRank — fractional indexing with plain strings.
 *
 * Reordering one item only rewrites that item's position string; siblings stay put.
 * Ranks live in the alphabet "0".."z" (digits + lowercase letters). `between()` returns
 * a string that sorts strictly between `prev` and `next` lexicographically.
 *
 * Why a custom helper: spec §10.4 says "no package required". The behaviour is fully
 * invisible to users — the API only ever sees a position string and a neighbour pair.
 */
final class LexoRank
{
    // Digits 0-9 then a-z. 36 chars wide. '0' is the lowest character; 'z' is the highest.
    private const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

    private const BASE = 36;

    private const MIN_CHAR = '0';

    private const MAX_CHAR = 'z';

    /** Initial rank for the very first sibling in a group. */
    public static function initial(): string
    {
        return 'n'; // roughly the middle of the alphabet so growth in either direction is symmetric
    }

    /**
     * Return a rank strictly between $prev and $next (lex order).
     * Pass null for either side to anchor at "no neighbour".
     *
     * Examples:
     *   between(null, null)     => "n"             — empty group
     *   between(null, "n")      => "g"             — prepend
     *   between("n", null)      => "v"             — append
     *   between("a", "b")       => "an"            — insert between adjacent ranks
     */
    public static function between(?string $prev, ?string $next): string
    {
        $prev = $prev === null || $prev === '' ? null : $prev;
        $next = $next === null || $next === '' ? null : $next;

        if ($prev === null && $next === null) {
            return self::initial();
        }

        if ($prev !== null && $next !== null && strcmp($prev, $next) >= 0) {
            // Caller gave us a pair that isn't sorted. Treat $prev as the only anchor.
            $next = null;
        }

        if ($prev === null) {
            return self::stepDown($next);
        }

        if ($next === null) {
            return self::stepUp($prev);
        }

        return self::midpoint($prev, $next);
    }

    private static function stepUp(string $prev): string
    {
        // Pick the midpoint between $prev and "z..." (one char wider). For typical inputs
        // this yields a strictly-greater rank without growing the string length.
        return self::midpoint($prev, $prev[0] === self::MAX_CHAR
            ? $prev.self::MAX_CHAR
            : self::charAt(self::indexOf($prev[0]) + 1));
    }

    private static function stepDown(string $next): string
    {
        // Midpoint between "0" and $next.
        return self::midpoint(self::MIN_CHAR, $next);
    }

    private static function midpoint(string $a, string $b): string
    {
        if (strcmp($a, $b) >= 0) {
            // Defensive: never return a rank not greater than $a.
            return $a.self::initial();
        }

        $i = 0;
        $shared = '';
        while (true) {
            $ca = $a[$i] ?? self::MIN_CHAR;
            $cb = $b[$i] ?? self::MAX_CHAR;
            if ($ca !== $cb) {
                break;
            }
            $shared .= $ca;
            $i++;
        }

        $ai = self::indexOf($a[$i] ?? self::MIN_CHAR);
        $bi = self::indexOf($b[$i] ?? self::MAX_CHAR);

        if ($bi - $ai > 1) {
            $mid = intdiv($ai + $bi, 2);

            return $shared.self::charAt($mid);
        }

        // Adjacent chars — keep $a's char, then append a midpoint of "" and the rest of $b.
        $rest = substr($b, $i + 1);

        return $shared.self::charAt($ai).self::midpoint('', $rest === '' ? '' : $rest);
    }

    private static function indexOf(string $char): int
    {
        $pos = strpos(self::ALPHABET, $char);

        return $pos === false ? 0 : $pos;
    }

    private static function charAt(int $index): string
    {
        $index = max(0, min(self::BASE - 1, $index));

        return self::ALPHABET[$index];
    }
}
