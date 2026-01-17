import type { BoqItem, BoqItemCreate } from '../../domain/entities';

/**
 * Результат операции записи BOQ элемента
 */
export interface BoqItemWriteResult {
  success: boolean;
  item?: BoqItem;
  items?: BoqItem[];
  error?: string;

  /**
   * Флаг конфликта версий (optimistic concurrency)
   * true если другой пользователь изменил запись
   */
  conflict?: boolean;

  /**
   * Текущие данные записи при конфликте
   * Позволяет показать пользователю актуальное состояние
   */
  currentItem?: BoqItem;
}

/**
 * Результат пакетной вставки с маппингом ID
 */
export interface BoqItemBatchInsertResult {
  success: boolean;
  insertedItems: BoqItem[];
  /** Маппинг индекса исходного массива -> ID созданного элемента */
  idMapping: Map<number, string>;
  error?: string;
}

/**
 * Интерфейс сервиса записи BOQ элементов с audit логированием
 *
 * Этот сервис инкапсулирует все операции записи BOQ items,
 * автоматически добавляя audit trail для отслеживания изменений.
 *
 * Использование:
 * - Для UI операций где нужен audit trail (создание, редактирование, удаление)
 * - НЕ использовать для системных операций (перенос версий, пересчет наценок)
 */
export interface IBoqItemWriteService {
  /**
   * Установить пользователя для audit операций
   * Должен быть вызван перед любыми операциями
   */
  setUser(userId: string): void;

  /**
   * Создать новый BOQ элемент с audit логом
   */
  create(data: BoqItemCreate): Promise<BoqItemWriteResult>;

  /**
   * Создать несколько BOQ элементов с audit логом
   * @param items - Массив данных для создания
   * @returns Результат с массивом созданных элементов и маппингом индексов
   */
  createMany(items: BoqItemCreate[]): Promise<BoqItemBatchInsertResult>;

  /**
   * Обновить BOQ элемент с audit логом и optimistic concurrency
   * @param id - ID элемента
   * @param data - Данные для обновления
   * @param expectedVersion - Ожидаемая версия (row_version). Если передана и не совпадает - возвращает conflict=true
   */
  update(
    id: string,
    data: Partial<BoqItemCreate>,
    expectedVersion?: number
  ): Promise<BoqItemWriteResult>;

  /**
   * Обновить несколько BOQ элементов с audit логом
   */
  updateMany(
    items: { id: string; data: Partial<BoqItemCreate> }[]
  ): Promise<BoqItemWriteResult>;

  /**
   * Удалить BOQ элемент с audit логом
   */
  delete(id: string): Promise<BoqItemWriteResult>;

  /**
   * Удалить несколько BOQ элементов с audit логом
   */
  deleteMany(ids: string[]): Promise<BoqItemWriteResult>;

  /**
   * Восстановить BOQ элемент из audit записи
   * @param boqItemId - ID элемента для восстановления
   * @param oldData - Данные предыдущей версии из audit лога
   */
  rollback(
    boqItemId: string,
    oldData: Partial<BoqItemCreate>
  ): Promise<BoqItemWriteResult>;

  // ========== Batch Operations (без audit, системные) ==========

  /**
   * Атомарно поменять местами sort_number двух элементов
   * Выполняется одним RPC вызовом на сервере
   */
  swapSortNumbers(itemId1: string, itemId2: string): Promise<BoqItemWriteResult>;

  /**
   * Пересчитать quantity и total_amount для всех материалов,
   * привязанных к работе. Выполняется на сервере без JS циклов.
   * @param workId - ID работы (boq_item с типом раб/суб-раб/раб-комп.)
   */
  recalcLinkedMaterials(workId: string): Promise<BoqItemWriteResult>;

  /**
   * Обновить total_material и total_works в client_positions
   * на основе суммы total_amount из boq_items
   * @param positionId - ID позиции заказчика
   */
  recalcPositionTotals(positionId: string): Promise<BoqItemWriteResult>;
}
