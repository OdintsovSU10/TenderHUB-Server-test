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

if (!supabaseUrl || !supabaseKey) {
  console.error('Не удалось загрузить переменные окружения из .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Копируем функцию расчёта из markupCalculator
function calculateMarkupStep(baseAmount, sequence, parameters) {
  const stepResults = [];

  for (const step of sequence) {
    // Получаем базовое значение
    let baseValue = step.baseIndex === -1 ? baseAmount : stepResults[step.baseIndex];

    // Применяем первую операцию
    if (step.action1 && step.operand1Type) {
      let operandValue;

      if (step.operand1Type === 'markup') {
        const markupValue = parameters[step.operand1Key] || 0;
        operandValue = step.operand1MultiplyFormat === 'addOne'
          ? (1 + markupValue / 100)
          : (markupValue / 100);
      } else if (step.operand1Type === 'step') {
        operandValue = stepResults[step.operand1Index];
      } else if (step.operand1Type === 'number') {
        operandValue = Number(step.operand1Key);
      }

      // Применяем операцию
      if (step.action1 === 'multiply') {
        baseValue = baseValue * operandValue;
      } else if (step.action1 === 'add') {
        baseValue = baseValue + operandValue;
      } else if (step.action1 === 'subtract') {
        baseValue = baseValue - operandValue;
      }
    }

    // Применяем вторую операцию (если есть)
    if (step.action2 && step.operand2Type) {
      let operandValue;

      if (step.operand2Type === 'step') {
        if (step.operand2Index === -1) {
          operandValue = baseAmount;
        } else {
          operandValue = stepResults[step.operand2Index];
        }
      }

      if (step.action2 === 'subtract') {
        baseValue = baseValue - operandValue;
      } else if (step.action2 === 'add') {
        baseValue = baseValue + operandValue;
      }
    }

    stepResults.push(baseValue);
  }

  return stepResults[stepResults.length - 1];
}

async function checkCalculationBug() {
  console.log('=== ПРОВЕРКА ОШИБКИ РАСЧЁТА (10x) ===\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  try {
    // 1. Получаем схему наценок
    const { data: tender } = await supabase
      .from('tenders')
      .select('markup_tactic_id')
      .eq('id', tenderId)
      .single();

    const { data: tactic } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('id', tender.markup_tactic_id)
      .single();

    // 2. Получаем параметры
    const { data: params } = await supabase
      .from('tender_markup_percentage')
      .select('*')
      .eq('tender_id', tenderId);

    const PARAM_MAP = {
      '78b4763a-1b67-4079-a0ec-fe40c8a05e00': 'material_cost_growth',
      '4952629e-3026-47f3-a7de-1f0166de75d4': 'contingency_costs',
      '227c4abd-e3bd-471c-95ea-d0c1d0100506': 'overhead_own_forces',
      'd40f22a5-119c-47ed-817d-ce58603b398d': 'general_costs_without_subcontract',
      '369e3c15-a03e-475c-bdd4-a91a0b70a4e9': 'profit_own_forces'
    };

    const parameters = {};
    params.forEach(p => {
      const key = PARAM_MAP[p.markup_parameter_id];
      if (key) {
        parameters[key] = p.value;
      }
    });

    console.log('Параметры:', parameters);

    // 3. Берём первый МАТ элемент
    const { data: boqItem } = await supabase
      .from('boq_items')
      .select('*')
      .eq('tender_id', tenderId)
      .eq('boq_item_type', 'мат')
      .gt('total_amount', 0)
      .limit(1)
      .single();

    if (!boqItem) {
      console.log('Нет МАТ элементов');
      return;
    }

    console.log('\n📦 BOQ Элемент:');
    console.log('  ID:', boqItem.id.substring(0, 8));
    console.log('  Название:', boqItem.name || 'без названия');
    console.log('  База:', boqItem.total_amount);
    console.log('  Коммерч. (в БД):', boqItem.total_commercial_material_cost);
    console.log('  commercial_markup (в БД):', boqItem.commercial_markup);

    // 4. Рассчитываем правильный коэффициент
    const matSequence = tactic.sequences['мат'];
    const calculatedCommercial = calculateMarkupStep(boqItem.total_amount, matSequence, parameters);
    const calculatedCoeff = calculatedCommercial / boqItem.total_amount;

    console.log('\n📊 Расчёт:');
    console.log('  Рассчитанная коммерч.:', calculatedCommercial);
    console.log('  Рассчитанный коэфф.:', calculatedCoeff.toFixed(6));
    console.log('  Ожидаемый коэфф.: 1.640760');

    // 5. Сравниваем с БД
    const dbCoeff = boqItem.total_commercial_material_cost / boqItem.total_amount;
    console.log('\n⚠️ В БД:');
    console.log('  Коэффициент в БД:', dbCoeff.toFixed(6));
    console.log('  Разница:', (dbCoeff / calculatedCoeff).toFixed(2) + 'x');

    if (Math.abs(dbCoeff - calculatedCoeff * 10) < 0.1) {
      console.log('\n❌ НАЙДЕНА ПРОБЛЕМА: Коэффициент в БД завышен ровно в 10 раз!');
      console.log('Возможные причины:');
      console.log('1. Ошибка при сохранении (умножение на 10)');
      console.log('2. Повторное применение коэффициента');
      console.log('3. Неправильное преобразование процентов');

      // Проверяем commercial_markup
      if (boqItem.commercial_markup) {
        console.log('\nПоле commercial_markup:', boqItem.commercial_markup);
        if (Math.abs(boqItem.commercial_markup - calculatedCoeff) < 0.01) {
          console.log('✅ commercial_markup правильный!');
          console.log('❌ Но total_commercial_material_cost завышен в 10 раз');
        } else if (Math.abs(boqItem.commercial_markup - dbCoeff) < 0.01) {
          console.log('❌ commercial_markup тоже завышен в 10 раз!');
        }
      }
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkCalculationBug();