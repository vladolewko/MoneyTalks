<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Knuckles\Scribe\Attributes\BodyParam;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;
use Knuckles\Scribe\Attributes\Unauthenticated;

#[Group('Authentication')]
#[Unauthenticated]
class DeviceAuthController extends Controller
{
    /**
     * Реєстрація або вхід за пристроєм.
     *
     * Клієнт надсилає стабільний `device_uuid`. Якщо користувач з таким ідентифікатором існує — повертається новий токен; інакше створюється новий обліковий запис.
     */
    #[BodyParam('device_uuid', 'string', 'Стабільний UUID пристрою (зберігається в AsyncStorage на клієнті).', true, '550e8400-e29b-41d4-a716-446655440000')]
    #[Response([
        'token' => '1|xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'user' => [
            'id' => 1,
            'device_uuid' => '550e8400-e29b-41d4-a716-446655440000',
        ],
    ], 200, 'Успіх')]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_uuid' => ['required', 'string', 'max:64'],
        ]);

        $user = User::query()->firstOrCreate(
            ['device_uuid' => $validated['device_uuid']],
            [
                'name' => 'MoneyTalks',
                'email' => 'device-'.Str::lower(Str::uuid()).'@devices.moneytalks',
                'password' => Hash::make(Str::password(32)),
            ],
        );

        $user->tokens()->where('name', 'mobile')->delete();
        $token = $user->createToken('mobile')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'device_uuid' => $user->device_uuid,
            ],
        ]);
    }
}
