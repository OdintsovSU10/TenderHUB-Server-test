-- Migration 016: Split subcontract materials into basic and auxiliary
-- Add separate rules for основные субматериалы and вспомогательные субматериалы

ALTER TABLE tender_pricing_distribution
  ADD COLUMN IF NOT EXISTS subcontract_basic_material_base_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_basic_material_base_target IN ('material', 'work'));

ALTER TABLE tender_pricing_distribution
  ADD COLUMN IF NOT EXISTS subcontract_basic_material_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_basic_material_markup_target IN ('material', 'work'));

ALTER TABLE tender_pricing_distribution
  ADD COLUMN IF NOT EXISTS subcontract_auxiliary_material_base_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_auxiliary_material_base_target IN ('material', 'work'));

ALTER TABLE tender_pricing_distribution
  ADD COLUMN IF NOT EXISTS subcontract_auxiliary_material_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_auxiliary_material_markup_target IN ('material', 'work'));

-- Drop old subcontract_material columns (they are replaced by more specific ones)
ALTER TABLE tender_pricing_distribution
  DROP COLUMN IF EXISTS subcontract_material_base_target;

ALTER TABLE tender_pricing_distribution
  DROP COLUMN IF EXISTS subcontract_material_markup_target;

-- Add comments
COMMENT ON COLUMN tender_pricing_distribution.subcontract_basic_material_base_target IS
  'Куда направляется базовая стоимость основных субподрядных материалов: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.subcontract_basic_material_markup_target IS
  'Куда направляется наценка на основные субподрядные материалы: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.subcontract_auxiliary_material_base_target IS
  'Куда направляется базовая стоимость вспомогательных субподрядных материалов: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.subcontract_auxiliary_material_markup_target IS
  'Куда направляется наценка на вспомогательные субподрядные материалы: material = КП, work = работы';
