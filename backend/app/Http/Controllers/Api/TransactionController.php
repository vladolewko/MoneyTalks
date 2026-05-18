<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Knuckles\Scribe\Attributes\Authenticated;
use Knuckles\Scribe\Attributes\BodyParam;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;
use Knuckles\Scribe\Attributes\UrlParam;

#[Group('Transactions')]
#[Authenticated]
class TransactionController extends Controller
{
    /**
     * Список транзакцій поточного користувача (пагінація Laravel).
     */
    #[Response([
        'data' => [],
        'current_page' => 1,
        'per_page' => 50,
        'total' => 0,
    ], 200)]
    public function index(Request $request): JsonResponse
    {
        $transactions = $request->user()
            ->transactions()
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json($transactions);
    }

    /**
     * Створити транзакцію (дохід або витрата).
     */
    #[BodyParam('type', 'string', 'Тип: `income` або `expense`.', true, 'expense', ['income', 'expense'])]
    #[BodyParam('amount', 'number', 'Сума, більше 0.', true, 150.5)]
    #[BodyParam('currency', 'string', 'ISO 4217, 3 символи. За замовчуванням UAH.', false, 'UAH')]
    #[BodyParam('category', 'string', 'Категорія (опційно).', false, 'Продукти')]
    #[BodyParam('note', 'string', 'Нотатка (опційно).', false, 'Ринок')]
    #[BodyParam('occurred_at', 'string', 'ISO 8601 дата/час події (опційно; якщо немає — поточний час сервера).', false, '2026-05-11T12:00:00Z')]
    #[Response([
        'id' => 1,
        'user_id' => 1,
        'type' => 'expense',
        'amount' => '150.50',
        'currency' => 'UAH',
        'category' => 'Продукти',
        'note' => 'Ринок',
        'occurred_at' => '2026-05-11T12:00:00.000000Z',
        'created_at' => '2026-05-11T12:00:00.000000Z',
        'updated_at' => '2026-05-11T12:00:00.000000Z',
    ], 201)]
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'category' => ['nullable', 'string', 'max:120'],
            'note' => ['nullable', 'string', 'max:2000'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        $transaction = $request->user()->transactions()->create([
            'type' => $validated['type'],
            'amount' => $validated['amount'],
            'currency' => strtoupper($validated['currency'] ?? 'UAH'),
            'category' => $validated['category'] ?? null,
            'note' => $validated['note'] ?? null,
            'occurred_at' => isset($validated['occurred_at'])
                ? $validated['occurred_at']
                : now(),
        ]);

        return response()->json($transaction, 201);
    }

    /**
     * Оновити транзакцію. Чужі записи повертають 404.
     */
    #[UrlParam('transaction', 'integer', 'ID транзакції.', true, 1)]
    #[BodyParam('type', 'string', 'Тип: `income` або `expense`.', false, 'expense', ['income', 'expense'])]
    #[BodyParam('amount', 'number', 'Сума, більше 0.', false, 150.5)]
    #[BodyParam('currency', 'string', 'ISO 4217, 3 символи.', false, 'UAH')]
    #[BodyParam('category', 'string', 'Категорія (опційно).', false, 'Продукти')]
    #[BodyParam('note', 'string', 'Нотатка (опційно).', false, 'Ринок')]
    #[BodyParam('occurred_at', 'string', 'ISO 8601 дата/час події.', false, '2026-05-11T12:00:00Z')]
    #[Response([
        'id' => 1,
        'user_id' => 1,
        'type' => 'expense',
        'amount' => '150.50',
        'currency' => 'UAH',
        'category' => 'Продукти',
        'note' => 'Ринок',
        'occurred_at' => '2026-05-11T12:00:00.000000Z',
        'created_at' => '2026-05-11T12:00:00.000000Z',
        'updated_at' => '2026-05-11T12:00:00.000000Z',
    ], 200)]
    public function update(Request $request, Transaction $transaction): JsonResponse
    {
        if ($transaction->user_id !== $request->user()->id) {
            abort(404);
        }

        $validated = $request->validate([
            'type'        => ['sometimes', Rule::in(['income', 'expense'])],
            'amount'      => ['sometimes', 'numeric', 'min:0.01'],
            'currency'    => ['sometimes', 'string', 'size:3'],
            'category'    => ['nullable', 'string', 'max:120'],
            'note'        => ['nullable', 'string', 'max:2000'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        if (isset($validated['currency'])) {
            $validated['currency'] = strtoupper($validated['currency']);
        }

        $transaction->update($validated);

        return response()->json($transaction->fresh());
    }

    /**
     * Видалити транзакцію. Чужі записи повертають 404.
     */
    #[UrlParam('transaction', 'integer', 'ID транзакції.', true, 1)]
    #[Response(status: 204, description: 'Успішно видалено')]
    public function destroy(Request $request, Transaction $transaction): JsonResponse
    {
        if ($transaction->user_id !== $request->user()->id) {
            abort(404);
        }

        $transaction->delete();

        return response()->json(null, 204);
    }
}
