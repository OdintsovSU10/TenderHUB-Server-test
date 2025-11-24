/**
 * Скрипт для пересчета коммерческих стоимостей с учетом настроек ценообразования
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Функция загрузки настроек ценообразования
async function loadPricingDistribution(tenderId) {
  const { data, error } = await supabase
    .from('tender_pricing_distribution')
    .select('*')
    .eq('tender_id', tenderId)
    .single();

  if (error || !data) {
    console.warn('⚠️ Настройки ценообразования не найдены, используются defaults');
    return null;
  }

  return data;
}

// Функция определения типа материала
function getMaterialType(boqItemType) {
  if (boqItemType === 'мат') return 'basic';
  if (boqItemType === 'мат-комп.') return 'auxiliary';
  if (boqItemType === 'суб-мат') return 'subcontract_basic';
  if (boqItemType === 'раб' || boqItemType === 'раб-комп.' || boqItemType === 'суб-раб') {
    return 'work';
  }
  return null;
}

// Функция распределения стоимости
function applyPricingDistribution(baseAmount, commercialCost, boqItemType, distribution) {
  // Если настроек нет, используем старую логику
  if (!distribution) {
    const isMaterial = ['мат', 'суб-мат', 'мат-комп.'].includes(boqItemType);
    return {
      materialCost: isMaterial ? commercialCost : 0,
      workCost: isMaterial ? 0 : commercialCost
    };
  }

  // Вычисляем базовую стоимость и наценку
  const markup = commercialCost - baseAmount;

  // Определяем тип материала/работы
  const materialType = getMaterialType(boqItemType);
  if (!materialType) {
    console.warn(`⚠️ Неизвестный тип элемента: ${boqItemType}`);
    return { materialCost: 0, workCost: commercialCost };
  }

  let materialCost = 0;
  let workCost = 0;

  // Применяем распределение для каждого типа
  switch (materialType) {
    case 'basic':
      materialCost += distribution.basic_material_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.basic_material_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.basic_material_markup_target === 'material' ? markup : 0;
      workCost += distribution.basic_material_markup_target === 'work' ? markup : 0;
      break;

    case 'auxiliary':
      materialCost += distribution.auxiliary_material_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.auxiliary_material_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.auxiliary_material_markup_target === 'material' ? markup : 0;
      workCost += distribution.auxiliary_material_markup_target === 'work' ? markup : 0;
      break;

    case 'subcontract_basic':
      if (distribution.subcontract_basic_material_base_target && distribution.subcontract_basic_material_markup_target) {
        materialCost += distribution.subcontract_basic_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.subcontract_basic_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.subcontract_basic_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.subcontract_basic_material_markup_target === 'work' ? markup : 0;
      } else {
        // Fallback к auxiliary если нет настроек для subcontract_basic
        materialCost += distribution.auxiliary_material_base_target === 'material' ? baseAmount : 0;
        workCost += distribution.auxiliary_material_base_target === 'work' ? baseAmount : 0;
        materialCost += distribution.auxiliary_material_markup_target === 'material' ? markup : 0;
        workCost += distribution.auxiliary_material_markup_target === 'work' ? markup : 0;
      }
      break;

    case 'work':
      materialCost += distribution.work_base_target === 'material' ? baseAmount : 0;
      workCost += distribution.work_base_target === 'work' ? baseAmount : 0;
      materialCost += distribution.work_markup_target === 'material' ? markup : 0;
      workCost += distribution.work_markup_target === 'work' ? markup : 0;
      break;
  }

  return { materialCost, workCost };
}

async function recalculateWithDistribution(tenderId) {
  console.log(`\n🔄 Пересчет стоимостей для тендера ${tenderId}...\n`);

  // Загружаем настройки ценообразования
  const pricingDistribution = await loadPricingDistribution(tenderId);

  if (pricingDistribution) {
    console.log('✅ Настройки ценообразования загружены');
  } else {
    console.log('⚠️  Используются настройки по умолчанию');
  }

  // Загружаем все элементы BOQ для тендера
  const { data: items, error } = await supabase
    .from('boq_items')
    .select('id, boq_item_type, total_amount, total_commercial_material_cost, total_commercial_work_cost')
    .eq('tender_id', tenderId);

  if (error || !items) {
    console.error('❌ Ошибка загрузки элементов:', error);
    return;
  }

  console.log(`📦 Загружено элементов: ${items.length}\n`);

  let updatedCount = 0;
  let errorCount = 0;

  for (const item of items) {
    try {
      const baseAmount = item.total_amount || 0;
      const currentCommercial = (item.total_commercial_material_cost || 0) + (item.total_commercial_work_cost || 0);

      // Применяем распределение
      const { materialCost, workCost } = applyPricingDistribution(
        baseAmount,
        currentCommercial,
        item.boq_item_type,
        pricingDistribution
      );

      // Обновляем элемент
      const { error: updateError } = await supabase
        .from('boq_items')
        .update({
          total_commercial_material_cost: materialCost,
          total_commercial_work_cost: workCost,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Ошибка обновления ${item.id}:`, updateError);
        errorCount++;
      } else {
        updatedCount++;
        if (updatedCount % 10 === 0) {
          console.log(`   Обновлено: ${updatedCount}/${items.length}`);
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка обработки ${item.id}:`, err);
      errorCount++;
    }
  }

  console.log(`\n✅ Пересчет завершен!`);
  console.log(`   Обновлено: ${updatedCount}`);
  console.log(`   Ошибок: ${errorCount}`);
}

// Запуск
async function main() {
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

  await recalculateWithDistribution(tender.id);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  });
