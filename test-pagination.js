// Тест пагинации для вкладки "Единицы измерения"
import { chromium } from 'playwright';

async function testPagination() {
  console.log('🚀 Запуск теста пагинации...\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Открываем страницу
    console.log('📄 Переход на страницу номенклатур...');
    await page.goto('http://localhost:3002/admin/nomenclatures');
    await page.waitForLoadState('networkidle');

    // 2. Переключаемся на вкладку "Единицы измерения"
    console.log('🔄 Переключение на вкладку "Единицы измерения"...');
    await page.click('text=Единицы измерения');
    await page.waitForTimeout(1000);

    // 3. Проверяем наличие таблицы
    const table = await page.locator('.ant-table').first();
    const isTableVisible = await table.isVisible();
    console.log(`✓ Таблица ${isTableVisible ? 'отображается' : 'НЕ отображается'}`);

    // 4. Подсчитываем количество строк в таблице
    const rows = await page.locator('.ant-table-tbody tr').count();
    console.log(`✓ Количество строк в таблице: ${rows}`);

    // 5. Проверяем наличие элементов пагинации
    const pagination = await page.locator('.ant-pagination').first();
    const hasPagination = await pagination.isVisible();
    console.log(`✓ Пагинация ${hasPagination ? 'присутствует' : 'отсутствует'}`);

    if (hasPagination) {
      // 6. Получаем текст с информацией о записях
      const paginationText = await page.locator('.ant-pagination-total-text').textContent();
      console.log(`✓ Информация о записях: ${paginationText}`);

      // 7. Проверяем наличие селектора размера страницы
      const pageSizeSelector = await page.locator('.ant-select-selector').first();
      const hasPageSizeSelector = await pageSizeSelector.isVisible();
      console.log(`✓ Селектор размера страницы ${hasPageSizeSelector ? 'доступен' : 'недоступен'}`);

      // 8. Проверяем наличие кнопок навигации
      const nextButton = await page.locator('.ant-pagination-next');
      const isNextEnabled = !(await nextButton.getAttribute('aria-disabled') === 'true');
      console.log(`✓ Кнопка "Далее" ${isNextEnabled ? 'активна' : 'неактивна'}`);

      // 9. Если есть следующая страница, переходим на неё
      if (isNextEnabled) {
        console.log('\n🔄 Переход на следующую страницу...');
        await nextButton.click();
        await page.waitForTimeout(1000);

        const newRows = await page.locator('.ant-table-tbody tr').count();
        console.log(`✓ Количество строк после перехода: ${newRows}`);

        // Проверяем активность кнопки "Назад"
        const prevButton = await page.locator('.ant-pagination-prev');
        const isPrevEnabled = !(await prevButton.getAttribute('aria-disabled') === 'true');
        console.log(`✓ Кнопка "Назад" ${isPrevEnabled ? 'активна' : 'неактивна'}`);
      }

      // 10. Тест изменения размера страницы
      if (hasPageSizeSelector) {
        console.log('\n🔄 Тест изменения размера страницы...');
        await pageSizeSelector.click();
        await page.waitForTimeout(500);

        // Выбираем 20 записей на странице
        await page.click('text=20 / page');
        await page.waitForTimeout(1000);

        const newPaginationText = await page.locator('.ant-pagination-total-text').textContent();
        console.log(`✓ После изменения размера: ${newPaginationText}`);

        const rowsAfterResize = await page.locator('.ant-table-tbody tr').count();
        console.log(`✓ Количество строк после изменения: ${rowsAfterResize}`);
      }

      // 11. Тест быстрого перехода (если есть данные)
      const quickJumper = await page.locator('.ant-pagination-options-quick-jumper input');
      if (await quickJumper.isVisible()) {
        console.log('\n🔄 Тест быстрого перехода...');
        await quickJumper.fill('1');
        await quickJumper.press('Enter');
        await page.waitForTimeout(1000);
        console.log('✓ Быстрый переход на страницу 1 выполнен');
      }
    }

    console.log('\n✅ Тест пагинации завершен успешно!');

  } catch (error) {
    console.error('\n❌ Ошибка при тестировании:', error.message);
    throw error;
  } finally {
    // Закрываем браузер через 3 секунды
    console.log('\n⏳ Закрытие браузера через 3 секунды...');
    await page.waitForTimeout(3000);
    await browser.close();
  }
}

// Запуск теста
testPagination().catch(console.error);
