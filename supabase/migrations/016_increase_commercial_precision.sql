-- Увеличение precision для коммерческих стоимостей
-- Изменение с numeric(18,2) на numeric(18,6) для уменьшения погрешности округления

-- boq_items
ALTER TABLE boq_items
  ALTER COLUMN total_commercial_material_cost TYPE numeric(18,6),
  ALTER COLUMN total_commercial_work_cost TYPE numeric(18,6);

-- client_positions
ALTER TABLE client_positions
  ALTER COLUMN total_commercial_material TYPE numeric(18,6),
  ALTER COLUMN total_commercial_work TYPE numeric(18,6);

-- Комментарий
COMMENT ON COLUMN boq_items.total_commercial_material_cost IS 'Коммерческая стоимость материалов с точностью до 6 знаков для минимизации погрешности округления';
COMMENT ON COLUMN boq_items.total_commercial_work_cost IS 'Коммерческая стоимость работ с точностью до 6 знаков для минимизации погрешности округления';
