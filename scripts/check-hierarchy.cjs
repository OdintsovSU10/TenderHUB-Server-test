const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkHierarchy() {
  const { data, error } = await supabase
    .from('client_positions')
    .select('position_number, work_name, hierarchy_level, parent_position_id')
    .limit(30)
    .order('position_number', { ascending: true });

  if (error) {
    console.error('Ошибка:', error);
    return;
  }

  console.log('Структура поля hierarchy_level:');
  console.log('position | level | parent | название');
  console.log('---------|-------|--------|----------');
  data.forEach(p => {
    const name = p.work_name.length > 40 ? p.work_name.substring(0, 37) + '...' : p.work_name;
    const level = (p.hierarchy_level !== null && p.hierarchy_level !== undefined) ? p.hierarchy_level.toString() : 'null';
    const hasParent = p.parent_position_id ? 'да' : 'нет';
    console.log(`${p.position_number.toString().padStart(8)} | ${level.padStart(5)} | ${hasParent.padStart(6)} | ${name}`);
  });

  // Подсчет уникальных значений hierarchy_level
  const levelCounts = {};
  data.forEach(p => {
    const level = p.hierarchy_level !== null && p.hierarchy_level !== undefined ? p.hierarchy_level : 'null';
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  });

  console.log('\nПодсчет по уровням:');
  Object.entries(levelCounts).forEach(([level, count]) => {
    console.log(`  hierarchy_level = ${level}: ${count} позиций`);
  });
}

checkHierarchy();
