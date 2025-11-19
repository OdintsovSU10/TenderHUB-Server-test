import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Чтение .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

let supabaseUrl = '';
let supabaseKey = '';

envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key === 'VITE_SUPABASE_URL') {
    supabaseUrl = value.trim();
  } else if (key === 'VITE_SUPABASE_ANON_KEY') {
    supabaseKey = value.trim();
  }
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPositionCalc() {
  console.log('=== ОТЛАДКА РАСЧЁТА ПОЗИЦИИ "БЛАГОУСТРОЙСТВО ТЕРРИТОРИИ" ===\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  // 1. Найдём эту позицию
  const { data: positions } = await supabase
    .from('client_positions')
    .select('*')
    .eq('tender_id', tenderId)
    .ilike('name', '%Благоустройство%');

  if (!positions || positions.length === 0) {
    console.log('Позиция "Благоустройство" не найдена');
    return;
  }

  const position = positions[0];
  console.log(`Найдена позиция: ${position.name}`);
  console.log(`ID: ${position.id}\n`);

  // 2. Найдём BOQ items для этой позиции
  const { data: boqItems } = await supabase
    .from('boq_items')
    .select('*')
    .eq('client_position_id', position.id);

  if (!boqItems || boqItems.length === 0) {
    console.log('Нет BOQ элементов для этой позиции');
    return;
  }

  console.log(`Найдено BOQ элементов: ${boqItems.length}\n`);

  let totalBase = 0;
  let totalCommercial = 0;

  // 3. Для каждого элемента
  for (const item of boqItems) {
    console.log(`\n--- ${item.item_type} ---`);
    console.log(`Название: ${item.name || 'без названия'}`);
    console.log(`Базовая стоимость (total_amount): ${item.total_amount || 0}`);
    console.log(`Коммерческая для материалов: ${item.total_commercial_material_cost || 0}`);
    console.log(`Коммерческая для работ: ${item.total_commercial_work_cost || 0}`);
    console.log(`Markup coefficient: ${item.markup_coefficient || 'не задан'}`);

    totalBase += item.total_amount || 0;

    if (item.item_type?.includes('мат')) {
      totalCommercial += item.total_commercial_material_cost || 0;
    } else if (item.item_type?.includes('раб')) {
      totalCommercial += item.total_commercial_work_cost || 0;
    }
  }

  console.log('\n=== ИТОГИ ПО ПОЗИЦИИ ===');
  console.log(`Базовая стоимость: ${totalBase.toFixed(2)}`);
  console.log(`Коммерческая стоимость: ${totalCommercial.toFixed(2)}`);

  if (totalBase > 0) {
    const coefficient = totalCommercial / totalBase;
    const markupPercentage = (coefficient - 1) * 100;

    console.log(`Коэффициент: ${coefficient.toFixed(6)}`);
    console.log(`Процент наценки: ${markupPercentage.toFixed(2)}%`);

    if (Math.abs(markupPercentage - 49.56) < 0.5) {
      console.log('\n✅ Это точно соответствует 49.56% на скриншоте!');

      // Проверим почему такой низкий коэффициент
      console.log('\n=== АНАЛИЗ ===');

      // Проверим, есть ли материалы с коэффициентом < 1.6
      const matItems = boqItems.filter(item => item.item_type === 'мат');
      for (const item of matItems) {
        if (item.total_amount > 0) {
          const itemCoeff = (item.total_commercial_material_cost || 0) / item.total_amount;
          console.log(`${item.name}: коэффициент ${itemCoeff.toFixed(4)}`);

          if (itemCoeff < 1.6) {
            console.log(`  ⚠️ Низкий коэффициент! Возможно, при расчёте использовался 0% для subcontract_materials_cost_growth`);
          }
        }
      }
    }
  }

  // 4. Проверим, когда был последний расчёт
  console.log('\n=== ВРЕМЯ ПОСЛЕДНЕГО ОБНОВЛЕНИЯ ===');
  boqItems.forEach(item => {
    if (item.updated_at) {
      console.log(`${item.item_type}: ${new Date(item.updated_at).toLocaleString('ru-RU')}`);
    }
  });
}

debugPositionCalc();