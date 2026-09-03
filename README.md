# Timeline — планировщик расписания аренды площадок

> Веб-приложение для визуального составления расписания занятий на льду/площадках.  
> Активная версия: https://x125.ru/timeline/

---

## Содержание

- [Стек](#стек)
- [Архитектура](#архитектура)
- [Быстрый старт](#быстрый-старт)
- [Структура проекта](#структура-проекта)
- [База данных](#база-данных)
- [API](#api)
- [Сборка и деплой](#сборка-и-деплой)
- [Конфигурация](#конфигурация)
- [Логика отрисовки слотов](#логика-отрисовки-слотов)
- [Распространённые проблемы](#распространённые-проблемы)
- [Разработка и планы](#разработка-и-планы)

---

## Стек

| Слой | Технология |
|------|------------|
| Frontend | Svelte 4 + Vite 5 |
| UI | Flowbite Svelte, Tailwind CSS |
| Canvas | HTML5 Canvas (основной таймлайн) |
| Шрифт | Rubik через Google WebFont |
| Backend API | PostgreSQL RPC-функции (PL/pgSQL), вызываемые по HTTP |
| Авторизация | UUID-токены, передаваемые в `Authorization: Token <uuid>` |
| Хостинг frontend | `/var/www/html/timeline/` (Caddy) |
| API endpoint | `https://api.x125.ru/timeline` |

---

## Архитектура

```
┌─────────────────┐         POST JSON         ┌─────────────────────┐
│  Browser (SPA)  │  ──────────────────────▶  │  api.x125.ru/timeline │
│  /timeline/     │  Authorization: Token ...   │  PostgreSQL RPC      │
└─────────────────┘                           └─────────────────────┘
         │                                               │
         │                                               │
         ▼                                               ▼
 /timeline/config.js                              timeline.* schema
 (window.API_HOST)
```

### Поток данных

1. `index.html` загружает `/timeline/config.js`, который задаёт `window.API_HOST`.
2. `src/lib/api.js` шлёт POST-запросы на `${API_HOST}/<rpc>`.
3. Backend вызывает PostgreSQL-функции схемы `timeline`.
4. Слоты хранятся в `timeline.values` как `jsonb`.
5. Canvas-таймлайн отрисовывает дни, часы и слоты.

---

## Быстрый старт

### Требования

- Node.js 18+
- `pnpm` (рекомендуется) или `npm`

### Установка

```bash
git clone https://github.com/neuroplane/timeline.git
cd timeline
pnpm install
```

### Локальная разработка

```bash
pnpm dev
```

Откроется `http://localhost:5173/timeline/` (base path `/timeline` задан в `vite.config.js`).

> **Важно**: для работы с API нужен файл `public/config.js` с `window.API_HOST = "https://api.x125.ru/timeline"`.
> При билде `public/config.js` не попадает в `dist`, поэтому в продакшене он прописывается отдельно.

### Сборка

```bash
pnpm build
```

Результат в `dist/`. Статика раскладывается на сервере в `/var/www/html/timeline/`.

---

## Структура проекта

```
timeline/
├── index.html                 # точка входа SPA
├── package.json
├── vite.config.js             # base: '/timeline'
├── TODO.md                    # план улучшений
├── src/
│   ├── main.js                # загрузка шрифта Rubik, монтирование App
│   ├── App.svelte             # обёртка авторизации
│   ├── app.pcss               # глобальные Tailwind стили
│   ├── components/
│   │   ├── Auth.svelte        # логин
│   │   ├── Wrapper.svelte     # шапка, выбор зоны, даты, кнопки
│   │   ├── CanvasTimeline.svelte   # основной таймлайн на Canvas
│   │   ├── Menu.svelte        # контекстное меню слота
│   │   ├── WeekMenu.svelte    # копирование недель
│   │   ├── ExportModal.svelte # экспорт
│   │   ├── SettingsMenu.svelte# настройки
│   │   └── Timeline.svelte    # устаревший SVG-таймлайн (не используется)
│   ├── lib/
│   │   ├── api.js             # HTTP-клиент + RPC-методы
│   │   ├── constants.js       # SPOT_DURATION, SLOTS_PER_HOUR, START_HOUR
│   │   └── MainStore.js       # Svelte stores
│   └── data.js                # fallback-данные зон
├── sql/
│   ├── migration.sql          # начальная схема + seed
│   ├── api/
│   │   ├── slots.sql          # timeline.slots(...)
│   │   ├── slots_save.sql     # timeline.slots_save(...)
│   │   ├── export.sql         # timeline.export(...)
│   │   ├── zones.sql          # timeline.zones
│   │   ├── zones_set.sql      # timeline.zones_set(...)
│   │   └── admin_keys.sql     # timeline.admin_keys(...)
│   └── users/
│       └── *.sql              # auth/роли
└── dist/                      # production bundle
```

---

## База данных

### Схема `timeline`

| Таблица | Назначение |
|---------|------------|
| `users` | id, name, login, password, role, token(uuid) |
| `zones` | id, label, label_short, types(jsonb), tags(jsonb) |
| `values` | zone, date, time, value(jsonb) — основные слоты |
| `values_backup` | резервная копия values |

### Таблица `values`

```text
zone   | integer  | часть PK
   date   | date     | часть PK
   time   | time     | часть PK
   value  | jsonb    | данные слота
```

### Структура `value` (jsonb)

```json
{
  "key": "2026-09-03 09:00",
  "i": { "h": 9, "m": 0 },
  "length": 4,
  "rest": ["2026-09-03 09:15", "2026-09-03 09:30", "2026-09-03 09:45"],
  "type": 13,
  "tags": [3],
  "label": "0",
  "comment": ""
}
```

Поле `length` = количество 15-минутных спотов в объединённом блоке.  
Поле `h: true` — признак "скрытого" слота, входящего в `rest` главного слота.  
`type` — id типа из `zones.types`.

### Пример запроса

```sql
SELECT time, value
FROM timeline.values
WHERE zone = 1
  AND date = '2026-09-03'
ORDER BY time;
```

---

## API

Все запросы POST, JSON body, заголовок `Authorization: Token <uuid>` для protected-методов.

| Endpoint | Функция | Описание |
|----------|---------|----------|
| `/users/me` | `timeline.get_user` | проверка токена |
| `/users/auth` | `timeline.auth` | логин/пароль → токен |
| `/zones` | `timeline.zones` | список зон |
| `/zones/set` | `timeline.zones_set` | обновить зону (types/tags) |
| `/slots` | `timeline.slots` | слоты за период |
| `/slots/save` | `timeline.slots_save` | сохранить изменённые слоты |
| `/export` | `timeline.export` | экспорт расписания |
| `/admin/keys` | `timeline.admin_keys` | список системных пользователей |

### Пример: получить слоты

```bash
curl -X POST https://api.x125.ru/timeline/slots \
  -H "Authorization: Token <uuid>" \
  -d '{"zone":1,"from":"2026-09-01","to":"2026-09-07"}'
```

---

## Сборка и деплой

### Ручной деплой

```bash
pnpm build
scp -r dist/* neuroplane@x125.ru:/var/www/html/timeline/
```

После сборки `index.html` ссылается на `assets/index-*.js` и `assets/index-*.css`.  
Продовский `config.js` должен лежать в `/var/www/html/timeline/config.js`.

### Откат на предыдущий бандл

Если новая версия сломалась, переключите `index.html` на предыдущий JS из `dist/assets/`:

```bash
ssh neuroplane@x125.ru "sed -i 's/index-NEW\.js/index-OLD\.js/' /var/www/html/timeline/index.html"
```

### Резервные теги

Тег `backup-2026-09-03` создан на исходном состоянии:

```bash
git show backup-2026-09-03 --stat
```

---

## Конфигурация

### `public/config.js` (для dev)

```javascript
window.API_HOST = "https://api.x125.ru/timeline";
```

### `src/lib/constants.js` (frontend-константы)

```javascript
export const SPOT_DURATION = 15;       // длина одного слота в минутах
export const SLOTS_PER_HOUR = 60 / SPOT_DURATION;
export const START_HOUR = 7;           // начало дня
export const END_HOUR = 24;            // конец дня
export const WORK_HOURS = END_HOUR - START_HOUR;
```

> Для копии под 20-минутные споты достаточно изменить `SPOT_DURATION` и завести отдельную базу/API.

---

## Логика отрисовки слотов

1. `handleDateChange()` генерирует массив `day.slots` — по одному объекту на каждый 15-минутный интервал от `START_HOUR` до `END_HOUR`.
2. `getSlots()` запрашивает сохранённые слоты и мержит их в `$slotsInfo` (key → jsonb value).
3. `drawHeader()` рисует часы и чёт/нечёт подложку.
4. `drawOneLine()` рисует один день:
   - слот с `h: true` пропускается (он уже нарисован в составе главного);
   - главный слот рисуется шириной `slotSizeX * length`;
   - счётчик `i` увеличивается на `info.length`, чтобы следующий слот шёл сразу после группы.
5. `genLabel()` формирует подпись: `0`, `00-30`, `09:00-09:45`, `09:00 - 10:00`.

---

## Распространённые проблемы

| Симптом | Причина | Решение |
|---------|---------|---------|
| Ряд визуально короче, пропали 15 мин | Есть `h: true` слот без родительского `rest` | Удалить осиротевшие записи или проверить `slots_save` |
| Слоты смещены относительно заголовков | `startHour` и `workHours` не синхронизированы | Убедиться, что оба цикла используют одни константы |
| Пустой экран, 404 `config.js` | В `index.html` неправильный путь к `config.js` | `/timeline/config.js` вместо `/config.js` |
| Цвета разные в разных залах | `zones.types` отличаются | Скопировать `types` из эталонной зоны |

---

## Разработка и планы

См. [TODO.md](./TODO.md).

Ключевые направления:

1. Вынести все хардкод-значения в `constants.js` и конфиг БД.
2. Добавить валидацию в `slots_save` (пересечения, осиротевшие `h`).
3. Миграции SQL вместо хаотичных `.sql`-файлов.
4. Тесты для логики группировки слотов.
5. Удалить неиспользуемый `Timeline.svelte` (SVG).

---

## Лицензия

Проект друга — форк: https://github.com/neuroplane/timeline  
Оригинал: https://github.com/romanesko/timeline
