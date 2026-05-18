# Документація REST API MoneyTalks

## Інструмент: Scribe

Обрано **[Knuckles Scribe](https://scribe.knuckles.wtf/laravel)** для Laravel: з маршрутів та атрибутів/описів на контролерах генерується **HTML**, **OpenAPI 3** (`openapi.yaml`) та **колекція Postman** (`collection.json`). Це зручніше за ручний Swagger-анотатор у PHP, але еквівалентно для споживачів API (OpenAPI імпортується в Swagger UI, Stoplight, Insomnia тощо).

## Де лежать артефакти

Після генерації файли потрапляють у **`backend/public/docs/`**:

| Файл | Призначення |
|------|-------------|
| `index.html` | Інтерактивна документація, приклади `curl`/JS, «Try it out» |
| `openapi.yaml` | Специфікація OpenAPI 3.0.3 |
| `collection.json` | Postman Collection v2.1 |

У локальному середовищі DDEV веб-корінь — `public/`, тому URL виглядають так (підстав свій хост з `ddev describe`):

- `https://moneytalks.ddev.site/docs/index.html`
- `https://moneytalks.ddev.site/docs/openapi.yaml`
- `https://moneytalks.ddev.site/docs/collection.json`

Тип виводу в конфігурації: **`static`** (`config/scribe.php`) — згенеровані файли обслуговує веб-сервер **без** необхідності ставити пакет Scribe у production (`composer install --no-dev`).

Повний список маршрутів:
- **Auth**: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`
- **User/Profile**: `/api/user`, `/api/profile`
- **Transactions**: `/api/transactions` (GET, POST, PUT, DELETE)
- **Stats**: `/api/stats/summary`

## Як оновити документацію

З каталогу `backend/` (потрібні dev-залежності Composer, тобто без `--no-dev`):

```bash
composer run docs
```

Еквівалентно: `php artisan scribe:generate`.

Опційно в `.env` можна задати **`SCRIBE_AUTH_KEY`** (діючий Sanctum-токен), щоб Scribe міг виконувати автентифіковані «response calls» під час генерації. Для поточного репозиторію основні відповіді також задані атрибутом `#[Response(...)]` на контролерах.

## Де описувати API в коді

- Маршрути: `backend/routes/api.php`
- Опис ендпоінтів, груп, тіла запиту та прикладів відповідей: атрибути `Knuckles\Scribe\Attributes\*` на контролерах у `backend/app/Http/Controllers/Api/`
- Загальні налаштування (назва, вступ, Bearer, порядок груп): `backend/config/scribe.php`

Політика оновлення документації при змінах API — у [TZ.md § 4.5](./TZ.md#45-документація-api) та [README.md](./README.md).
