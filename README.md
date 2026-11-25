# Аура · Special меню

Цифровое меню заведения **Аура** и рабочий каталог авторских кальянных миксов.

## Что внутри

- Веб-меню с вкладками **Меню** и **Special** (палитра: жёлтый / чёрный / оранжевый)
- 9 авторских миксов со сторитейлингом, зонами зала и процентами для станции
- Рабочие документы:
  - [`docs/AURA_Kontseptsiya.docx`](docs/AURA_Kontseptsiya.docx) (+ PDF)
  - [`docs/AURA_Special_miksy.docx`](docs/AURA_Special_miksy.docx) (+ PDF)
- Генераторы: `scripts/build-concept-doc.py`, `scripts/build-mixes-doc.py`

## Склад (`/stash`)

Склад табака в стиле Ауры (как The Stash, без смен/отчётов/таймеров):

- 2 точки: Широкая и Стрекалова
- бренды → ароматы → остатки (г)
- вход по email/паролю, 2 админа

Локально: скопируйте `.env.example` → `.env`, задайте секреты и админов, затем откройте [http://127.0.0.1:3847/stash](http://127.0.0.1:3847/stash).

### Выкат на Vercel + домен `hpaura.su`

1. Создай бесплатную БД [Turso](https://turso.tech) → скопируй `TURSO_DATABASE_URL` и `TURSO_AUTH_TOKEN`
2. В Vercel: **Add New Project** → подключи этот репозиторий (через GitHub-зеркало Origin или CLI `npx vercel`)
3. Environment Variables в Vercel:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `STASH_SESSION_SECRET` (длинная случайная строка)
   - `STASH_ADMIN_EMAIL` / `STASH_ADMIN_PASSWORD`
   - `STASH_ADMIN2_EMAIL` / `STASH_ADMIN2_PASSWORD`
4. Deploy
5. Domains → добавь `hpaura.su` и `www.hpaura.su`
6. У регистратора домена укажи DNS-записи, которые покажет Vercel (обычно A/CNAME)

Склад откроется как `https://hpaura.su/stash`.

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://127.0.0.1:3847](http://127.0.0.1:3847).

Документы в браузере (если PDF/Word не открываются из чата):

- [Карточка микса — варианты](http://127.0.0.1:3847/card) — разворот + оборот, QR пустой
- [Все файлы с превью](http://127.0.0.1:3847/files)
- Меню: [http://127.0.0.1:3847](http://127.0.0.1:3847)

Карточка: `npm run doc:card` → варианты `mist` / `horizon` / `orb` (PDF 2 стр.: внутри и оборот).
Статика в `public/files/`. Шрифты: `assets/fonts/`.

## Документ миксов

Пересобрать DOCX:

```bash
pip install python-docx
python3 scripts/build-mixes-doc.py
```

В документе: карта меню, рекомендуемые итерации (метка «МЕНЮ»), все тестовые итерации, граммовка на 20 г, сторитейлинг для гостя и правила станции.
