/**
 * Скрипт для инициализации тестовых данных для расчета коммерческих стоимостей
 */

import { supabase } from '../lib/supabase';
import type { MarkupTacticInsert } from '../lib/supabase';
import { logger } from './debug';

export async function initializeTestMarkup(tenderId?: string) {
  logger.info('=== Инициализация тестовых данных для наценок ===');

  try {
    // 1. Получаем первый тендер, если не указан
    if (!tenderId) {
      const { data: tenders } = await supabase
        .from('tenders')
        .select('id, tender_number')
        .limit(1);

      if (!tenders || tenders.length === 0) {
        logger.error('Нет тендеров в БД!');
        return;
      }

      tenderId = tenders[0].id;
      logger.info(`Используем тендер: ${tenders[0].tender_number}`);
    }

    // 2. Создаем тестовую тактику наценок
    logger.info('\n1. Создаем тестовую тактику наценок...');

    const testTactic: MarkupTacticInsert = {
      name: 'Тестовая тактика 20%',
      sequences: {
        'раб': [
          {
            name: 'Наценка 20%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.2
          }
        ],
        'мат': [
          {
            name: 'Наценка 25%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.25
          }
        ],
        'суб-раб': [
          {
            name: 'Наценка 15%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.15
          }
        ],
        'суб-мат': [
          {
            name: 'Наценка 18%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.18
          }
        ],
        'раб-комп.': [
          {
            name: 'Наценка 10%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.1
          }
        ],
        'мат-комп.': [
          {
            name: 'Наценка 12%',
            baseIndex: -1,
            action1: 'multiply',
            operand1Type: 'number',
            operand1Key: 1.12
          }
        ]
      },
      base_costs: {
        'раб': 0,
        'мат': 0,
        'суб-раб': 0,
        'суб-мат': 0,
        'раб-комп.': 0,
        'мат-комп.': 0
      },
      is_global: false
    };

    const { data: tactic, error: tacticError } = await supabase
      .from('markup_tactics')
      .insert(testTactic)
      .select()
      .single();

    if (tacticError) {
      logger.error('Ошибка создания тактики:', tacticError);
      return;
    }

    logger.info(`✓ Создана тактика: ${tactic.id}`);

    // 3. Привязываем тактику к тендеру
    logger.info('\n2. Привязываем тактику к тендеру...');

    const { error: updateError } = await supabase
      .from('tenders')
      .update({ markup_tactic_id: tactic.id })
      .eq('id', tenderId);

    if (updateError) {
      logger.error('Ошибка привязки тактики:', updateError);
      return;
    }

    logger.info('✓ Тактика привязана к тендеру');

    // 4. Создаем тестовые параметры наценок (если используются)
    logger.info('\n3. Создаем параметры наценок...');

    // Сначала проверим, есть ли параметры в БД
    const { data: params } = await supabase
      .from('markup_parameters')
      .select('id, key, label')
      .limit(5);

    if (!params || params.length === 0) {
      // Создаем базовые параметры
      const basicParams = [
        { key: 'overhead', label: 'Накладные расходы', default_value: 15, is_active: true, order_num: 1 },
        { key: 'profit', label: 'Прибыль', default_value: 10, is_active: true, order_num: 2 },
        { key: 'risk', label: 'Риски', default_value: 5, is_active: true, order_num: 3 },
        { key: 'transport', label: 'Транспорт', default_value: 3, is_active: true, order_num: 4 },
        { key: 'storage', label: 'Складирование', default_value: 2, is_active: true, order_num: 5 }
      ];

      const { data: newParams, error: paramsError } = await supabase
        .from('markup_parameters')
        .insert(basicParams)
        .select();

      if (paramsError) {
        logger.error('Ошибка создания параметров:', paramsError);
      } else {
        logger.info(`✓ Создано параметров: ${newParams.length}`);

        // Привязываем значения к тендеру
        const tenderParams = newParams.map(p => ({
          tender_id: tenderId,
          markup_parameter_id: p.id,
          value: p.default_value
        }));

        const { error: valuesError } = await supabase
          .from('tender_markup_percentage')
          .insert(tenderParams);

        if (valuesError) {
          logger.error('Ошибка привязки параметров к тендеру:', valuesError);
        } else {
          logger.info('✓ Параметры привязаны к тендеру');
        }
      }
    } else {
      logger.info('Параметры уже существуют в БД');
    }

    // 5. Проверяем и создаем тестовые базовые стоимости
    logger.info('\n4. Проверяем базовые стоимости в BOQ...');

    const { data: boqItems } = await supabase
      .from('boq_items')
      .select('id, total_amount')
      .eq('tender_id', tenderId)
      .limit(10);

    if (!boqItems || boqItems.length === 0) {
      logger.info('⚠️ Нет элементов BOQ для тендера!');
      logger.info('Создайте позиции заказчика и элементы BOQ через интерфейс.');
    } else {
      let emptyCount = 0;
      boqItems.forEach(item => {
        if (!item.total_amount || item.total_amount === 0) {
          emptyCount++;
        }
      });

      if (emptyCount > 0) {
        logger.info(`⚠️ ${emptyCount} из ${boqItems.length} элементов не имеют базовой стоимости`);

        // Заполняем тестовыми значениями
        logger.info('Заполняем тестовыми базовыми стоимостями...');

        for (const item of boqItems) {
          if (!item.total_amount || item.total_amount === 0) {
            const testAmount = Math.round(Math.random() * 100000) + 10000; // от 10к до 110к

            await supabase
              .from('boq_items')
              .update({ total_amount: testAmount })
              .eq('id', item.id);
          }
        }

        logger.info('✓ Тестовые базовые стоимости установлены');
      } else {
        logger.info('✓ Все элементы имеют базовые стоимости');
      }
    }

    logger.info('\n=== Инициализация завершена ===');
    logger.info('Теперь можно нажать кнопку "Пересчитать" на странице Коммерция');

    return tactic?.id;

  } catch (error) {
    logger.error('Ошибка инициализации:', error);
  }
}

// Экспортируем для использования в консоли браузера (только в DEV)
if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).initializeTestMarkup = initializeTestMarkup;
  logger.info('Для инициализации тестовых данных выполните в консоли:');
  logger.info('window.initializeTestMarkup()');
}