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

async function checkParameterTypes() {
  console.log('=== ПРОВЕРКА ТАБЛИЦЫ markup_parameter_types ===\\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  try {
    // 1. Проверяем все типы параметров
    console.log('1️⃣ ВСЕ ТИПЫ ПАРАМЕТРОВ:\\n');

    const { data: parameterTypes } = await supabase
      .from('markup_parameter_types')
      .select('*')
      .order('name');

    if (parameterTypes && parameterTypes.length > 0) {
      console.log(`Найдено типов: ${parameterTypes.length}\\n`);

      // Создаём Map для быстрого поиска
      const typesMap = new Map();
      parameterTypes.forEach(type => {
        console.log(`  ${type.parameter_key}: ${type.name}`);
        typesMap.set(type.id, type);
      });

      // Проверяем material_cost_growth
      const materialGrowthType = parameterTypes.find(t => t.parameter_key === 'material_cost_growth');
      if (materialGrowthType) {
        console.log(`\\n✅ material_cost_growth НАЙДЕН:`);
        console.log(`  ID: ${materialGrowthType.id}`);
        console.log(`  Название: ${materialGrowthType.name}`);
        console.log(`  Описание: ${materialGrowthType.description}`);
      } else {
        console.log('\\n❌ material_cost_growth НЕ НАЙДЕН в markup_parameter_types');
      }

      // 2. Проверяем связь с tender_markup_percentage
      console.log('\\n2️⃣ СВЯЗЬ С tender_markup_percentage:\\n');

      const { data: tenderMarkups } = await supabase
        .from('tender_markup_percentage')
        .select('*')
        .eq('tender_id', tenderId);

      if (tenderMarkups && tenderMarkups.length > 0) {
        console.log('Параметры тендера с расшифровкой:\\n');

        tenderMarkups.forEach(markup => {
          const paramType = typesMap.get(markup.markup_parameter_id);
          if (paramType) {
            console.log(`  ${paramType.parameter_key}: ${markup.value}%`);
            console.log(`    (${paramType.name})`);
          } else {
            console.log(`  Неизвестный параметр ID ${markup.markup_parameter_id}: ${markup.value}%`);
          }
        });

        // Проверяем, есть ли material_cost_growth
        if (materialGrowthType) {
          const tenderMaterialGrowth = tenderMarkups.find(m => m.markup_parameter_id === materialGrowthType.id);
          if (tenderMaterialGrowth) {
            console.log(`\\n✅ material_cost_growth НАЙДЕН в tender_markup_percentage: ${tenderMaterialGrowth.value}%`);
          } else {
            console.log(`\\n❌ material_cost_growth (ID: ${materialGrowthType.id}) НЕ НАЙДЕН в tender_markup_percentage`);
            console.log('   Возможно, параметр не был добавлен для этого тендера');
          }
        }
      }

      // 3. Проверяем, какой ID нужен для material_cost_growth
      if (materialGrowthType) {
        console.log('\\n3️⃣ ДЛЯ ДОБАВЛЕНИЯ material_cost_growth:\\n');
        console.log(`INSERT INTO tender_markup_percentage (tender_id, markup_parameter_id, value)`);
        console.log(`VALUES ('${tenderId}', '${materialGrowthType.id}', 10);`);
      }

    } else {
      console.log('❌ Таблица markup_parameter_types пуста');
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkParameterTypes();