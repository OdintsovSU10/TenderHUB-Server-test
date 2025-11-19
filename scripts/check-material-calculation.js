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

async function checkMaterialCalculation() {
  console.log('=== ПРОВЕРКА РАСЧЁТА НАЦЕНКИ ДЛЯ МАТЕРИАЛОВ ===\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  // Получаем параметры
  const { data: params } = await supabase
    .from('tender_markup_percentage')
    .select(`
      value,
      markup_parameter:markup_parameter_id (key, label)
    `)
    .eq('tender_id', tenderId);

  console.log('Параметры для материалов:');
  const paramsMap = {};

  if (params) {
    params.forEach(p => {
      if (p.markup_parameter && p.markup_parameter.key) {
        paramsMap[p.markup_parameter.key] = p.value;
        if (p.markup_parameter.key.includes('material') || p.markup_parameter.key.includes('subcontract_materials')) {
          console.log(`  ${p.markup_parameter.label}: ${p.value}%`);
        }
      }
    });
  }

  // Параметры для расчёта МАТ
  const materialParams = [
    'subcontract_materials_cost_growth',
    'contingency_costs',
    'overhead_own_forces',
    'general_costs_without_subcontract',
    'profit_own_forces'
  ];

  console.log('\nПараметры, используемые в формуле МАТ:');
  materialParams.forEach(key => {
    console.log(`  ${key}: ${paramsMap[key] || 0}%`);
  });

  // Расчёт по формуле МАТ (упрощённый)
  console.log('\nРасчёт коэффициента для МАТ:');

  const base = 1000;
  let result = base;

  // Шаг 1: Материалы РОСТ
  const step1 = base * (1 + (paramsMap['subcontract_materials_cost_growth'] || 0) / 100);
  console.log(`Шаг 1 (Материалы РОСТ): ${base} * (1 + ${paramsMap['subcontract_materials_cost_growth'] || 0}/100) = ${step1}`);

  // Шаг 2: Непредвиденные
  const step2 = base * (1 + (paramsMap['contingency_costs'] || 0) / 100);
  console.log(`Шаг 2 (Непредвиденные): ${base} * (1 + ${paramsMap['contingency_costs'] || 0}/100) = ${step2}`);

  // Шаг 3: ООЗ промежуточно (step1 + step2 - base)
  const step3 = step1 + step2 - base;
  console.log(`Шаг 3 (ООЗ промежуточно): ${step1} + ${step2} - ${base} = ${step3}`);

  // Шаг 4: ООЗ
  const step4 = step3 * (1 + (paramsMap['overhead_own_forces'] || 0) / 100);
  console.log(`Шаг 4 (ООЗ): ${step3} * (1 + ${paramsMap['overhead_own_forces'] || 0}/100) = ${step4}`);

  // Шаг 5: ОФЗ
  const step5 = step4 * (1 + (paramsMap['general_costs_without_subcontract'] || 0) / 100);
  console.log(`Шаг 5 (ОФЗ): ${step4} * (1 + ${paramsMap['general_costs_without_subcontract'] || 0}/100) = ${step5}`);

  // Шаг 6: Прибыль
  const step6 = step5 * (1 + (paramsMap['profit_own_forces'] || 0) / 100);
  console.log(`Шаг 6 (Прибыль): ${step5} * (1 + ${paramsMap['profit_own_forces'] || 0}/100) = ${step6}`);

  const coefficient = step6 / base;
  console.log(`\n📊 Итоговый коэффициент: ${coefficient.toFixed(6)}`);
  console.log(`📊 Процент наценки: ${((coefficient - 1) * 100).toFixed(2)}%`);

  console.log('\n✅ Если subcontract_materials_cost_growth = 0%, то коэффициент будет меньше ожидаемого 1.64076');
}

checkMaterialCalculation();