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

async function showGlobalTactic() {
  console.log('=== СТРУКТУРА ГЛОБАЛЬНОЙ (БАЗОВОЙ) СХЕМЫ НАЦЕНОК ===\n');

  try {
    // 1. Получаем глобальную тактику
    const { data: globalTactic, error } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('is_global', true)
      .single();

    if (error || !globalTactic) {
      console.error('Глобальная тактика не найдена!', error);

      // Проверим "Базовую схему" по имени
      const { data: baseTactic } = await supabase
        .from('markup_tactics')
        .select('*')
        .eq('name', 'Базовая схема')
        .single();

      if (baseTactic) {
        console.log('Найдена "Базовая схема" по имени (но не помечена как глобальная)');
        displayTactic(baseTactic);
      } else {
        console.log('Базовая схема не найдена в БД');
      }
      return;
    }

    displayTactic(globalTactic);

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

function displayTactic(tactic) {
  console.log(`Название: ${tactic.name}`);
  console.log(`ID: ${tactic.id}`);
  console.log(`Глобальная: ${tactic.is_global ? 'ДА' : 'НЕТ'}`);
  console.log(`Создана: ${new Date(tactic.created_at).toLocaleString('ru-RU')}`);
  console.log('\n');

  // Парсим последовательности
  const sequences = typeof tactic.sequences === 'string'
    ? JSON.parse(tactic.sequences)
    : tactic.sequences;

  const types = ['мат', 'раб', 'суб-мат', 'суб-раб', 'мат-комп.', 'раб-комп.'];

  console.log('=== ПОСЛЕДОВАТЕЛЬНОСТИ РАСЧЁТА ===\n');

  for (const type of types) {
    console.log(`\n--- ${type.toUpperCase()} ---`);
    const sequence = sequences[type];

    if (!sequence || !Array.isArray(sequence) || sequence.length === 0) {
      console.log('  ❌ Последовательность пустая или отсутствует');
      continue;
    }

    console.log(`  Количество шагов: ${sequence.length}`);
    console.log('  Формула расчёта:');

    sequence.forEach((step, index) => {
      console.log(`\n  Шаг ${index + 1}: "${step.name || 'Без названия'}"`);

      // База для расчёта
      if (step.baseIndex === -1) {
        console.log('    База: ПРЯМЫЕ ЗАТРАТЫ (total_amount из boq_items)');
      } else if (step.baseIndex >= 0) {
        console.log(`    База: Результат шага ${step.baseIndex + 1}`);
      }

      // Первая операция
      console.log(`    Операция: ${getOperationDescription(step.action1, step.operand1Type, step.operand1Key)}`);

      // Вторая операция (если есть)
      if (step.action2) {
        console.log(`    Доп. операция: ${getOperationDescription(step.action2, step.operand2Type, step.operand2Key)}`);
      }

      // Третья операция (если есть)
      if (step.action3) {
        console.log(`    Доп. операция 2: ${getOperationDescription(step.action3, step.operand3Type, step.operand3Key)}`);
      }
    });

    // Показываем итоговую формулу
    console.log('\n  📊 Итоговая формула:');
    const formula = buildFormula(sequence);
    console.log(`    ${formula}`);
  }

  // Показываем используемые параметры
  console.log('\n\n=== ИСПОЛЬЗУЕМЫЕ ПАРАМЕТРЫ ===\n');
  const usedParams = new Set();

  for (const type of types) {
    const sequence = sequences[type];
    if (!sequence || !Array.isArray(sequence)) continue;

    sequence.forEach((step) => {
      if (step.operand1Type === 'markup') usedParams.add(step.operand1Key);
      if (step.operand2Type === 'markup') usedParams.add(step.operand2Key);
      if (step.operand3Type === 'markup') usedParams.add(step.operand3Key);
      if (step.operand4Type === 'markup') usedParams.add(step.operand4Key);
      if (step.operand5Type === 'markup') usedParams.add(step.operand5Key);
    });
  }

  if (usedParams.size === 0) {
    console.log('✅ Не используются параметры из БД (только числовые значения)');
  } else {
    console.log('Параметры, требующиеся из таблицы tender_markup_percentage:');
    usedParams.forEach(param => {
      console.log(`  • ${param}`);
    });
  }
}

function getOperationDescription(action, operandType, operandKey) {
  const actionMap = {
    'multiply': 'умножить на',
    'divide': 'разделить на',
    'add': 'прибавить',
    'subtract': 'вычесть'
  };

  const actionText = actionMap[action] || action;

  if (operandType === 'number') {
    return `${actionText} ${operandKey} (число)`;
  } else if (operandType === 'markup') {
    return `${actionText} ${operandKey}% (параметр из БД)`;
  } else if (operandType === 'step') {
    return `${actionText} результат шага ${operandKey + 1}`;
  }

  return `${actionText} ${operandKey}`;
}

function buildFormula(sequence) {
  if (!sequence || sequence.length === 0) return 'Пустая формула';

  let formula = 'ПРЯМЫЕ_ЗАТРАТЫ';

  sequence.forEach((step) => {
    const op = getOperatorSymbol(step.action1);
    const value = getOperandDisplay(step.operand1Type, step.operand1Key);

    if (op === '*' || op === '/') {
      formula = `(${formula}) ${op} ${value}`;
    } else {
      formula = `${formula} ${op} ${value}`;
    }

    // Дополнительные операции
    if (step.action2) {
      const op2 = getOperatorSymbol(step.action2);
      const value2 = getOperandDisplay(step.operand2Type, step.operand2Key);
      formula = `${formula} ${op2} ${value2}`;
    }
  });

  return formula;
}

function getOperatorSymbol(action) {
  const symbols = {
    'multiply': '*',
    'divide': '/',
    'add': '+',
    'subtract': '-'
  };
  return symbols[action] || action;
}

function getOperandDisplay(type, key) {
  if (type === 'number') {
    return String(key);
  } else if (type === 'markup') {
    return `[${key}%]`;
  } else if (type === 'step') {
    return `[Шаг${key + 1}]`;
  }
  return String(key);
}

showGlobalTactic();