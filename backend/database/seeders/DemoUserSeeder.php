<?php

namespace Database\Seeders;

use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::firstOrCreate(
            ['email' => 'demo@moneytalks.com'],
            [
                'name' => 'Demo User',
                'password' => Hash::make('password'),
            ]
        );

        // Delete existing transactions for this user to ensure idempotency
        $user->transactions()->delete();

        $categories = [
            'expense' => ['Продукти', 'Кафе', 'Транспорт', 'Дім', 'Здоровʼя', 'Одяг', 'Інше', 'Розваги'],
            'income' => ['Зарплата', 'Фриланс', 'Переказ', 'Подарунок', 'Кешбек'],
        ];

        $now = Carbon::now();
        $transactions = [];

        for ($i = 0; $i < 150; $i++) {
            $date = clone $now;
            // Spread over the last 90 days
            $date->subDays(rand(0, 90))->subHours(rand(0, 23))->subMinutes(rand(0, 59));

            // 20% income, 80% expense
            $type = rand(1, 100) <= 20 ? 'income' : 'expense';
            $category = $categories[$type][array_rand($categories[$type])];
            
            if ($type === 'income') {
                $amount = $category === 'Зарплата' ? rand(30000, 50000) : rand(1000, 10000);
            } else {
                $amount = rand(50, 2500);
                if ($category === 'Дім') $amount = rand(5000, 15000); 
            }

            $transactions[] = [
                'user_id' => $user->id,
                'type' => $type,
                'amount' => $amount,
                'currency' => 'UAH',
                'category' => $category,
                'note' => rand(1, 100) > 70 ? 'Згенеровано автоматично' : null,
                'occurred_at' => $date->format('Y-m-d H:i:s'),
                'created_at' => $date->format('Y-m-d H:i:s'),
                'updated_at' => $date->format('Y-m-d H:i:s'),
            ];
        }

        foreach (array_chunk($transactions, 50) as $chunk) {
            Transaction::insert($chunk);
        }

        $this->command->info("Demo user created: demo@moneytalks.com / password");
        $this->command->info("Created 150 random transactions.");
    }
}
