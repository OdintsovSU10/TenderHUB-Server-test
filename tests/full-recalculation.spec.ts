import { test, expect } from '@playwright/test';

test('Полный пересчёт после исправления базовой схемы', async ({ page }) => {
  // Переходим на страницу Commerce
  await page.goto('http://localhost:3001/commerce');

  // Ждем загрузки страницы
  await page.waitForSelector('h3:has-text("Коммерция")', { timeout: 10000 });

  // Выбираем первый тендер
  const tenderSelect = page.locator('.ant-select').first();
  await tenderSelect.click();
  await page.waitForTimeout(500);

  const tenderOption = page.locator('.ant-select-dropdown').first().locator('.ant-select-item').first();
  if (await tenderOption.isVisible()) {
    await tenderOption.click();
    await page.waitForTimeout(1500);

    console.log('✅ Тендер выбран');

    // ВАЖНО: Нажимаем "Пересчитать" для применения исправленной схемы
    const recalcButton = page.locator('button:has-text("Пересчитать")');
    console.log('🔄 Нажимаем "Пересчитать" для применения исправленной схемы...');
    await recalcButton.click();

    // Ждем завершения расчета
    await page.waitForTimeout(5000);

    console.log('✅ Пересчёт завершён');

    // Теперь запускаем проверку коэффициентов
    console.log('\n📊 Проверка новых коэффициентов после исправления:\n');

    const result = await page.evaluate(async () => {
      if (typeof (window as any).verifyCoefficients === 'function') {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => {
          logs.push(args.join(' '));
          originalLog(...args);
        };

        const tenderId = localStorage.getItem('selectedTenderId') || 'cf2d6854-2851-4692-9956-e873b147d789';
        await (window as any).verifyCoefficients(tenderId);

        console.log = originalLog;

        // Извлекаем коэффициенты из логов
        const coefficients: { [key: string]: number } = {};
        let currentType = '';

        logs.forEach(log => {
          if (log.includes('--- МАТ ---')) currentType = 'мат';
          else if (log.includes('--- РАБ ---')) currentType = 'раб';
          else if (log.includes('--- СУБ-МАТ ---')) currentType = 'суб-мат';
          else if (log.includes('--- СУБ-РАБ ---')) currentType = 'суб-раб';

          if (log.includes('Рассчитанный коэффициент:')) {
            const match = log.match(/Рассчитанный коэффициент: ([\d.]+)/);
            if (match && currentType) {
              coefficients[currentType] = parseFloat(match[1]);
            }
          }
        });

        return { logs, coefficients };
      }
      return { error: 'Функция verifyCoefficients не найдена' };
    });

    if (result.coefficients) {
      console.log('Полученные коэффициенты после исправления:');
      console.log('МАТ:', result.coefficients['мат']?.toFixed(6) || 'не рассчитан');
      console.log('РАБ:', result.coefficients['раб']?.toFixed(6) || 'не рассчитан');
      console.log('СУБ-МАТ:', result.coefficients['суб-мат']?.toFixed(6) || 'не рассчитан');
      console.log('СУБ-РАБ:', result.coefficients['суб-раб']?.toFixed(6) || 'не рассчитан');

      console.log('\nОжидаемые коэффициенты:');
      console.log('МАТ: 1.640760');
      console.log('РАБ: 2.885148');
      console.log('СУБ-МАТ: 1.403600');
      console.log('СУБ-РАБ: 1.403600');

      // Проверяем МАТ
      if (result.coefficients['мат']) {
        const matCoeff = result.coefficients['мат'];
        if (Math.abs(matCoeff - 1.64076) < 0.001) {
          console.log('\n✅ МАТ теперь правильный! Исправление сработало!');
        } else {
          console.log(`\n❌ МАТ всё ещё неправильный: ${matCoeff.toFixed(6)}`);
          console.log('Возможные причины:');
          console.log('1. Кэш не обновился - попробуйте обновить страницу');
          console.log('2. Параметр material_cost_growth не равен 10%');
        }
      }
    }

    // Проверяем также статистику на странице
    const statsValues = await page.locator('.ant-statistic-content-value').allTextContents();
    if (statsValues.length >= 2) {
      console.log('\n📊 Статистика на странице:');
      console.log('Базовая стоимость:', statsValues[0]);
      console.log('Коммерческая стоимость:', statsValues[1]);
    }
  }
});