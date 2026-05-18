<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Knuckles\Scribe\Attributes\BodyParam;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;
use Knuckles\Scribe\Attributes\Unauthenticated;
use Knuckles\Scribe\Attributes\Authenticated;

#[Group('Authentication')]
class AuthController extends Controller
{
    /**
     * Реєстрація нового користувача за email та паролем.
     */
    #[Unauthenticated]
    #[BodyParam('name', 'string', "Ім'я користувача.", true, 'Іван')]
    #[BodyParam('email', 'string', 'Email адреса.', true, 'ivan@example.com')]
    #[BodyParam('password', 'string', 'Пароль (мінімум 8 символів).', true, 'secret12')]
    #[BodyParam('password_confirmation', 'string', 'Підтвердження пароля.', true, 'secret12')]
    #[Response([
        'token' => '1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'user' => [
            'id' => 1,
            'name' => 'Іван',
            'email' => 'ivan@example.com',
        ],
    ], 201, 'Успіх')]
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'                  => ['required', 'string', 'max:120'],
            'email'                 => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password'              => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ], 201);
    }

    /**
     * Вхід за email та паролем.
     */
    #[Unauthenticated]
    #[BodyParam('email', 'string', 'Email адреса.', true, 'ivan@example.com')]
    #[BodyParam('password', 'string', 'Пароль.', true, 'secret12')]
    #[Response([
        'token' => '1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'user' => [
            'id' => 1,
            'name' => 'Іван',
            'email' => 'ivan@example.com',
        ],
    ], 200, 'Успіх')]
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email'    => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Невірний email або пароль.'],
            ]);
        }

        // Видаляємо старі mobile-токени, щоб не накопичувались
        $user->tokens()->where('name', 'mobile')->delete();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ],
        ]);
    }

    /**
     * Вихід — відкликає поточний токен.
     */
    #[Authenticated]
    #[Response(status: 204, description: 'Токен відкликано')]
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(null, 204);
    }
}
