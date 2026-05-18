<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Knuckles\Scribe\Attributes\Authenticated;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;

#[Group('Profile')]
#[Authenticated]
class CurrentUserController extends Controller
{
    /**
     * Поточний автентифікований користувач (перевірка токена).
     */
    #[Response([
        'id' => 1,
        'name' => 'MoneyTalks',
        'email' => 'device-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx@devices.moneytalks',
        'device_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        'email_verified_at' => null,
        'created_at' => '2026-05-11T12:00:00.000000Z',
        'updated_at' => '2026-05-11T12:00:00.000000Z',
    ], 200)]
    public function __invoke(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json($user);
    }
}
