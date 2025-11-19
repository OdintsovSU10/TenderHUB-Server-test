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

async function checkTestTactic() {
  console.log('=== ПРОВЕРКА СХЕМЫ "БАЗОВАЯ СХЕМА_ТЕСТОВАЯ" ===\n');

  try {
    // Получаем схему по имени
    const { data: tactics } = await supabase
      .from('markup_tactics')
      .select('*')
      .like('name', '%ТЕСТОВАЯ%');

    if (!tactics || tactics.length === 0) {
      console.log('❌ Схема "Базовая схема_ТЕСТОВАЯ" не найдена');
      return;
    }

    const tactic = tactics[0];
    console.log('📋 Найдена схема:', tactic.name);
    console.log('ID:', tactic.id);

    // Проверяем каждый тип
    const types = ['мат', 'раб', 'суб-мат', 'суб-раб'];

    for (const type of types) {
      const sequence = tactic.sequences[type];
      if (!sequence || sequence.length === 0) continue;

      console.log(`\n=== ${type.toUpperCase()} (${sequence.length} шагов) ===`);

      // Проверяем последний шаг
      const lastStep = sequence[sequence.length - 1];
      console.log('\nПоследний шаг:');
      console.log('  Название:', lastStep.name);
      console.log('  Действие:', lastStep.action1);

      if (lastStep.operand1Type === 'number') {
        console.log('  Операнд:', lastStep.operand1Key, '(число)');
        if (lastStep.operand1Key === 10 || lastStep.operand1Key === '10') {
          console.log('  ⚠️ НАЙДЕНО УМНОЖЕНИЕ НА 10!');
        }
      } else if (lastStep.operand1Type === 'markup') {
        console.log('  Операнд:', lastStep.operand1Key, '(параметр)');
      }

      // Проверяем все шаги на умножение на большие числа
      sequence.forEach((step, idx) => {
        if (step.action1 === 'multiply' && step.operand1Type === 'number') {
          const value = Number(step.operand1Key);
          if (value >= 10) {
            console.log(`\n  ⚠️ Шаг ${idx + 1} (${step.name}): умножение на ${value}`);
          }
        }
      });
    }

    // Проверяем текущий тендер
    console.log('\n=== ПРОВЕРКА ПРИМЕНЕНИЯ К ТЕНДЕРУ ===');

    const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';
    const { data: tender } = await supabase
      .from('tenders')
      .select('name, markup_tactic_id')
      .eq('id', tenderId)
      .single();

    if (tender) {
      console.log('Тендер:', tender.name);
      console.log('Использует схему ID:', tender.markup_tactic_id);

      if (tender.markup_tactic_id === tactic.id) {
        console.log('✅ Тендер использует схему "Базовая схема_ТЕСТОВАЯ"');
      } else {
        console.log('❌ Тендер использует другую схему');
      }
    }

    // Проверяем расчёт для СУБ-МАТ и СУБ-РАБ
    console.log('\n=== РАСЧЁТ ДЛЯ СУБ-МАТ ===');
    const subMatSeq = tactic.sequences['суб-мат'];
    if (subMatSeq) {
      console.log('Количество шагов:', subMatSeq.length);

      // Симулируем расчёт
      const base = 1000;
      let result = base;
      const params = {
        subcontract_materials_cost_growth: 10,
        overhead_subcontract: 10,
        profit_subcontract: 16
      };

      subMatSeq.forEach((step, idx) => {
        console.log(`\nШаг ${idx + 1}: ${step.name}`);
        const prevResult = result;

        if (step.action1 === 'multiply') {
          if (step.operand1Type === 'markup') {
            const value = params[step.operand1Key] || 0;
            const mult = step.operand1MultiplyFormat === 'addOne' ? (1 + value/100) : value/100;
            result = result * mult;
            console.log(`  ${prevResult} × ${mult} = ${result}`);
          } else if (step.operand1Type === 'number') {
            result = result * Number(step.operand1Key);
            console.log(`  ${prevResult} × ${step.operand1Key} = ${result}`);
          }
        }
      });

      const finalCoeff = result / base;
      console.log(`\nИтоговый коэффициент: ${finalCoeff}`);
      console.log('Ожидаемый (без ×10): 1.4036');
      console.log('Ожидаемый (с ×10): 14.036');

      if (Math.abs(finalCoeff - 14.036) < 0.1) {
        console.log('✅ Коэффициент соответствует схеме с умножением на 10');
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkTestTactic();