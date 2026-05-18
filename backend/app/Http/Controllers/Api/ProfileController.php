<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Knuckles\Scribe\Attributes\Authenticated;
use Knuckles\Scribe\Attributes\BodyParam;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;

#[Group('Profile')]
#[Authenticated]
class ProfileController extends Controller
{
    /**
     * Оновити профіль поточного користувача.
     */
    #[BodyParam('name', 'string', "Нове ім'я користувача.", false, 'Іван')]
    #[Response([
        'id'    => 1,
        'name'  => 'Іван',
        'email' => 'ivan@example.com',
    ], 200)]
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'id'    => $user->id,
            'name'  => $user->name,
            'email' => $user->email,
        ]);
    }
}
