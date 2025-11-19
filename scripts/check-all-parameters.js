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

async function checkAllParameters() {
  console.log('=== ПРОВЕРКА ВСЕХ ПАРАМЕТРОВ НАЦЕНОК ===\\n');

  const tenderId = 'cf2d6854-2851-4692-9956-e873b147d789';

  try {
    // 1. Проверка tender_markup_percentage
    console.log('1️⃣ ТАБЛИЦА tender_markup_percentage:\\n');

    const { data: tenderMarkups } = await supabase
      .from('tender_markup_percentage')
      .select('*')
      .eq('tender_id', tenderId);

    if (tenderMarkups && tenderMarkups.length > 0) {
      console.log(`Найдено записей: ${tenderMarkups.length}\\n`);
      tenderMarkups.forEach(markup => {
        console.log(`  Запись:`, markup);
      });

      // Проверяем конкретно material_cost_growth
      const materialGrowth = tenderMarkups.find(m => m.percentage_key === 'material_cost_growth');
      if (materialGrowth) {
        console.log(`\\n✅ material_cost_growth НАЙДЕН в tender_markup_percentage: ${materialGrowth.value}%`);
      } else {
        console.log('\\n❌ material_cost_growth НЕ НАЙДЕН в tender_markup_percentage');
      }
    } else {
      console.log('❌ Нет записей в tender_markup_percentage для этого тендера');
    }

    // 2. Проверка markup_parameters
    console.log('\\n2️⃣ ТАБЛИЦА markup_parameters:\\n');

    const { data: markupParams } = await supabase
      .from('markup_parameters')
      .select('*')
      .eq('tender_id', tenderId);

    if (markupParams && markupParams.length > 0) {
      console.log(`Найдено записей: ${markupParams.length}\\n`);
      markupParams.forEach(param => {
        console.log(`  ${param.parameter_key}: ${param.value}%`);
      });

      // Проверяем конкретно material_cost_growth
      const materialGrowth = markupParams.find(p => p.parameter_key === 'material_cost_growth');
      if (materialGrowth) {
        console.log(`\\n✅ material_cost_growth НАЙДЕН в markup_parameters: ${materialGrowth.value}%`);
      } else {
        console.log('\\n❌ material_cost_growth НЕ НАЙДЕН в markup_parameters');
      }
    } else {
      console.log('❌ Нет записей в markup_parameters для этого тендера');
    }

    // 3. Проверка функции loadMarkupParameters
    console.log('\\n3️⃣ СИМУЛЯЦИЯ loadMarkupParameters:\\n');

    // Имитируем логику loadMarkupParameters
    const parametersMap = new Map();

    // Из markup_parameters
    if (markupParams) {
      markupParams.forEach(param => {
        parametersMap.set(param.parameter_key, param.value);
      });
    }

    // Из tender_markup_percentage (перезаписывают)
    if (tenderMarkups) {
      tenderMarkups.forEach(markup => {
        parametersMap.set(markup.percentage_key, markup.value);
      });
    }

    console.log('Результирующая Map параметров:');
    console.log(Array.from(parametersMap.entries()));

    const materialGrowthFinal = parametersMap.get('material_cost_growth');
    if (materialGrowthFinal !== undefined) {
      console.log(`\\n✅ material_cost_growth в итоговой Map: ${materialGrowthFinal}%`);
    } else {
      console.log('\\n❌ material_cost_growth ОТСУТСТВУЕТ в итоговой Map');
    }

  } catch (error) {
    console.error('Ошибка:', error);
  }
}

checkAllParameters();