import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { applyTacticToTender } from '../src/services/markupTacticService.ts';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testOptimizedRecalc() {
  console.log('🧪 ТЕСТ ОПТИМИЗИРОВАННОЙ ФУНКЦИИ ПЕРЕСЧЁТА\n');

  // Получаем первый тендер
  const { data: tenders, error: tendersError } = await supabase
    .from('tenders')
    .select('id, tender_number, title')
    .limit(1);

  if (tendersError || !tenders || tenders.length === 0) {
    console.error('❌ Ошибка получения тендера:', tendersError);
    return;
  }

  const tender = tenders[0];
  console.log(`📋 Тестируем на тендере: ${tender.tender_number} - ${tender.title}`);
  console.log(`🆔 ID тендера: ${tender.id}\n`);

  // Получаем количество позиций
  const { count: positionsCount } = await supabase
    .from('client_positions')
    .select('id', { count: 'exact', head: true })
    .eq('tender_id', tender.id);

  console.log(`📊 Позиций в тендере: ${positionsCount}`);

  // Получаем количество BOQ элементов
  const { count: boqItemsCount } = await supabase
    .from('boq_items')
    .select('id', { count: 'exact', head: true })
    .eq('tender_id', tender.id);

  console.log(`📝 Элементов BOQ в тендере: ${boqItemsCount}\n`);

  console.log('⏱️  Запуск пересчёта...');
  const startTime = Date.now();

  try {
    const result = await applyTacticToTender(tender.id);

    const duration = Date.now() - startTime;
    console.log(`\n✅ Пересчёт завершён за ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
    console.log(`\n📊 Результат:`);
    console.log(`   - Успешно: ${result.success}`);
    console.log(`   - Обновлено элементов: ${result.updatedCount}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️  Ошибки (${result.errors.length}):`);
      result.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }

    // Проверяем что данные обновились
    const { data: sampleItems } = await supabase
      .from('boq_items')
      .select('id, total_commercial_material_cost, total_commercial_work_cost, calculated_price')
      .eq('tender_id', tender.id)
      .limit(5);

    console.log(`\n🔍 Примеры обновлённых данных (первые 5 элементов):`);
    sampleItems.forEach((item, i) => {
      console.log(`   ${i + 1}. ID: ${item.id.substring(0, 8)}...`);
      console.log(`      - calculated_price: ${item.calculated_price || 0}`);
      console.log(`      - material_cost: ${item.total_commercial_material_cost || 0}`);
      console.log(`      - work_cost: ${item.total_commercial_work_cost || 0}`);
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Ошибка при пересчёте (${duration}ms):`, error.message);
    console.error('Stack trace:', error.stack);
  }
}

testOptimizedRecalc();
