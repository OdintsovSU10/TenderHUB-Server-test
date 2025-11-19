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

async function checkTenderParams() {
  console.log('=== ПРОВЕРКА ПАРАМЕТРОВ ТЕНДЕРА ===\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  // Получаем ВСЕ параметры для тендера
  const { data: params } = await supabase
    .from('tender_markup_percentage')
    .select(`
      value,
      markup_parameter:markup_parameter_id (key, label)
    `)
    .eq('tender_id', tenderId)
    .order('id');

  console.log(`Параметры для тендера ${tenderId}:\n`);

  if (params) {
    params.forEach(p => {
      if (p.markup_parameter && p.markup_parameter.key) {
        console.log(`${p.markup_parameter.label}: ${p.value}%`);
        console.log(`  Ключ: ${p.markup_parameter.key}`);
      }
    });
  }

  // Проверяем дефолтные значения в таблице markup_parameters
  console.log('\n\nДефолтные значения параметров:\n');

  const { data: defaults } = await supabase
    .from('markup_parameters')
    .select('key, label, default_value')
    .order('order_num');

  if (defaults) {
    defaults.forEach(d => {
      console.log(`${d.label}: ${d.default_value}% (по умолчанию)`);
      console.log(`  Ключ: ${d.key}`);
    });
  }

  // Теперь проверим конкретно проблемный параметр
  console.log('\n\n❗ КЛЮЧЕВОЙ ПАРАМЕТР ДЛЯ МАТЕРИАЛОВ:');

  const keyParam = params?.find(p =>
    p.markup_parameter?.key === 'subcontract_materials_cost_growth'
  );

  if (keyParam) {
    console.log(`subcontract_materials_cost_growth = ${keyParam.value}%`);
    if (keyParam.value === 0) {
      console.log('⚠️ Параметр равен 0! Это объясняет низкий коэффициент для материалов.');
    }
  } else {
    console.log('Параметр subcontract_materials_cost_growth не найден в БД для тендера');

    // Проверяем дефолт
    const defaultParam = defaults?.find(d => d.key === 'subcontract_materials_cost_growth');
    if (defaultParam) {
      console.log(`Дефолтное значение: ${defaultParam.default_value}%`);
    }
  }

  // Расчитаем правильный коэффициент с текущими параметрами
  console.log('\n\n📊 РАСЧЁТ КОЭФФИЦИЕНТА ДЛЯ МАТ С ТЕКУЩИМИ ПАРАМЕТРАМИ:');

  const paramsMap = {};
  params?.forEach(p => {
    if (p.markup_parameter?.key) {
      paramsMap[p.markup_parameter.key] = p.value;
    }
  });

  const base = 1000;
  const step1 = base * (1 + (paramsMap['subcontract_materials_cost_growth'] || 0) / 100);
  const step2 = base * (1 + (paramsMap['contingency_costs'] || 0) / 100);
  const step3 = step1 + step2 - base;
  const step4 = step3 * (1 + (paramsMap['overhead_own_forces'] || 0) / 100);
  const step5 = step4 * (1 + (paramsMap['general_costs_without_subcontract'] || 0) / 100);
  const step6 = step5 * (1 + (paramsMap['profit_own_forces'] || 0) / 100);

  const coefficient = step6 / base;
  const markupPercentage = (coefficient - 1) * 100;

  console.log(`\nИтоговый коэффициент: ${coefficient.toFixed(6)}`);
  console.log(`Процент наценки: ${markupPercentage.toFixed(2)}%`);

  if (Math.abs(markupPercentage - 49.56) < 0.1) {
    console.log('\n✅ Это точно соответствует 49.56% на скриншоте!');
    console.log('Проблема найдена: subcontract_materials_cost_growth = 0%');
  }
}

checkTenderParams();