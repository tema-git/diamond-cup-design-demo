# Diamond Cup — фирменная версия

Сайт кофейни Diamond Cup, обновлённый по айдентике и меню, предоставленным брендом 27 октября 2026 года. Сайт не принимает заказы, оплаты или реальные заявки. Мета-тег robots и robots.txt пока запрещают индексацию.

## Актуальное обновление — 27 октября 2026

Фирменные SVG-логотипы и паттерн извлечены из исходных кривых AI. Палитра: navy #151935, mint #68C0B3, coffee #733B22, cream #FEEEE2. Локальный вариативный Golos Text 400–900. Исходный AI не опубликован.

Добавлено настоящее меню: 46 позиций с ценами, объёмами, описаниями и новинками; 3 раздела, поиск по всему меню и ссылки на исходные PNG за октябрь 2026. Данные в menu-data.js. Эспрессо — 40 мл. Одиночная повторная цена 400 без названия из холодного PNG не стала дополнительным продуктом.

Первый экран — иллюстрация фирменных стаканов; настоящих фотографий посуды или интерьера нет. Прежняя оранжевая фотография больше не используется. Игра, форма и анимации адаптированы к брендовой системе. Демоформа по-прежнему ничего не отправляет и не хранит.

Публикация: https://tema-git.github.io/diamond-cup-design-demo/

Проверки этого обновления: реальные браузерные клики и клавиатура; все разделы/поиск/пустой результат; игра до 3/3, защита от повторного действия и перезапуск; ошибки, успех и повтор демоформы с очисткой полей; мобильная навигация; отсутствие горизонтального переполнения на 320, 390, 768, 1024 и 1280 px; статическая проверка ресурсов/якорей и node --check. Reduced-motion ветка проверена в изолированной локальной QA-копии без изменения настроек устройства. Консоль без ошибок. Временные QA-страницы в публикацию не входят.

Ниже сохранены исходные справочные записи и история доработок; актуальные токены и поведение описаны в DESIGN.md.

## Данные компании

- Москва, Зелёный проспект, 81, 3 этаж; метро Новогиреево.
- Телефон: +7 931 601-12-34.
- Telegram: https://t.me/diamondcups
- Источники: https://yandex.com/maps/org/diamond_cup/232506506013/ и https://msk.spravka.city/company/diamond-cup-1
- Компания выбрана из рабочего списка предприятий без сайтов; данные проверены 24 октября 2026 года.

До получения материалов бренда на сайте не было цен и подтверждённого ассортимента. Теперь меню и цены взяты из предоставленных PNG за октябрь 2026; акций и отзывов не добавляли. Фотография `assets/coffee-hero.png` — сгенерированный визуальный этюд, не реальная фотография кофейни. Кофейные иллюстрации выполнены в SVG. Игровые рецепты условные и подписаны как игра, а не меню.

## Возможности

- Постоянно доступная sticky-шапка и видимая вне мобильного меню кнопка «Контакты».
- Реакция hero и игрового стакана на курсор при наличии точного указателя; обычный курсор сохранён.
- GSAP/ScrollTrigger: движение изображения, прорисовка кофейной линии и разворот стакана. Стрелки интерфейса не вращаются от прокрутки. Native scroll, без перехвата прокрутки.
- Отдельная игра-бариста: три напитка, рецепты по шагам, проверка порядка ингредиентов, отображение слоёв, прогресс, победа и перезапуск. Без гонки на время; используются нативные кнопки.
- Контрастное изменение только цвета букв при выделении текста, прозрачный фон выделения.
- Демоформа с проверкой имени, российского телефона и темы. Нет сети, аналитики или хранения персональных данных. Поля без name, кнопка отправки недоступна до установки JS-обработчика. Успех очищает введённые значения. Повторное заполнение доступно.
- `prefers-reduced-motion` отключает пространственную анимацию. Курсорный requestAnimationFrame останавливается после установления положения, при уходе секции с экрана, скрытии вкладки и отключении подходящего устройства ввода.

## Статика и зависимости

Pure HTML/CSS/JavaScript. Все пути к ресурсам относительные, сайт подходит для публикации в подпапке GitHub Pages. Локальные шрифты Golos Text и vendor-файлы GSAP не требуют сторонних запросов при открытии.

GSAP и ScrollTrigger 3.15.0 скопированы из официального npm-пакета `gsap`, ранее проверенного по npm SHA-512 integrity:

`sha512-dMW4CWBTUK1AEEDeZc1g4xpPGIrSf9fJF960qbTZmN/QwZIWY5wgliS6JWl9/25fpTGJrMRtSjGtOmPnfjZB+A==`

Официальный пакет: https://registry.npmjs.org/gsap/-/gsap-3.15.0.tgz. Исходные заголовки с лицензией сохранены в vendor-файлах. На сервер не нужны node_modules, сборщик или Node.js.

Для локального просмотра запустите любой статический HTTP-сервер из этой папки. Проверка синтаксиса: `node --check app.js`.

## Проверка перед публикацией

Статически проверены синтаксис JavaScript, уникальность HTML-ID, внутренние якоря и существование всех локальных ресурсов. Браузерную проверку адаптивности, полного игрового пути, формы, курсора и анимаций выполняет основной агент перед публикацией.


## Cursor interaction update — 2026-10-24

All five main sections respond to pointer position through independent decorative layers. Native cursor, selectable text, input positions and click targets remain stable. Motion runs only while a visible scene settles after pointer input, and stops offscreen, on blur, hidden page, pointer mode changes and reduced-motion changes. Touch and keyboard focus receive immediate visual feedback.

Navigation and CTA arrows share one gesture: north-east at rest, horizontal right on hover or keyboard focus. Page scroll never rotates UI arrows; other thematic scroll effects remain. Reduced motion switches arrow direction immediately and disables decorative displacement.

- Hero: coffee photograph, stamp, bean and glass reflection.
- Pause: cup illustration, coffee route and paper tag.
- Barista: cup, steam, recipe emblem and light across the recipe; ingredient icons react without moving their buttons.
- Location: coffee floor sign and broad moving light.
- Contact: hand-drawn cup/steam and form shadow.
- Ribbon: lateral response; arrows align right on hover.

## Update — 2026-10-25

The headline now has two deliberately unbroken line groups, sized to its column. The location eyebrow has been removed; the actual address remains below. The coffee ribbon contains six complete phrases in two identical groups, with a native pause button and offscreen/reduced-motion suspension. The orange floor sign is now a real, stationary map link, while only its internal pattern moves. Hero artwork, steam, the pause illustration and barista equipment have stronger themed responses.

See DESIGN.md for the retained brand direction, consulted sources and interaction map. Browser QA for this update is performed by the main agent before publishing.

## Уточнение — 27 октября 2026, вторая версия

По запросу пользователя исходный логотип оставлен без изменений. Увеличено расстояние между буквами в крупных заголовках, стикер и адрес оформлены в две строки, разделитель меню усилен. Кнопка паузы ленты удалена; hover/focus и reduced motion по-прежнему останавливают движение. Для favicon добавлены новые имена SVG/PNG, чтобы браузер загрузил мятную иконку вместо закэшированной оранжевой. Все правки сверены с гайдлайном бренда.
