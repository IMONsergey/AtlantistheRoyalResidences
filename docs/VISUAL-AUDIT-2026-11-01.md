# Atlantis: визуальная проверка 2026-11-01, проход 2

**Локальная проверка завершена. Исходники и выбранные доказательства переданы владельцу релиза; commit/deployment/live приемка ведутся в общем отчете.**

Этот отчет относится к новой проверке поверх `6de8339639929976e7a22d9f892c89a64b54b099`. Старые server jobs и опубликованное исправление полноэкранного viewer остаются историческими результатами. Актуальный commit, deployment и независимая live приемка фиксируются владельцем релиза в [общем release report](https://github.com/IMONsergey/LuxuryRealty/blob/main/docs/MOTION-RELEASE-2026-11-01.md).

## Область и исходный дизайн

Свежие снимки сделаны для `/`, `/residences/3402/`, `/privacy/` и настоящего отсутствующего маршрута `/audit-missing-route/` с HTTP 404. Размеры: 1440x900, 1920x1080, 1024x768, 768x1024, 390x844, 320x740 и 844x390. Главная просмотрена по сценам: hero/myth, архитектура, центральный коллаж, подводная фотография, адрес и карта, ascent, invitation, три highlights, residences, каталог, interiors, closing, материалы и footer. Внутренние страницы сняты последовательными viewport фрагментами.

Сохранены исходные фотографии, маски, локальные Vanitas/Caslon/Graphik/Inter, цвета и композиция. Источники: [исходный Atlantis frame](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO/?node-id=198-3), [подготовленный desktop](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO/?node-id=2029-839), [mobile](https://www.figma.com/design/m3N3lJCoutaziEm4nt4CwO/?node-id=2038-6880), [asset provenance](../design/asset-provenance.json), [описание responsive images](RESPONSIVE-IMAGES.md). Проверка responsive поведения дополняет исходный дизайн; это не заявление о попиксельном совпадении каждого промежуточного animation frame с Figma.

## Подтвержденные дефекты и исправления

1. **Текстовые псевдоиконки.** Unicode arrows, chevrons, close, plus/minus и mobile menu glyph заменены `Icon.astro`. Контур стрелки взят из исходного `catalogue-imgVector384.svg`; остальные простые контуры используют согласованный SVG с `currentColor`, явным размером/viewBox и `aria-hidden`. Сохранены подписи кнопок и hit areas. Знак умножения в размерах комнат остается содержательным текстом.
2. **Потеря позиции чтения при motion change.** До правки на 390px Chromium переходил с y=10310 к 0, WebKit с y=10256 к 0. Новый guard сохраняет читаемую секцию вокруг matchMedia транзакции и восстанавливает ее положение после ScrollTrigger refresh. На desktop удаление/возврат pin меняет document scroll на 900px, но положение секции в окне остается прежним. При resize используется последний стабильный anchor; 2px запас внутри секции исключает переключение на соседнюю из-за округления границы.
3. **Ошибка inline gallery блокировала Next.** После отказа второго файла повторный Next снова пытался загрузить тот же файл. Запрошенный индекс теперь независим от показанного кадра. Старое изображение и счетчик сохраняются до успешного decode, Next может перейти к третьему, Previous повторяет отказавшийся запрос свежим img с теми же responsive атрибутами. Устаревший decode не меняет выбранный кадр.
4. **Пустой кадр в WebKit после rapid motion toggle.** Воспроизведен выбранный 3/3 с корректным `naturalWidth`, геометрией и aria, но opacity=0. Теперь хранится конкретный crossfade tween: его конечное состояние завершается с подавлением callback перед kill/settle. Измеряется фактическая видимость фотографии, а не только счетчик.
5. **Close уходил за край прокручиваемого диалога.** Native wheel смещал enquiry Close с top=28 к -41 на 320px и с 32 к -379 в коротком landscape; menu Close уходил к -338. Контент формы и меню получил внутренние scrollers, Close сохранил исходную позицию вне них. Новый showModal возвращает scroller к началу, сохраняя введенные данные и pending request lifecycle. Проверяется повторное открытие другого доступного enquiry после native Close.
6. **Коллаж скрывал текст и CTA на 844-1024px.** Нижняя фотография закрывала последние строки центрального абзаца и Register button; на 1100px перекрывала нижний край кнопки. Только в диапазоне 801-1100px высота центрального блока теперь зависит от текста. Боковые изображения, их размеры, типографика и исходное наложение нижнего фото на water scene сохранены. На 844/960/1024/1100 подтверждены открытая кнопка и настоящий click без force.
7. **Обрезанные значения площади в каталоге на 320px.** В Chromium с обычным scrollbar правая граница `3,664 sq ft` доходила до x=285 при правом крае карточки x=280. В диапазоне до 359px боковой отступ списка плавно уменьшен до 8px; размер шрифта и три колонки сохранены. На 320/360/390px оба движка подтверждают все значения внутри карточки.
8. **Success state после прокрутки формы.** В коротком landscape старый scroll offset обрезал верх Thank you. Success получает focus с `preventScroll`, тот же inner scroller возвращается к началу. Сценарий подтвержден mock response в existing e2e и финальной матрице.
9. **Единица площади на 320px.** `sq m` больше не распадается с отдельной буквой M: между словами использован неразрывный пробел.

## Проверка и доказательства

Финальные результаты и fingerprint исходников: [verification.json](verification/design-2026-11-01/verification.json). Выбранные settled screenshots перечислены в этом JSON; исходные capture matrices, before repro и JSON находятся в `artifacts/pixel-audit-20261101-v2/`.

| Проверка | Результат и область |
|---|---|
| `npm run check`, `npm run build` | PASS на итоговом product source |
| Маршруты и section captures | Chromium: 28 route/viewport cases, 214 новых viewport captures, 0 page/resource errors, 0 violations |
| Значимые UI states | 49 уникальных групп Chromium на семи размерах и 14 групп WebKit на 390x844 / 844x390; все приняты после точечных повторов |
| Existing `tests/e2e.mjs` | PASS на итоговом source, включая short-height success и 320/360/390px значения площади |
| Existing `tests/lightbox.mjs` | Chromium 3/3 + WebKit 3/3; delayed decode, stale close/reopen, error recovery |
| Inline gallery | Chromium 3/3 + WebKit 3/3; реальная opacity, положение изображения, latest request, skip/retry/reload |
| Native Close и reopen | 8/8; 320x740 / 844x390, два движка, form/menu, coordinate click, reset и focus |
| Reading continuity | 10/10; motion в обе стороны, resize в обе стороны, открытый viewer и закрытие, body/html locks |
| Узкие подтвержденные дефекты | Коллаж: native click 4/4 ширины; area values: 6/6 width/engine cases |
| Последний визуальный проход | Все capture sheets просмотрены; шесть выбранных кадров пересняты после последней product правки |

Широкая route/state матрица была снята перед последними двумя узкими исправлениями: padding каталога на 320px и success scroll reset. После них повторены check/build, existing e2e, 14 затронутых Chromium state groups, две WebKit groups, шесть width/engine измерений и все выбранные screenshots. Остальные неизмененные сценарии сохраняют отдельные исходные отчеты; эта граница явно отражена в JSON.

В первоначальном menu assertion BODY при Tab ошибочно трактовался как background focus. Trace подтвердил `document.hasFocus=false` в browser chrome и запрет focus фонового trigger; все семь menu/anchor cases повторены. Вторая ошибка harness была фиксированным ожиданием 1.1 секунды для длинного native smooth scroll. Проверка теперь ждет остановки прокрутки; Contacts доступен в landscape. Empty catalogue и preview reshot непосредственно в видимом результате, а не на предыдущем viewport.

### Выбранные итоговые кадры

| Кадр | Что подтверждает |
|---|---|
| [Hero 1440](verification/design-2026-11-01/hero-desktop1440.jpg) | Исходная композиция, фотография, типографика и навигация |
| [Коллаж 844](verification/design-2026-11-01/collage-tablet844.jpg) | Полный текст и доступный Register CTA между исходными фотографиями |
| [Каталог 320](verification/design-2026-11-01/catalogue-mobile320.jpg) | Полные значения площади и сохраненный план |
| [Gallery 390, WebKit](verification/design-2026-11-01/gallery-motion-mobile390.jpg) | Видимый кадр после normal/reduced/normal, SVG controls и сохраненная позиция |
| [Форма 320, WebKit](verification/design-2026-11-01/enquiry-mobile320.jpg) | Settled enquiry, исходный Close и прокручиваемый контент |
| [План 1440](verification/design-2026-11-01/plan-desktop1440.jpg) | SVG zoom/fit/close и читаемый исходный план |


Новые regressions: `tests/gallery-qa.mjs` и `tests/dialog-qa.mjs`. Первый проверяет delayed/latest request, failed-image skip/retry/reload, шесть быстрых normal/reduced переключений, opacity, положение кадра, aria/inert и native Chromium touch cancellation. Второй выполняет native wheel и coordinate click по Close, повторное открытие, сохранение введенного имени, focus return и очистку body/html locks. Отдельный reading test измеряет точные offsets в обоих направлениях motion/resize и с открытым/закрытым viewer. В существующий `tests/e2e.mjs` добавлена проверка reading position при reduced-motion change.

Полная UI матрица проверяет реальные anchor landings, menu, invalid/error/pending/success формы, оба каталожных preview и empty state, highlights, normal/rapid/reduced interiors, photo viewer, fit/zoom/resize и отмену drag в плане. В layout capture не используется выключение анимаций. В script проверке pointercancel после настоящего mouse drag отдельно отмечен синтетический cancel; физический touchscreen этим не сертифицируется.

## Границы результата

Runtime: Node 24.22.1, доступный Playwright 1.58.2, Linux Chromium/WebKit. Объявленный в Atlantis Playwright 1.62.1 и lockfile не изменены. Сборка использует закрепленные Astro 7.4.4, GSAP 3.15.0 и TypeScript 5.9.3. Runtime hooks `matchMediaInit`/`matchMedia` используются самим ScrollTrigger 3.15.0, но отсутствуют в его bundled TypeScript declaration; в guard добавлено узкое описание именно этих hooks.

Формы только mocked/blocked: текущая проверка не создает enquiries и не повторяет историческую проверку private Blob. Не заявляются physical Safari/iOS, FPS, INP, bfcache или качество оригиналов выше предоставленных файлов. Unit 3402 остается единственным переданным подробным объектом; live inventory, цены, презентационные PDF и payment schedule не выдумывались. Полноэкранный viewer сохраняет ранее опубликованный decode/error/cache контракт. Финальная production приемка принадлежит владельцу релиза.
