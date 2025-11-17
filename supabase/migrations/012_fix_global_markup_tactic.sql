-- Исправление глобальной схемы наценок
-- Убираем флаг is_global у всех схем
UPDATE markup_tactics
SET is_global = false;

-- Удаляем старую схему "Текущая тактика" если она есть
DELETE FROM markup_tactics
WHERE name = 'Текущая тактика';

-- Устанавливаем is_global = true только для "Базовая схема"
UPDATE markup_tactics
SET is_global = true
WHERE name = 'Базовая схема';

-- Если схемы "Базовая схема" нет, создаём её
INSERT INTO markup_tactics (name, is_global, sequences, base_costs)
SELECT
    'Базовая схема',
    true,
    '{"раб": [], "мат": [], "суб-раб": [], "суб-мат": [], "раб-комп.": [], "мат-комп.": []}'::jsonb,
    '{"раб": 0, "мат": 0, "суб-раб": 0, "суб-мат": 0, "раб-комп.": 0, "мат-комп.": 0}'::jsonb
WHERE NOT EXISTS (
    SELECT 1 FROM markup_tactics WHERE name = 'Базовая схема'
);
