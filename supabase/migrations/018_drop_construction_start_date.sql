-- Удаление поля даты начала строительства из таблицы projects
ALTER TABLE projects
DROP COLUMN IF EXISTS construction_start_date;
