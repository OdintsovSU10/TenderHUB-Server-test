import type { BoqItem, BoqItemFull, BoqItemCreate, BoqItemCommercialUpdate } from '../../domain/entities';
import type { BoqItemType } from '../../domain/value-objects';

/**
 * Интерфейс репозитория элементов BOQ
 * Абстракция для доступа к данным материалов и работ в позициях
 */
export interface IBoqItemRepository {
  /**
   * Получить элементы по ID позиции заказчика
   */
  findByPositionId(positionId: string): Promise<BoqItemFull[]>;

  /**
   * Получить элементы по ID тендера
   */
  findByTenderId(tenderId: string): Promise<BoqItemFull[]>;

  /**
   * Получить элемент по ID
   */
  findById(id: string): Promise<BoqItemFull | null>;

  /**
   * Получить элементы определенного типа по тендеру
   */
  findByTenderIdAndType(tenderId: string, type: BoqItemType): Promise<BoqItemFull[]>;

  /**
   * Получить дочерние материалы для работы
   */
  findChildMaterials(parentWorkItemId: string): Promise<BoqItemFull[]>;

  /**
   * Создать новый элемент
   */
  create(data: BoqItemCreate): Promise<BoqItem>;

  /**
   * Создать несколько элементов
   */
  createMany(items: BoqItemCreate[]): Promise<BoqItem[]>;

  /**
   * Обновить элемент
   */
  update(id: string, data: Partial<BoqItemCreate>): Promise<BoqItem>;

  /**
   * Удалить элемент
   */
  delete(id: string): Promise<void>;

  /**
   * Удалить все элементы позиции
   */
  deleteByPositionId(positionId: string): Promise<void>;

  /**
   * Обновить коммерческие показатели для нескольких элементов
   */
  updateCommercialCosts(items: BoqItemCommercialUpdate[]): Promise<void>;

  /**
   * Обновить порядок сортировки элементов
   */
  updateSortOrder(items: { id: string; sort_number: number }[]): Promise<void>;
}
