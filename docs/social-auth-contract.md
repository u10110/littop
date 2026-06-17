# Контракт social auth для VK / Одноклассники

Фронт уже ожидает такой backend-flow.

## Start endpoints

- `GET /auth/social/vk/start?mode=login|register&redirect_uri=<frontend_callback_url>`
- `GET /auth/social/ok/start?mode=login|register&redirect_uri=<frontend_callback_url>`

## Что делает backend

1. Начинает OAuth у провайдера.
2. После успешного обмена кодов создаёт/находит пользователя.
3. Выпускает обычный auth token этого проекта.
4. Делает redirect обратно во frontend callback URL.

## Frontend callback URL

Фронт отправляет backend'у callback такого вида:

- `/auth/callback?provider=vk&mode=login&redirect=/personal`
- `/auth/callback?provider=ok&mode=register&redirect=/personal`

## Что backend должен вернуть обратно

После успеха backend должен редиректить на тот же frontend callback URL, добавив token:

- `/auth/callback?provider=vk&mode=login&redirect=/personal&token=<JWT>`
- `/auth/callback?provider=ok&mode=register&redirect=/personal&token=<JWT>`

При ошибке backend должен вернуть:

- `/auth/callback?provider=vk&mode=login&redirect=/personal&error=<message>`

## Что фронт уже умеет

Фронт уже:
- показывает кнопки `ВКонтакте` и `Одноклассники` для входа и регистрации;
- открывает backend start endpoint;
- принимает `token` в `/auth/callback`;
- сохраняет токен в existing session store;
- загружает `me` и переводит пользователя в обычную авторизованную сессию;
- редиректит пользователя дальше в `redirect` (по умолчанию `/personal`).
