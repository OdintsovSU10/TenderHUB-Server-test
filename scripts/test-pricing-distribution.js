/**
 * Скрипт для проверки корректного распределения стоимостей
 * между материалами и работами согласно настройкам ценообразования
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testPricingDistribution() {
  console.log('🔍 Проверка распределения стоимостей...\n');

  // Найдем первый тендер с данными
  const { data: tenders } = await supabase
    .from('tenders')
    .select('id, title, tender_number')
    .limit(1);

  if (!tenders || tenders.length === 0) {
    console.log('❌ Тендеры не найдены');
    return;
  }

  const tender = tenders[0];
  console.log(`📋 Тендер: ${tender.tender_number} - ${tender.title}`);

  // Загрузим настройки ценообразования
  const { data: pricing } = await supabase
    .from('tender_pricing_distribution')
    .select('*')
    .eq('tender_id', tender.id)
    .maybeSingle();

  if (pricing) {
    console.log('\n📊 Настройки ценообразования:');
    console.log(`  Основные материалы (мат):`);
    console.log(`    База → ${pricing.basic_material_base_target}`);
    console.log(`    Наценка → ${pricing.basic_material_markup_target}`);
    console.log(`  Вспомогательные материалы (мат-комп.):`);
    console.log(`    База → ${pricing.auxiliary_material_base_target}`);
    console.log(`    Наценка → ${pricing.auxiliary_material_markup_target}`);
  } else {
    console.log('\n⚠️  Настройки ценообразования не найдены (используются defaults)');
    console.log('  Основные материалы (мат): база → material, наценка → work');
  }

  // Найдем элементы BOQ с основными материалами
  const { data: items } = await supabase
    .from('boq_items')
    .select('id, boq_item_type, total_amount, total_commercial_material_cost, total_commercial_work_cost')
    .eq('tender_id', tender.id)
    .eq('boq_item_type', 'мат')
    .limit(5);

  if (!items || items.length === 0) {
    console.log('\n❌ Элементы BOQ с типом "мат" не найдены');
    return;
  }

  console.log(`\n📦 Проверка ${items.length} элементов типа "мат":\n`);

  let allCorrect = true;

  for (const item of items) {
    const base = item.total_amount || 0;
    const materialCost = item.total_commercial_material_cost || 0;
    const workCost = item.total_commercial_work_cost || 0;
    const commercial = materialCost + workCost;
    const markup = commercial - base;

    console.log(`Item ${item.id.substring(0, 8)}...`);
    console.log(`  База: ${base.toFixed(2)}`);
    console.log(`  Материалы: ${materialCost.toFixed(2)}`);
    console.log(`  Работы: ${workCost.toFixed(2)}`);
    console.log(`  Итого: ${commercial.toFixed(2)}`);
    console.log(`  Наценка: ${markup.toFixed(2)}`);

    // Проверяем правильность распределения для основных материалов
    // По умолчанию: база в материалы, наценка в работы
    const expectedMaterialCost = pricing?.basic_material_base_target === 'material' ? base : 0;
    const expectedWorkCost = pricing?.basic_material_markup_target === 'work' ? markup : 0;

    // Даем погрешность 0.01 из-за округлений
    const materialCorrect = Math.abs(materialCost - (expectedMaterialCost + (pricing?.basic_material_markup_target === 'material' ? markup : 0))) < 0.01;
    const workCorrect = Math.abs(workCost - (expectedWorkCost + (pricing?.basic_material_base_target === 'work' ? base : 0))) < 0.01;

    if (materialCorrect && workCorrect) {
      console.log('  ✅ Распределение корректное');
    } else {
      console.log('  ❌ Распределение некорректное!');
      console.log(`     Ожидалось: материалы=${expectedMaterialCost + (pricing?.basic_material_markup_target === 'material' ? markup : 0)}, работы=${expectedWorkCost + (pricing?.basic_material_base_target === 'work' ? base : 0)}`);
      allCorrect = false;
    }
    console.log('');
  }

  if (allCorrect) {
    console.log('✅ Все элементы распределены корректно!');
  } else {
    console.log('❌ Обнаружены ошибки в распределении!');
    console.log('\n💡 Рекомендация: выполните пересчет на странице Коммерция');
  }
}

testPricingDistribution()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
