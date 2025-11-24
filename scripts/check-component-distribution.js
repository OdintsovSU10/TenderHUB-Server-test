/**
 * Проверка распределения стоимостей для мат-комп и раб-комп элементов
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkComponentDistribution() {
  console.log('🔍 Проверка распределения для мат-комп и раб-комп...\n');

  // Найдем первый тендер
  const { data: tenders } = await supabase
    .from('tenders')
    .select('id, title, tender_number')
    .limit(1);

  if (!tenders || tenders.length === 0) {
    console.log('❌ Тендеры не найдены');
    return;
  }

  const tender = tenders[0];
  console.log(`📋 Тендер: ${tender.tender_number} - ${tender.title}\n`);

  // Загрузим настройки ценообразования
  const { data: pricing } = await supabase
    .from('tender_pricing_distribution')
    .select('*')
    .eq('tender_id', tender.id)
    .maybeSingle();

  console.log('📊 Настройки ценообразования:');
  if (pricing) {
    console.log(`  Мат-комп:`);
    console.log(`    component_material_base_target: ${pricing.component_material_base_target}`);
    console.log(`    component_material_markup_target: ${pricing.component_material_markup_target}`);
    console.log(`  Раб-комп:`);
    console.log(`    component_work_base_target: ${pricing.component_work_base_target}`);
    console.log(`    component_work_markup_target: ${pricing.component_work_markup_target}`);
  } else {
    console.log('  ⚠️ Настройки не найдены');
  }

  // Найдем элементы мат-комп
  console.log('\n📦 Элементы мат-комп:');
  const { data: matCompItems } = await supabase
    .from('boq_items')
    .select('id, boq_item_type, total_amount, total_commercial_material_cost, total_commercial_work_cost')
    .eq('tender_id', tender.id)
    .eq('boq_item_type', 'мат-комп.')
    .limit(5);

  if (matCompItems && matCompItems.length > 0) {
    matCompItems.forEach(item => {
      const total = (item.total_commercial_material_cost || 0) + (item.total_commercial_work_cost || 0);
      console.log(`  ID: ${item.id.substring(0, 8)}...`);
      console.log(`    Базовая: ${item.total_amount || 0}`);
      console.log(`    Материалы: ${item.total_commercial_material_cost || 0}`);
      console.log(`    Работы: ${item.total_commercial_work_cost || 0}`);
      console.log(`    Итого: ${total}`);
      console.log('');
    });
  } else {
    console.log('  Нет элементов мат-комп.');
  }

  // Найдем элементы раб-комп
  console.log('📦 Элементы раб-комп:');
  const { data: rabCompItems } = await supabase
    .from('boq_items')
    .select('id, boq_item_type, total_amount, total_commercial_material_cost, total_commercial_work_cost')
    .eq('tender_id', tender.id)
    .eq('boq_item_type', 'раб-комп.')
    .limit(5);

  if (rabCompItems && rabCompItems.length > 0) {
    rabCompItems.forEach(item => {
      const total = (item.total_commercial_material_cost || 0) + (item.total_commercial_work_cost || 0);
      console.log(`  ID: ${item.id.substring(0, 8)}...`);
      console.log(`    Базовая: ${item.total_amount || 0}`);
      console.log(`    Материалы: ${item.total_commercial_material_cost || 0}`);
      console.log(`    Работы: ${item.total_commercial_work_cost || 0}`);
      console.log(`    Итого: ${total}`);
      console.log('');
    });
  } else {
    console.log('  Нет элементов раб-комп.');
  }

  // Проверяем логику распределения
  console.log('\n🔬 Анализ:');
  if (pricing && matCompItems && matCompItems.length > 0) {
    const item = matCompItems[0];
    const expectedMaterial = pricing.component_material_base_target === 'material' ? item.total_amount : 0;
    const expectedWork = pricing.component_material_base_target === 'work' ? item.total_amount : 0;

    console.log(`  Ожидаемое распределение для мат-комп (база=${pricing.component_material_base_target}):`);
    console.log(`    Материалы должны быть: ${expectedMaterial}`);
    console.log(`    Работы должны быть: ${expectedWork}`);
    console.log(`  Фактическое:`);
    console.log(`    Материалы: ${item.total_commercial_material_cost}`);
    console.log(`    Работы: ${item.total_commercial_work_cost}`);

    if (item.total_commercial_work_cost > 0 && pricing.component_material_base_target === 'material') {
      console.log('  ❌ ПРОБЛЕМА: Стоимость в работах, хотя должна быть в материалах!');
    } else {
      console.log('  ✅ Распределение корректное');
    }
  }
}

checkComponentDistribution()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });