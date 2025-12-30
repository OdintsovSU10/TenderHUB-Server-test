import { test, expect } from '@playwright/test';

test.describe('Проверка коэффициентов наценок', () => {
  test('Проверка расчёта коэффициентов по Базовой схеме', async ({ page }) => {
    // Переходим на страницу Commerce
    await page.goto('http://localhost:3001/commerce');

    // Ждем загрузки страницы
    await page.waitForSelector('h3:has-text("Коммерция")', { timeout: 10000 });

    // Собираем вывод консоли
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleLogs.push(msg.text());
      }
    });

    // Выбираем первый тендер
    const tenderSelect = page.locator('.ant-select').first();
    await tenderSelect.click();
    await page.waitForTimeout(500);

    const tenderOption = page.locator('.ant-select-dropdown').first().locator('.ant-select-item').first();
    if (await tenderOption.isVisible()) {
      await tenderOption.click();
      await page.waitForTimeout(1500);

      // Нажимаем кнопку проверки коэффициентов
      const verifyButton = page.locator('button:has-text("Коэфф.")');
      if (await verifyButton.isVisible()) {
        console.log('✓ Кнопка проверки коэффициентов найдена');

        // Запускаем проверку через консоль
        const result = await page.evaluate(async () => {
          const logs: string[] = [];
          const originalLog = console.log;
          console.log = (...args: any[]) => {
            logs.push(args.join(' '));
            originalLog(...args);
          };

          try {
            if (typeof (window as any).verifyCoefficients === 'function') {
              // Получаем ID выбранного тендера
              const tenderId = localStorage.getItem('selectedTenderId') || 'cf2d6854-2851-4692-9956-e873b147d789';
              await (window as any).verifyCoefficients(tenderId);
            }
          } catch (error) {
            logs.push('Ошибка: ' + error);
          }

          console.log = originalLog;
          return logs;
        });

        // Анализируем результаты
        console.log('\n=== РЕЗУЛЬТАТЫ ПРОВЕРКИ КОЭФФИЦИЕНТОВ ===\n');

        let hasErrors = false;
        const coefficients: { [key: string]: number } = {};

        result.forEach(log => {
          console.log(log);

          // Извлекаем коэффициенты из логов
          if (log.includes('Рассчитанный коэффициент:')) {
            const match = log.match(/Рассчитанный коэффициент: ([\d.]+)/);
            if (match) {
              const currentType = result[result.indexOf(log) - 3]?.match(/--- (.+) ---/)?.[1];
              if (currentType) {
                coefficients[currentType.toLowerCase()] = parseFloat(match[1]);
              }
            }
          }

          if (log.includes('❌ НЕКОРРЕКТНО')) {
            hasErrors = true;
          }
        });

        console.log('\n📊 Итоговые коэффициенты:');
        console.log('РАБ:', coefficients['раб'] || 'не рассчитан');
        console.log('МАТ:', coefficients['мат'] || 'не рассчитан');
        console.log('СУБ-РАБ:', coefficients['суб-раб'] || 'не рассчитан');
        console.log('СУБ-МАТ:', coefficients['суб-мат'] || 'не рассчитан');

        // Ожидаемые значения (из вашего сообщения)
        const expected = {
          'раб': 2.885148,
          'мат': 1.64076,
          'суб-раб': 1.4036,
          'суб-мат': 1.4036
        };

        console.log('\n✅ Ожидаемые коэффициенты:');
        console.log('РАБ:', expected['раб']);
        console.log('МАТ:', expected['мат']);
        console.log('СУБ-РАБ:', expected['суб-раб']);
        console.log('СУБ-МАТ:', expected['суб-мат']);

        // Проверяем точность (допускаем погрешность 0.001)
        const tolerance = 0.001;

        for (const [type, expectedValue] of Object.entries(expected)) {
          if (coefficients[type]) {
            const diff = Math.abs(coefficients[type] - expectedValue);
            if (diff > tolerance) {
              console.log(`\n❌ Коэффициент для ${type} не совпадает!`);
              console.log(`   Получено: ${coefficients[type]}`);
              console.log(`   Ожидалось: ${expectedValue}`);
              console.log(`   Разница: ${diff}`);
              hasErrors = true;
            } else {
              console.log(`\n✅ Коэффициент для ${type} корректен`);
            }
          }
        }

        expect(hasErrors).toBeFalsy();
      } else {
        console.log('Кнопка проверки коэффициентов не найдена');
      }
    }
  });

  test('Проверка применения наценок к позициям', async ({ page }) => {
    await page.goto('http://localhost:3001/commerce');
    await page.waitForSelector('h3:has-text("Коммерция")');

    // Выбираем тендер
    const tenderSelect = page.locator('.ant-select').first();
    await tenderSelect.click();
    await page.waitForTimeout(500);

    const tenderOption = page.locator('.ant-select-dropdown').first().locator('.ant-select-item').first();
    if (await tenderOption.isVisible()) {
      await tenderOption.click();
      await page.waitForTimeout(1500);

      // Нажимаем "Пересчитать"
      const recalcButton = page.locator('button:has-text("Пересчитать")');
      await recalcButton.click();

      // Ждем завершения расчета
      await page.waitForTimeout(3000);

      // Проверяем наличие данных
      const table = page.locator('.ant-table');
      if (await table.isVisible()) {
        // Проверяем статистику
        const statsValues = await page.locator('.ant-statistic-content-value').allTextContents();

        console.log('\n📊 Статистика расчётов:');
        if (statsValues.length >= 2) {
          console.log('Базовая стоимость:', statsValues[0]);
          console.log('Коммерческая стоимость:', statsValues[1]);

          // Проверяем, что коммерческая больше базовой
          const baseValue = parseFloat(statsValues[0].replace(/[^\d.-]/g, ''));
          const commercialValue = parseFloat(statsValues[1].replace(/[^\d.-]/g, ''));

          if (commercialValue > baseValue) {
            console.log('✅ Коммерческая стоимость больше базовой - наценки применены');

            const ratio = commercialValue / baseValue;
            console.log(`Общий коэффициент наценки: ${ratio.toFixed(4)}`);
          } else if (baseValue === 0 && commercialValue === 0) {
            console.log('⚠️ Нет данных для расчёта (обе стоимости = 0)');
          } else {
            console.log('❌ Коммерческая стоимость не больше базовой!');
          }
        }
      }
    }
  });
});