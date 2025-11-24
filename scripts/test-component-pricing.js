/**
 * Скрипт для проверки сохранения настроек мат-комп и раб-комп
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testComponentPricing() {
  console.log('🔍 Проверка настроек мат-комп и раб-комп...\n');

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
  console.log(`📋 Тендер: ${tender.tender_number} - ${tender.title}`);

  // Загрузим текущие настройки
  const { data: pricing, error } = await supabase
    .from('tender_pricing_distribution')
    .select('*')
    .eq('tender_id', tender.id)
    .maybeSingle();

  if (error) {
    console.error('❌ Ошибка загрузки:', error);
    return;
  }

  if (!pricing) {
    console.log('\n⚠️  Настройки ценообразования не найдены');
    return;
  }

  console.log('\n📊 Текущие настройки:');
  console.log(`  Компонентные материалы (мат-комп.):`);
  console.log(`    База → ${pricing.component_material_base_target || 'НЕ УСТАНОВЛЕНО'}`);
  console.log(`    Наценка → ${pricing.component_material_markup_target || 'НЕ УСТАНОВЛЕНО'}`);
  console.log(`  Компонентные работы (раб-комп.):`);
  console.log(`    База → ${pricing.component_work_base_target || 'НЕ УСТАНОВЛЕНО'}`);
  console.log(`    Наценка → ${pricing.component_work_markup_target || 'НЕ УСТАНОВЛЕНО'}`);

  // Проверим, есть ли элементы мат-комп и раб-комп в БД
  const { data: componentMaterials } = await supabase
    .from('boq_items')
    .select('id, boq_item_type')
    .eq('tender_id', tender.id)
    .eq('boq_item_type', 'мат-комп.')
    .limit(1);

  const { data: componentWorks } = await supabase
    .from('boq_items')
    .select('id, boq_item_type')
    .eq('tender_id', tender.id)
    .eq('boq_item_type', 'раб-комп.')
    .limit(1);

  console.log(`\n📦 Элементы BOQ:`);
  console.log(`  Мат-комп.: ${componentMaterials?.length || 0} элементов`);
  console.log(`  Раб-комп.: ${componentWorks?.length || 0} элементов`);

  // Попробуем обновить настройки
  console.log('\n🔧 Пробуем обновить настройки...');
  const testUpdate = {
    tender_id: tender.id,
    component_material_base_target: 'material',
    component_material_markup_target: 'work',
    component_work_base_target: 'work',
    component_work_markup_target: 'work',
  };

  const { data: updated, error: updateError } = await supabase
    .from('tender_pricing_distribution')
    .update(testUpdate)
    .eq('tender_id', tender.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Ошибка обновления:', updateError);
    return;
  }

  console.log('✅ Настройки обновлены успешно!');
  console.log(`  Мат-комп база: ${updated.component_material_base_target}`);
  console.log(`  Мат-комп наценка: ${updated.component_material_markup_target}`);
  console.log(`  Раб-комп база: ${updated.component_work_base_target}`);
  console.log(`  Раб-комп наценка: ${updated.component_work_markup_target}`);
}

testComponentPricing()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
