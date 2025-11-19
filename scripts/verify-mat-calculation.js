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

async function verifyMatCalculation() {
  console.log('=== ПРОВЕРКА РАСЧЁТА МАТ ПО ШАГАМ ===\n');

  try {
    // Получаем тестовую схему
    const { data: tactics } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('name', 'Базовая схема_ТЕСТОВАЯ')
      .single();

    const matSequence = tactics.sequences['мат'];
    console.log('Найдено шагов для МАТ:', matSequence.length);

    // Параметры из БД
    const params = {
      material_cost_growth: 10,
      contingency_costs: 3,
      overhead_own_forces: 10,
      general_costs_without_subcontract: 20,
      profit_own_forces: 10
    };

    console.log('\nПараметры:');
    Object.entries(params).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}%`);
    });

    // Симулируем расчёт
    const base = 1000;
    let stepResults = [];
    console.log('\n📊 ПОШАГОВЫЙ РАСЧЁТ:\n');
    console.log(`База: ${base}`);

    matSequence.forEach((step, idx) => {
      console.log(`\n--- Шаг ${idx + 1}: ${step.name} ---`);

      let baseValue;
      if (step.baseIndex === -1) {
        baseValue = base;
        console.log(`  Базовое значение: ${base} (исходная)`);
      } else {
        baseValue = stepResults[step.baseIndex];
        console.log(`  Базовое значение: ${baseValue} (результат шага ${step.baseIndex + 1})`);
      }

      let result = baseValue;

      // Первая операция
      if (step.action1) {
        if (step.operand1Type === 'markup') {
          const paramValue = params[step.operand1Key] || 0;
          const multiplier = step.operand1MultiplyFormat === 'addOne'
            ? (1 + paramValue / 100)
            : (paramValue / 100);

          if (step.action1 === 'multiply') {
            result = baseValue * multiplier;
            console.log(`  ${step.action1}: ${baseValue} × ${multiplier} = ${result}`);
            console.log(`    (${step.operand1Key} = ${paramValue}%, формат: ${step.operand1MultiplyFormat})`);
          }
        } else if (step.operand1Type === 'step') {
          const operandValue = stepResults[step.operand1Index];
          if (step.action1 === 'add') {
            result = baseValue + operandValue;
            console.log(`  ${step.action1}: ${baseValue} + ${operandValue} = ${result}`);
          }
        } else if (step.operand1Type === 'number') {
          const operandValue = Number(step.operand1Key);
          if (step.action1 === 'multiply') {
            result = baseValue * operandValue;
            console.log(`  ${step.action1}: ${baseValue} × ${operandValue} = ${result}`);
          }
        }
      }

      // Вторая операция
      if (step.action2) {
        if (step.operand2Type === 'step') {
          const operandValue = step.operand2Index === -1 ? base : stepResults[step.operand2Index];
          if (step.action2 === 'subtract') {
            result = result - operandValue;
            console.log(`  ${step.action2}: ${result + operandValue} - ${operandValue} = ${result}`);
          }
        }
      }

      stepResults.push(result);
      console.log(`  Результат шага: ${result}`);
    });

    const finalResult = stepResults[stepResults.length - 1];
    const coefficient = finalResult / base;

    console.log('\n=== ИТОГОВЫЕ РЕЗУЛЬТАТЫ ===');
    console.log(`Финальная стоимость: ${finalResult}`);
    console.log(`Коэффициент: ${coefficient}`);

    // Сравниваем с ожидаемыми значениями
    console.log('\n📋 СРАВНЕНИЕ:');
    console.log(`Без умножения на 10: ${coefficient / 10}`);
    console.log(`Ожидаемый базовый: 1.640760`);

    // Проверяем, правильно ли применяется material_cost_growth
    const step1Expected = base * 1.1;  // material_cost_growth = 10%
    const step1Actual = stepResults[0];

    if (Math.abs(step1Actual - step1Expected) < 0.01) {
      console.log('\n✅ material_cost_growth применяется правильно!');
    } else {
      console.log('\n❌ ПРОБЛЕМА с material_cost_growth!');
      console.log(`  Ожидалось: ${step1Expected}`);
      console.log(`  Получено: ${step1Actual}`);
    }

    // Проверяем реальные данные в БД
    console.log('\n=== ПРОВЕРКА РЕАЛЬНЫХ ДАННЫХ ===');
    const { data: boqItem } = await supabase
      .from('boq_items')
      .select('*')
      .eq('boq_item_type', 'мат')
      .gt('total_amount', 0)
      .limit(1)
      .single();

    if (boqItem) {
      const dbCoeff = boqItem.total_commercial_material_cost / boqItem.total_amount;
      console.log('В БД коэффициент:', dbCoeff.toFixed(6));
      console.log('Рассчитанный:', coefficient.toFixed(6));

      if (Math.abs(dbCoeff - coefficient) < 0.1) {
        console.log('✅ Коэффициенты совпадают!');
      } else {
        console.log('❌ Коэффициенты не совпадают');
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

verifyMatCalculation();