import type { MarkupTactic, MarkupTacticCreate } from '../../domain/entities';

/**
 * Интерфейс репозитория тактик наценок
 * Абстракция для доступа к данным тактик расчета наценок
 */
export interface IMarkupTacticRepository {
  /**
   * Получить все тактики
   */
  findAll(): Promise<MarkupTactic[]>;

  /**
   * Получить тактику по ID
   */
  findById(id: string): Promise<MarkupTactic | null>;

  /**
   * Получить глобальные тактики (доступные всем)
   */
  findGlobal(): Promise<MarkupTactic[]>;

  /**
   * Получить тактики пользователя
   */
  findByUserId(userId: string): Promise<MarkupTactic[]>;

  /**
   * Получить тактику, привязанную к тендеру
   */
  findByTenderId(tenderId: string): Promise<MarkupTactic | null>;

  /**
   * Создать тактику
   */
  create(data: MarkupTacticCreate): Promise<MarkupTactic>;

  /**
   * Обновить тактику
   */
  update(id: string, data: Partial<MarkupTacticCreate>): Promise<MarkupTactic>;

  /**
   * Удалить тактику
   */
  delete(id: string): Promise<void>;

  /**
   * Клонировать тактику
   */
  clone(id: string, newName?: string): Promise<MarkupTactic>;

  /**
   * Привязать тактику к тендеру
   */
  attachToTender(tacticId: string, tenderId: string): Promise<void>;

  /**
   * Отвязать тактику от тендера
   */
  detachFromTender(tenderId: string): Promise<void>;
}
