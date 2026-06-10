# Type-Safe API Client Generator

TypeScript-проєкт, що реалізує типобезпечний API client generator з перевіркою на рівні типів.

## Структура

```
src/
  api-schema.ts    — опис схеми API (endpoints, methods, params, body, response)
  types.ts         — всі допоміжні TypeScript-типи
  api-client.ts    — реалізація ApiClient і допоміжних функцій
  demo.ts          — демонстрація коректного використання
  type-tests.ts    — тести типізації через @ts-expect-error
```

## Запуск

```bash
npm install
npm run build     # компіляція tsc
npm run demo      # запуск демо
```

## TypeScript-можливості

| Тип | Призначення |
|-----|-------------|
| `ExtractRouteParams<Path>` | Витягує `:param` з рядка маршруту |
| `RequestConfig<Endpoint>` | Збирає config (params/query/body) для конкретного endpoint'а |
| `ResponseOf<Schema, Path, Method>` | Тип відповіді для конкретного виклику |
| `MethodsOf<Schema, Path>` | Доступні HTTP-методи для path |
| `PathsWithMethod<Schema, Method>` | Paths, які підтримують вказаний метод |

## Що перевіряє TypeScript на етапі компіляції

- Path має бути відомим маршрутом зі схеми
- Method залежить від конкретного Path
- `params` обов'язкові, якщо шлях містить `:param`
- `body` обов'язковий тільки там, де описаний у схемі
- `query` дозволений тільки там, де описаний у схемі
- Тип відповіді виводиться автоматично

## Додаткові features

- Middleware (before / after / onError)
- Runtime-валідація params
- `buildUrl()` — підстановка params у шаблон маршруту
- `buildQuery()` — серіалізація query string
- Strict mode: `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`
# HW7
