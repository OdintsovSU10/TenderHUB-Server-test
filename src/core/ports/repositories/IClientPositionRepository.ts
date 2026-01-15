import type { ClientPosition, ClientPositionCreate, ClientPositionUpdate } from '../../domain/entities';

/**
 * Интерфейс репозитория позиций заказчика
 * Абстракция для доступа к данным позиций BOQ
 */
export interface IClientPositionRepository {
  /**
   * Получить все позиции тендера
   */
  findByTenderId(tenderId: string): Promise<ClientPosition[]>;

  /**
   * Получить позицию по ID
   */
  findById(id: string): Promise<ClientPosition | null>;

  /**
   * Получить дочерние позиции
   */
  findChildren(parentPositionId: string): Promise<ClientPosition[]>;

  /**
   * Получить корневые позиции (без родителя)
   */
  findRootPositions(tenderId: string): Promise<ClientPosition[]>;

  /**
   * Создать новую позицию
   */
  create(data: ClientPositionCreate): Promise<ClientPosition>;

  /**
   * Создать несколько позиций
   */
  createMany(items: ClientPositionCreate[]): Promise<ClientPosition[]>;

  /**
   * Обновить позицию
   */
  update(id: string, data: ClientPositionUpdate): Promise<ClientPosition>;

  /**
   * Удалить позицию
   */
  delete(id: string): Promise<void>;

  /**
   * Удалить все позиции тендера
   */
  deleteByTenderId(tenderId: string): Promise<void>;

  /**
   * Обновить итоговые суммы позиции
   */
  updateTotals(
    id: string,
    totals: {
      total_material?: number;
      total_works?: number;
      material_cost_per_unit?: number;
      work_cost_per_unit?: number;
      total_commercial_material?: number;
      total_commercial_work?: number;
      total_commercial_material_per_unit?: number;
      total_commercial_work_per_unit?: number;
    }
  ): Promise<void>;

  /**
   * Обновить номера позиций (для пересортировки)
   */
  updatePositionNumbers(items: { id: string; position_number: number }[]): Promise<void>;
}
