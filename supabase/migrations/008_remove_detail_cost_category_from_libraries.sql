-- Migration: Remove detail_cost_category_id from materials_library and works_library
-- Description: Удаляет связь с затратами на строительство из библиотек материалов и работ
-- Date: 2025-11-11

-- Шаг 1: Удаляем views, которые зависят от колонок detail_cost_category_id
DROP VIEW IF EXISTS public.materials_library_full_view;
DROP VIEW IF EXISTS public.works_library_full_view;

-- Шаг 2: Удаляем колонку detail_cost_category_id из materials_library
ALTER TABLE public.materials_library
  DROP COLUMN IF EXISTS detail_cost_category_id;

-- Шаг 3: Удаляем колонку detail_cost_category_id из works_library
ALTER TABLE public.works_library
  DROP COLUMN IF EXISTS detail_cost_category_id;

-- Шаг 4: Пересоздаем view для materials_library (без затрат)
CREATE OR REPLACE VIEW public.materials_library_full_view AS
SELECT
  m.id,
  m.material_type,
  m.item_type,
  mn.name AS material_name,
  mn.unit,
  m.consumption_coefficient,
  m.unit_rate,
  m.currency_type,
  m.delivery_price_type,
  m.delivery_amount,
  m.created_at,
  m.updated_at
FROM materials_library m
JOIN material_names mn ON m.material_name_id = mn.id;

-- Шаг 5: Пересоздаем view для works_library (без затрат)
CREATE OR REPLACE VIEW public.works_library_full_view AS
SELECT
  w.id,
  w.item_type,
  wn.name AS work_name,
  wn.unit,
  w.unit_rate,
  w.currency_type,
  w.created_at,
  w.updated_at
FROM works_library w
JOIN work_names wn ON w.work_name_id = wn.id;

-- Комментарии
COMMENT ON VIEW public.materials_library_full_view IS 'Полное представление библиотеки материалов без связи с затратами';
COMMENT ON VIEW public.works_library_full_view IS 'Полное представление библиотеки работ без связи с затратами';