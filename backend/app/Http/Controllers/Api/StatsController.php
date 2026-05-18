<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Knuckles\Scribe\Attributes\Authenticated;
use Knuckles\Scribe\Attributes\Group;
use Knuckles\Scribe\Attributes\Response;

#[Group('Statistics')]
#[Authenticated]
class StatsController extends Controller
{
    /**
     * Підсумки доходів/витрат і помісячні суми для графіків (останні ~6 місяців).
     */
    #[Response([
        'totals' => [
            'income' => 12000.5,
            'expense' => 4300.0,
        ],
        'monthly' => [
            [
                'ym' => '2026-01',
                'income' => 8000.0,
                'expense' => 2100.0,
            ],
        ],
    ], 200)]
    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();

        $totals = $user->transactions()
            ->selectRaw('type, SUM(amount) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        $from = now()->subMonths(5)->startOfMonth();

        $rows = $user->transactions()
            ->where('occurred_at', '>=', $from)
            ->get(['occurred_at', 'type', 'amount']);

        $monthly = $rows
            ->groupBy(fn ($t) => $t->occurred_at->format('Y-m'))
            ->map(function ($group) {
                return [
                    'ym' => $group->first()->occurred_at->format('Y-m'),
                    'income' => (float) $group->where('type', 'income')->sum('amount'),
                    'expense' => (float) $group->where('type', 'expense')->sum('amount'),
                ];
            })
            ->values()
            ->sortBy('ym')
            ->values();

        return response()->json([
            'totals' => [
                'income' => (float) ($totals['income'] ?? 0),
                'expense' => (float) ($totals['expense'] ?? 0),
            ],
            'monthly' => $monthly,
        ]);
    }
}
