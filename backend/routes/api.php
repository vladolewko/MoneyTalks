<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CurrentUserController;
use App\Http\Controllers\Api\DeviceAuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

// Пристроєва авторизація (legacy, залишається для сумісності)
Route::post('/auth/device', [DeviceAuthController::class, 'store']);

// Email / password авторизація
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::get('/user', CurrentUserController::class);
    Route::patch('/profile', [ProfileController::class, 'update']);

    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::put('/transactions/{transaction}', [TransactionController::class, 'update']);
    Route::delete('/transactions/{transaction}', [TransactionController::class, 'destroy']);

    Route::get('/stats/summary', [StatsController::class, 'summary']);
});
