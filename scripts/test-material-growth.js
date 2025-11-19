import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// Загружаем переменные из .env.local
const envPath = path.join(__dirname, '..', '.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'загружен' : 'НЕ НАЙДЕН');
console.log('Supabase Key:', supabaseKey ? 'загружен' : 'НЕ НАЙДЕН');

if (!supabaseUrl || !supabaseKey) {
  console.error('Не удалось загрузить переменные окружения из .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMaterialGrowth() {
  console.log('=== ТЕСТИРОВАНИЕ ПАРАМЕТРА material_cost_growth ===\\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  try {
    // 1. Проверяем параметр в БД
    console.log('1️⃣ ПРОВЕРКА В ТАБЛИЦЕ markup_parameters:\\n');

    const { data: params } = await supabase
      .from('markup_parameters')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('parameter_key', 'material_cost_growth');

    if (params && params.length > 0) {
      console.log(`✅ Найден параметр material_cost_growth = ${params[0].value}%\\n`);
    } else {
      console.log('❌ Параметр material_cost_growth НЕ НАЙДЕН в таблице markup_parameters\\n');
    }

    // 2. Проверяем базовую схему
    console.log('2️⃣ ПРОВЕРКА БАЗОВОЙ СХЕМЫ НАЦЕНОК:\\n');

    const { data: tactic } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('is_global', true)
      .single();

    if (tactic) {
      const sequences = typeof tactic.sequences === 'string'
        ? JSON.parse(tactic.sequences)
        : tactic.sequences;

      const matSequence = sequences['мат'];
      if (matSequence && matSequence[0]) {
        const firstStep = matSequence[0];
        console.log('МАТ - Первый шаг:');
        console.log(`  baseIndex: ${firstStep.baseIndex} (${firstStep.baseIndex === -1 ? 'базовая стоимость' : 'результат шага ' + firstStep.baseIndex})`);
        console.log(`  action1: ${firstStep.action1}`);
        console.log(`  operand1Type: ${firstStep.operand1Type}`);
        console.log(`  operand1Key: ${firstStep.operand1Key}`);
        console.log(`  operand1MultiplyFormat: ${firstStep.operand1MultiplyFormat}`);

        if (firstStep.operand1Key === 'material_cost_growth') {
          console.log('\\n✅ Схема использует material_cost_growth');
        } else {
          console.log(`\\n❌ ОШИБКА! Схема использует ${firstStep.operand1Key} вместо material_cost_growth`);
        }
      }
    }

    // 3. Проверяем реальный расчёт
    console.log('\\n3️⃣ ТЕСТОВЫЙ РАСЧЁТ:\\n');

    // Симулируем расчёт для МАТ
    const baseAmount = 1000000; // 1 млн базовая стоимость
    console.log(`Базовая стоимость: ${baseAmount.toLocaleString('ru-RU')}`);

    // Если параметр найден
    if (params && params.length > 0) {
      const growthPercent = params[0].value;

      // Расчёт по формуле из схемы (multiply с addOne)
      const coefficient = 1 + growthPercent / 100;
      const afterGrowth = baseAmount * coefficient;

      console.log(`\\nПосле Материалы РОСТ (${growthPercent}%):`);
      console.log(`  ${baseAmount.toLocaleString('ru-RU')} × ${coefficient} = ${afterGrowth.toLocaleString('ru-RU')}`);

      // Дальнейшие шаги (из схемы)
      const step2 = afterGrowth * 1.05; // Шаг 2: multiply 5% (addOne)
      console.log(`\\nШаг 2 (×1.05): ${step2.toLocaleString('ru-RU')}`);

      const step3 = step2 * 1.01; // Шаг 3: multiply 1% (addOne)
      console.log(`Шаг 3 (×1.01): ${step3.toLocaleString('ru-RU')}`);

      const step4 = step3 * 1.055; // Шаг 4: multiply 5.5% (addOne)
      console.log(`Шаг 4 (×1.055): ${step4.toLocaleString('ru-RU')}`);

      const step5 = step4 * 1.25; // Шаг 5: multiply 25% (addOne)
      console.log(`Шаг 5 (×1.25): ${step5.toLocaleString('ru-RU')}`);

      const step6 = step5 * 1.18; // Шаг 6: multiply 18% (addOne)
      console.log(`Шаг 6 (×1.18): ${step6.toLocaleString('ru-RU')}`);

      const finalCoefficient = step6 / baseAmount;
      console.log(`\\n📊 ИТОГОВЫЙ КОЭФФИЦИЕНТ: ${finalCoefficient.toFixed(6)}`);
      console.log(`   Ожидаемый: 1.640760`);

      if (Math.abs(finalCoefficient - 1.640760) < 0.001) {
        console.log('✅ Коэффициент правильный!');
      } else {
        console.log('❌ Коэффициент неправильный!');

        // Проверяем, что получается если material_cost_growth = 0
        const coefficientWithZero = 1; // 1 + 0/100
        const afterZeroGrowth = baseAmount * coefficientWithZero;
        const zeroStep2 = afterZeroGrowth * 1.05;
        const zeroStep3 = zeroStep2 * 1.01;
        const zeroStep4 = zeroStep3 * 1.055;
        const zeroStep5 = zeroStep4 * 1.25;
        const zeroStep6 = zeroStep5 * 1.18;
        const zeroFinalCoefficient = zeroStep6 / baseAmount;

        console.log(`\\n   Если бы material_cost_growth = 0%, коэффициент был бы: ${zeroFinalCoefficient.toFixed(6)}`);

        if (Math.abs(finalCoefficient - zeroFinalCoefficient) < 0.001) {
          console.log('   ⚠️ Похоже, что параметр игнорируется (расчёт как будто 0%)');
        }
      }
    }

    // 4. Проверяем реальный BOQ элемент
    console.log('\\n4️⃣ ПРОВЕРКА РЕАЛЬНОГО BOQ ЭЛЕМЕНТА:\\n');

    const { data: boqItems } = await supabase
      .from('boq_items')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('boq_item_type', 'мат')
      .limit(1);

    if (boqItems && boqItems.length > 0) {
      const item = boqItems[0];
      console.log(`Найден элемент: ${item.name || 'без названия'}`);
      console.log(`Базовая стоимость: ${item.total_amount}`);
      console.log(`Коммерческая стоимость (материалы): ${item.total_commercial_material_cost}`);

      if (item.total_amount > 0) {
        const actualCoeff = item.total_commercial_material_cost / item.total_amount;
        console.log(`Фактический коэффициент: ${actualCoeff.toFixed(6)}`);

        if (Math.abs(actualCoeff - 1.495560) < 0.001) {
          console.log('⚠️ Это коэффициент при material_cost_growth = 0%');
        }
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

testMaterialGrowth();