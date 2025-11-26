/**
 * Скрипт для проверки наличия тендеров в базе данных
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Получаем путь к текущему файлу и директории
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загружаем переменные окружения из .env.local
const envPath = resolve(__dirname, '../.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Ошибка: переменные окружения не загружены');
  console.error('Проверьте файл .env.local');
  console.error(`VITE_SUPABASE_URL: ${supabaseUrl ? 'установлен' : 'НЕ УСТАНОВЛЕН'}`);
  console.error(`VITE_SUPABASE_PUBLISHABLE_KEY: ${supabaseKey ? 'установлен' : 'НЕ УСТАНОВЛЕН'}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Проверка подключения к Supabase...');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...`);

async function checkTenders() {
  try {
    console.log('\n📋 Загрузка списка тендеров...');

    const { data: tenders, error } = await supabase
      .from('tenders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Ошибка при загрузке тендеров:', error);
      return;
    }

    console.log(`\n✅ Найдено тендеров: ${tenders?.length || 0}`);

    if (tenders && tenders.length > 0) {
      console.log('\n📊 Список тендеров:');
      console.log('='.repeat(80));

      tenders.forEach((tender, index) => {
        console.log(`\n${index + 1}. ${tender.title || 'Без названия'}`);
        console.log(`   ID: ${tender.id}`);
        console.log(`   Заказчик: ${tender.customer_name || 'не указан'}`);
        console.log(`   Местоположение: ${tender.location || 'не указано'}`);
        console.log(`   Дата создания: ${tender.created_at || 'не указана'}`);

        if (tender.markup_tactic_id) {
          console.log(`   ✓ Тактика наценок: ${tender.markup_tactic_id}`);
        } else {
          console.log(`   ⚠️ Тактика наценок НЕ УСТАНОВЛЕНА`);
        }
      });

      console.log('\n' + '='.repeat(80));

      // Проверяем тактики наценок для первого тендера
      if (tenders[0].markup_tactic_id) {
        console.log(`\n🔧 Проверка тактики наценок для тендера "${tenders[0].title}"...`);

        const { data: tactic, error: tacticError } = await supabase
          .from('markup_tactics')
          .select('*')
          .eq('id', tenders[0].markup_tactic_id)
          .single();

        if (tacticError) {
          console.error('❌ Ошибка при загрузке тактики:', tacticError);
        } else if (tactic) {
          console.log(`\n✅ Тактика: ${tactic.name}`);

          // Загружаем параметры тактики
          const { data: params, error: paramsError } = await supabase
            .from('markup_parameters')
            .select('*')
            .eq('markup_tactic_id', tactic.id)
            .order('order_number', { ascending: true });

          if (paramsError) {
            console.error('❌ Ошибка при загрузке параметров:', paramsError);
          } else if (params) {
            console.log(`\n📊 Найдено параметров: ${params.length}`);
            console.log('\nПараметры:');
            console.log('='.repeat(80));

            params.forEach((param, index) => {
              console.log(`\n${index + 1}. ${param.parameter_name}`);
              console.log(`   Порядок: ${param.order_number}`);
              console.log(`   База расчёта: ${param.base_value}`);
              console.log(`   Коэффициент: ${param.coefficient}${param.is_percentage ? '%' : ''}`);

              // Проверяем, подходит ли параметр под 0,6к
              const name = param.parameter_name.toLowerCase();
              const is06k = name.includes('0,6') ||
                           name.includes('0.6') ||
                           (name.includes('раб') && name.includes('см')) ||
                           name.includes('к работам');

              if (is06k) {
                console.log(`   >>> ✅ ПОДХОДИТ ПОД КРИТЕРИИ 0,6к <<<`);
              }
            });

            console.log('\n' + '='.repeat(80));
          }
        }
      }
    } else {
      console.log('\n⚠️ В базе данных нет тендеров!');
      console.log('Создайте тендер через интерфейс приложения или загрузите тестовые данные.');
    }
  } catch (error) {
    console.error('❌ Общая ошибка:', error);
  }
}

checkTenders();
