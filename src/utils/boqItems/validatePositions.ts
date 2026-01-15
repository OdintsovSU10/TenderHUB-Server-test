import { supabase } from '../../lib/supabase';

/**
 * Валидация исходной и целевой позиций
 */
export async function validatePositions(
  sourcePositionId: string,
  targetPositionId: string,
  requireSameTender: boolean = false
): Promise<{ sourceTenderId: string; targetTenderId: string }> {
  // Проверить исходную позицию
  const { data: sourcePosition, error: sourceError } = await supabase
    .from('client_positions')
    .select('id, tender_id')
    .eq('id', sourcePositionId)
    .single();

  if (sourceError || !sourcePosition) {
    throw new Error('Исходная позиция не найдена');
  }

  // Проверить целевую позицию
  const { data: targetPosition, error: targetError } = await supabase
    .from('client_positions')
    .select('id, tender_id')
    .eq('id', targetPositionId)
    .single();

  if (targetError || !targetPosition) {
    throw new Error('Целевая позиция не найдена');
  }

  // Проверить, что позиции из одного тендера (если требуется)
  if (requireSameTender && sourcePosition.tender_id !== targetPosition.tender_id) {
    throw new Error('Позиции должны принадлежать одному тендеру');
  }

  return {
    sourceTenderId: sourcePosition.tender_id,
    targetTenderId: targetPosition.tender_id,
  };
}
