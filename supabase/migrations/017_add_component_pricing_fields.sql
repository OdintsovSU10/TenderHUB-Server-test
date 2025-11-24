-- Миграция 017: Добавление полей для компонентных материалов и работ в ценообразование
-- Цель: Добавить поддержку раздельного управления ценообразованием для мат-комп и раб-комп

-- Добавляем поля для компонентных материалов (мат-комп.)
ALTER TABLE public.tender_pricing_distribution
ADD COLUMN IF NOT EXISTS component_material_base_target text NOT NULL DEFAULT 'work',
ADD COLUMN IF NOT EXISTS component_material_markup_target text NOT NULL DEFAULT 'work';

-- Добавляем поля для компонентных работ (раб-комп.)
ALTER TABLE public.tender_pricing_distribution
ADD COLUMN IF NOT EXISTS component_work_base_target text NOT NULL DEFAULT 'work',
ADD COLUMN IF NOT EXISTS component_work_markup_target text NOT NULL DEFAULT 'work';

-- Добавляем CHECK constraints для новых полей
ALTER TABLE public.tender_pricing_distribution
ADD CONSTRAINT tender_pricing_distribution_component_material_base_target_check
  CHECK (component_material_base_target = ANY (ARRAY['material'::text, 'work'::text])),
ADD CONSTRAINT tender_pricing_distribution_component_material_markup_target_check
  CHECK (component_material_markup_target = ANY (ARRAY['material'::text, 'work'::text])),
ADD CONSTRAINT tender_pricing_distribution_component_work_base_target_check
  CHECK (component_work_base_target = ANY (ARRAY['material'::text, 'work'::text])),
ADD CONSTRAINT tender_pricing_distribution_component_work_markup_target_check
  CHECK (component_work_markup_target = ANY (ARRAY['material'::text, 'work'::text]));

-- Добавляем комментарии к новым полям
COMMENT ON COLUMN public.tender_pricing_distribution.component_material_base_target IS 'Куда направляется базовая стоимость компонентных материалов (мат-комп.): material = КП, work = работы';
COMMENT ON COLUMN public.tender_pricing_distribution.component_material_markup_target IS 'Куда направляется наценка на компонентные материалы (мат-комп.): material = КП, work = работы';
COMMENT ON COLUMN public.tender_pricing_distribution.component_work_base_target IS 'Куда направляется базовая стоимость компонентных работ (раб-комп.): material = КП, work = работы';
COMMENT ON COLUMN public.tender_pricing_distribution.component_work_markup_target IS 'Куда направляется наценка на компонентные работы (раб-комп.): material = КП, work = работы';
