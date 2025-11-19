import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as path from 'path';
import * as url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Загружаем переменные из .env.local
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWithoutGrowth() {
  console.log('=== ТЕСТ: ЧТО ЕСЛИ material_cost_growth = 0? ===\n');

  const baseAmount = 1000;

  // Параметры с material_cost_growth = 0
  const params0 = {
    material_cost_growth: 0,      // <-- 0% вместо 10%
    contingency_costs: 3,
    overhead_own_forces: 10,
    general_costs_without_subcontract: 20,
    profit_own_forces: 10
  };

  // Параметры с material_cost_growth = 10
  const params10 = {
    material_cost_growth: 10,      // <-- 10%
    contingency_costs: 3,
    overhead_own_forces: 10,
    general_costs_without_subcontract: 20,
    profit_own_forces: 10
  };

  // Расчёт при 0%
  let result0 = baseAmount;
  result0 = result0 * (1 + params0.material_cost_growth / 100);  // Шаг 1: Материалы РОСТ
  const step2_0 = baseAmount * (1 + params0.contingency_costs / 100); // Шаг 2: Непредвиденные
  result0 = result0 + step2_0 - baseAmount;  // Шаг 3: ООЗ промежуточно
  result0 = result0 * (1 + params0.overhead_own_forces / 100);  // Шаг 4: ООЗ
  result0 = result0 * (1 + params0.general_costs_without_subcontract / 100);  // Шаг 5: ОФЗ
  result0 = result0 * (1 + params0.profit_own_forces / 100);  // Шаг 6: Прибыль

  const coeff0 = result0 / baseAmount;

  // Расчёт при 10%
  let result10 = baseAmount;
  result10 = result10 * (1 + params10.material_cost_growth / 100);  // Шаг 1: Материалы РОСТ
  const step2_10 = baseAmount * (1 + params10.contingency_costs / 100); // Шаг 2: Непредвиденные
  result10 = result10 + step2_10 - baseAmount;  // Шаг 3: ООЗ промежуточно
  result10 = result10 * (1 + params10.overhead_own_forces / 100);  // Шаг 4: ООЗ
  result10 = result10 * (1 + params10.general_costs_without_subcontract / 100);  // Шаг 5: ОФЗ
  result10 = result10 * (1 + params10.profit_own_forces / 100);  // Шаг 6: Прибыль

  const coeff10 = result10 / baseAmount;

  console.log('При material_cost_growth = 0%:');
  console.log('  Коэффициент:', coeff0.toFixed(6));
  console.log('  Помножить на 10:', (coeff0 * 10).toFixed(6));

  console.log('\nПри material_cost_growth = 10%:');
  console.log('  Коэффициент:', coeff10.toFixed(6));
  console.log('  Помножить на 10:', (coeff10 * 10).toFixed(6));

  console.log('\n📊 СРАВНЕНИЕ С БД:');
  console.log('  В БД найдено: 14.955600');
  console.log('  Это близко к:', (coeff0 * 10).toFixed(6), '(при 0% × 10)');
  console.log('  Разница:', Math.abs(14.9556 - coeff0 * 10).toFixed(4));

  if (Math.abs(14.9556 - coeff0 * 10) < 0.001) {
    console.log('\n✅ ПОДТВЕРЖДЕНО:');
    console.log('В БД сохранён коэффициент при material_cost_growth=0%, умноженный на 10!');
    console.log('\nПРОБЛЕМА:');
    console.log('1. material_cost_growth не применяется (используется 0% вместо 10%)');
    console.log('2. Результат умножается на 10 при сохранении');
  }

  // Проверим реальный элемент
  console.log('\n=== ПРОВЕРКА РЕАЛЬНОГО ЭЛЕМЕНТА ===');
  const { data: item } = await supabase
    .from('boq_items')
    .select('*')
    .eq('id', '04178c81-febb-4c37-b09e-9bc7bb436b66')
    .single();

  if (item) {
    const realCoeff = item.total_commercial_material_cost / item.total_amount;
    console.log('База:', item.total_amount);
    console.log('Коммерч.:', item.total_commercial_material_cost);
    console.log('Коэфф. в БД:', realCoeff.toFixed(6));
    console.log('commercial_markup:', item.commercial_markup);

    // Рассчитаем что должно быть
    const shouldBe0 = item.total_amount * coeff0;
    const shouldBe10 = item.total_amount * coeff10;

    console.log('\nДолжно быть при 0%:', shouldBe0.toFixed(2));
    console.log('Должно быть при 10%:', shouldBe10.toFixed(2));
    console.log('Сохранено в БД:', item.total_commercial_material_cost.toFixed(2));

    // Проверим гипотезу "0% × 10"
    const hypothesis = item.total_amount * coeff0 * 10;
    console.log('\nГипотеза (0% × 10):', hypothesis.toFixed(2));
    const diff = Math.abs(hypothesis - item.total_commercial_material_cost);
    console.log('Разница:', diff.toFixed(2));

    if (diff < 1) {
      console.log('✅ ГИПОТЕЗА ПОДТВЕРЖДЕНА!');
    }
  }
}

testWithoutGrowth();