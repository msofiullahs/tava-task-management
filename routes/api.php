<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\PasswordResetController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SetupController;
use App\Http\Controllers\Api\StatusController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\TaskLinkController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// First-run wizard. Controller throws 409 once any user exists.
Route::post('/setup', [SetupController::class, 'store']);
Route::get('/setup/status', [SetupController::class, 'status']);

Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout']);

// Public forgot-password endpoint — creates a request row that admins see on People page.
Route::post('/password/forgot', [PasswordResetController::class, 'store']);

Route::middleware('auth:sanctum')->group(function () {
    // Current user / self-service
    Route::get('/user', [AuthController::class, 'current']);
    Route::patch('/user', [AuthController::class, 'updateProfile']);
    Route::post('/user/password', [AuthController::class, 'changePassword']);
    Route::patch('/user/preferences', [AuthController::class, 'updatePreferences']);
    Route::post('/user/avatar', [AuthController::class, 'uploadAvatar']);
    Route::delete('/user/avatar', [AuthController::class, 'removeAvatar']);

    // Admin-only user management
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::patch('/users/{user}', [UserController::class, 'update']);
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);

    // Projects
    Route::get('/projects', [ProjectController::class, 'index']);
    Route::post('/projects', [ProjectController::class, 'store']);
    Route::get('/projects/{project}', [ProjectController::class, 'show']);
    Route::patch('/projects/{project}', [ProjectController::class, 'update']);
    Route::delete('/projects/{project}', [ProjectController::class, 'destroy']);
    Route::patch('/projects/{project}/members', [ProjectController::class, 'updateMembers']);

    // Statuses (project-scoped create/list, direct mutate by id)
    Route::get('/projects/{project}/statuses', [StatusController::class, 'index']);
    Route::post('/projects/{project}/statuses', [StatusController::class, 'store']);
    Route::patch('/statuses/{status}', [StatusController::class, 'update']);
    Route::delete('/statuses/{status}', [StatusController::class, 'destroy']);

    // Tasks
    Route::get('/projects/{project}/tasks', [TaskController::class, 'index']);
    Route::post('/projects/{project}/tasks', [TaskController::class, 'store']);
    Route::get('/tasks/{task}', [TaskController::class, 'show']);
    Route::patch('/tasks/{task}', [TaskController::class, 'update']);
    Route::patch('/tasks/{task}/move', [TaskController::class, 'move']);
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
    Route::post('/tasks/{task}/restore', [TaskController::class, 'restore'])->withTrashed();

    // Task links — relates_to (symmetric) / blocks / duplicates. Picker on the SPA
    // sends one direction; the controller normalises symmetric types.
    Route::get('/tasks/{task}/links', [TaskLinkController::class, 'index']);
    Route::post('/tasks/{task}/links', [TaskLinkController::class, 'store']);
    Route::delete('/links/{link}', [TaskLinkController::class, 'destroy']);

    // Subtasks — convenience wrapper around tasks.store that inherits project + status.
    Route::post('/tasks/{task}/subtasks', [TaskController::class, 'storeSubtask']);

    // Comments
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index']);
    Route::post('/tasks/{task}/comments', [CommentController::class, 'store']);
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy']);

    // Attachments — polymorphic to tasks + comments. List + write endpoints stay here
    // (SPA-only, called via axios). The actual file download is registered in web.php
    // under the same `attachments.download` name so direct browser visits work.
    Route::get('/attachments', [AttachmentController::class, 'index']);
    Route::post('/attachments', [AttachmentController::class, 'store']);
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy']);

    // Admin-only: pending forgot-password requests + one-click fulfil (resets + returns temp password).
    Route::get('/password/requests', [PasswordResetController::class, 'index']);
    Route::post('/password/requests/{passwordResetRequest}/fulfill', [PasswordResetController::class, 'fulfill']);
    Route::delete('/password/requests/{passwordResetRequest}', [PasswordResetController::class, 'destroy']);
});
