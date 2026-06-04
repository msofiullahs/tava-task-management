<?php

use Illuminate\Support\Facades\Route;

// SPA catch-all: every non-API request returns the React shell so client routing works.
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api|sanctum|up).*$');
