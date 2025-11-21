-- Migration 015: Add tender pricing distribution table
-- This table stores rules for how base costs and markups are distributed between materials (КП) and works

CREATE TABLE IF NOT EXISTS tender_pricing_distribution (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tender_id UUID NOT NULL REFERENCES tenders(id) ON DELETE CASCADE,
  markup_tactic_id UUID REFERENCES markup_tactics(id) ON DELETE CASCADE,

  -- Distribution rules for basic materials (мат)
  -- base: where base cost goes ('material' = КП, 'work' = работы)
  -- markup: where markup goes ('material' = КП, 'work' = работы)
  basic_material_base_target TEXT NOT NULL DEFAULT 'material' CHECK (basic_material_base_target IN ('material', 'work')),
  basic_material_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (basic_material_markup_target IN ('material', 'work')),

  -- Distribution rules for auxiliary materials (мат-комп.)
  auxiliary_material_base_target TEXT NOT NULL DEFAULT 'work' CHECK (auxiliary_material_base_target IN ('material', 'work')),
  auxiliary_material_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (auxiliary_material_markup_target IN ('material', 'work')),

  -- Distribution rules for subcontract materials (суб-мат)
  subcontract_material_base_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_material_base_target IN ('material', 'work')),
  subcontract_material_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (subcontract_material_markup_target IN ('material', 'work')),

  -- Distribution rules for works (раб, раб-комп., суб-раб)
  work_base_target TEXT NOT NULL DEFAULT 'work' CHECK (work_base_target IN ('material', 'work')),
  work_markup_target TEXT NOT NULL DEFAULT 'work' CHECK (work_markup_target IN ('material', 'work')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each tender can have only one pricing distribution per markup tactic
  UNIQUE(tender_id, markup_tactic_id)
);

-- Create index for faster lookups by tender
CREATE INDEX IF NOT EXISTS idx_tender_pricing_distribution_tender_id
  ON tender_pricing_distribution(tender_id);

-- Create index for faster lookups by tactic
CREATE INDEX IF NOT EXISTS idx_tender_pricing_distribution_tactic_id
  ON tender_pricing_distribution(markup_tactic_id);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_tender_pricing_distribution
  BEFORE UPDATE ON tender_pricing_distribution
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment explaining the table
COMMENT ON TABLE tender_pricing_distribution IS
  'Правила распределения затрат и наценок между КП (материалы) и работами для каждого тендера';

COMMENT ON COLUMN tender_pricing_distribution.basic_material_base_target IS
  'Куда направляется базовая стоимость основных материалов: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.basic_material_markup_target IS
  'Куда направляется наценка на основные материалы: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.auxiliary_material_base_target IS
  'Куда направляется базовая стоимость вспомогательных материалов: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.auxiliary_material_markup_target IS
  'Куда направляется наценка на вспомогательные материалы: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.subcontract_material_base_target IS
  'Куда направляется базовая стоимость субподрядных материалов: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.subcontract_material_markup_target IS
  'Куда направляется наценка на субподрядные материалы: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.work_base_target IS
  'Куда направляется базовая стоимость работ: material = КП, work = работы';

COMMENT ON COLUMN tender_pricing_distribution.work_markup_target IS
  'Куда направляется наценка на работы: material = КП, work = работы';
