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

async function fixBaseTactic() {
  console.log('=== ИСПРАВЛЕНИЕ БАЗОВОЙ СХЕМЫ НАЦЕНОК ===\n');

  try {
    // 1. Получаем базовую схему
    const { data: tactic, error: fetchError } = await supabase
      .from('markup_tactics')
      .select('*')
      .eq('is_global', true)
      .single();

    if (fetchError || !tactic) {
      console.error('Не удалось найти глобальную тактику:', fetchError);
      return;
    }

    console.log(`Найдена тактика: ${tactic.name}`);
    console.log(`ID: ${tactic.id}\n`);

    // 2. Парсим последовательности
    const sequences = typeof tactic.sequences === 'string'
      ? JSON.parse(tactic.sequences)
      : tactic.sequences;

    // 3. Проверяем текущую конфигурацию
    console.log('ТЕКУЩАЯ КОНФИГУРАЦИЯ:\n');

    const matSequence = sequences['мат'];
    if (matSequence && matSequence[0]) {
      console.log('МАТ - Шаг 1 (Материалы РОСТ):');
      console.log(`  Используется параметр: ${matSequence[0].operand1Key}`);

      if (matSequence[0].operand1Key === 'subcontract_materials_cost_growth') {
        console.log('  ❌ ОШИБКА: Используется параметр для субподряда!\n');

        // 4. Исправляем
        console.log('ИСПРАВЛЕНИЕ:\n');
        matSequence[0].operand1Key = 'material_cost_growth';
        console.log('  ✅ Изменено на: material_cost_growth\n');

        // 5. Сохраняем обратно в БД
        const { error: updateError } = await supabase
          .from('markup_tactics')
          .update({ sequences })
          .eq('id', tactic.id);

        if (updateError) {
          console.error('Ошибка при обновлении:', updateError);
          return;
        }

        console.log('✅ Базовая схема успешно исправлена!');
        console.log('\nТеперь:');
        console.log('- МАТ использует: material_cost_growth (Рост стоимости материалов)');
        console.log('- СУБ-МАТ использует: subcontract_materials_cost_growth (Рост стоимости материалов субподряда)');

      } else if (matSequence[0].operand1Key === 'material_cost_growth') {
        console.log('  ✅ Уже исправлено! Используется правильный параметр.');
      } else {
        console.log(`  ⚠️ Неожиданный параметр: ${matSequence[0].operand1Key}`);
      }
    }

    // Проверим СУБ-МАТ
    console.log('\nСУБ-МАТ - Шаг 1:');
    const subMatSequence = sequences['суб-мат'];
    if (subMatSequence && subMatSequence[0]) {
      console.log(`  Используется параметр: ${subMatSequence[0].operand1Key}`);
      if (subMatSequence[0].operand1Key === 'subcontract_works_cost_growth') {
        console.log('  ⚠️ Используется параметр для работ, а не материалов!');
        console.log('  Должно быть: subcontract_materials_cost_growth');

        // Исправляем и это тоже
        subMatSequence[0].operand1Key = 'subcontract_materials_cost_growth';

        const { error: updateError } = await supabase
          .from('markup_tactics')
          .update({ sequences })
          .eq('id', tactic.id);

        if (!updateError) {
          console.log('  ✅ Исправлено на: subcontract_materials_cost_growth');
        }
      }
    }

    console.log('\n=== ИСПРАВЛЕНИЕ ЗАВЕРШЕНО ===');
    console.log('Нажмите "Пересчитать" на странице Коммерция для применения изменений.');

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

fixBaseTactic();