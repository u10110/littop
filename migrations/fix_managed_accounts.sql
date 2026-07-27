-- fix_managed_accounts.sql
-- Восстановление раздела «Управляемые аккаунты» в кабинете админа (препрод).
--
-- Симптом: у админа показывает «0 профилей», хотя ранее аккаунты были.
--
-- Расследовано 2026-07-27: код не менялся между upd_pack_19 и upd_pack_20.
--   - Фронт Personal.vue / graphql.js: единственный diff между паками — про
--     #publish-work, не про управляемые аккаунты.
--   - Бэкенд-резолвер myManagedAuthors — идентичен в старой и новой (pack 20) копиях:
--       return repo.listManagedAuthorAccounts({ ownerUserId: user.id, limit })
--   - SQL listManagedAuthorAccounts (postgresRepository.mjs) — идентичен:
--       SELECT ... FROM managed_author_accounts maa
--       JOIN users u ON u.id = maa.managed_user_id
--       WHERE maa.owner_user_id = $1 AND u.status <> 'deleted'
-- Значит, 0 строк => либо таблица managed_author_accounts пуста (БД пересеяна),
-- либо owner_user_id больше не совпадает с текущим id админа (аккаунт админа
-- пересоздан с новым id, а старые строки ссылаются на старый id).
-- Доп. сигнал: тест-аккаунт hermes_full_o7u1hn тоже не логинится
-- (Invalid credentials при запросе к /api) => препрод-БД была сброшена/ресидена.
-- Ошибка на фронте глушится try/catch (Personal.vue loadExtraCabinetData),
-- поэтому вместо падения показывается «0 профилей».
--
-- Применение на сервере препрода (БД littop):
--   psql "$DATABASE_URL" -f migrations/fix_managed_accounts.sql
-- Сначала идёт DIAGNOSTIC (только чтение). Блок FIX закомментирован —
-- раскомментируйте нужный сценарий ПОСЛЕ просмотра вывода диагностики.

\echo '=== DIAGNOSTIC: админы ==='
SELECT id, login, email, role, status
FROM users
WHERE role = 'admin' OR login = 'hermes_full_o7u1hn'
ORDER BY id;

\echo '=== DIAGNOSTIC: managed_author_accounts ==='
SELECT maa.owner_user_id,
       maa.managed_user_id,
       maa.created_at,
       u.login   AS managed_login,
       u.status  AS managed_status
FROM managed_author_accounts maa
LEFT JOIN users u ON u.id = maa.managed_user_id
ORDER BY maa.owner_user_id, maa.created_at DESC;

\echo '=== DIAGNOSTIC: управляемые юзеры со status=deleted ==='
SELECT u.id, u.login, u.status
FROM users u
WHERE u.id IN (SELECT maa.managed_user_id FROM managed_author_accounts maa)
  AND u.status = 'deleted';

-- === FIX (раскомментировать ПОСЛЕ диагностики) ===
--
-- Сценарий А: managed_author_accounts НЕ пуста, но owner_user_id указывает на
-- старый id админа (админ пересоздан после ресида БД). Перепривязываем все
-- управляемые аккаунты к текущему site-owner админу. Подставьте его id
-- из блока DIAGNOSTIC выше (обычно минимальный id с role='admin').
--
-- \set admin_id 1
-- UPDATE managed_author_accounts SET owner_user_id = :admin_id;
--
-- Сценарий Б: managed_author_accounts пуста — управляемые аккаунты нужно
-- пересоздать. Пример для аккаунта «littop» (бывший managed_user_id = 55):
-- убедитесь, что пользователь-автор существует, затем привяжите к админу:
--
-- \set admin_id 1
-- INSERT INTO managed_author_accounts (owner_user_id, managed_user_id, created_at)
-- VALUES (:admin_id, 55, now())
-- ON CONFLICT DO NOTHING;
