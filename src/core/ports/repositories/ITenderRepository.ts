import type { Tender, TenderCreate, TenderUpdate } from '../../domain/entities';

/**
 * Интерфейс репозитория тендеров
 * Абстракция для доступа к данным тендеров
 */
export interface ITenderRepository {
  /**
   * Получить все тендеры
   */
  findAll(): Promise<Tender[]>;

  /**
   * Получить тендер по ID
   */
  findById(id: string): Promise<Tender | null>;

  /**
   * Найти тендеры по номеру
   */
  findByNumber(tenderNumber: string): Promise<Tender[]>;

  /**
   * Найти тендеры по клиенту
   */
  findByClient(clientName: string): Promise<Tender[]>;

  /**
   * Получить активные (не архивные) тендеры
   */
  findActive(): Promise<Tender[]>;

  /**
   * Получить архивные тендеры
   */
  findArchived(): Promise<Tender[]>;

  /**
   * Создать новый тендер
   */
  create(data: TenderCreate): Promise<Tender>;

  /**
   * Обновить тендер
   */
  update(id: string, data: TenderUpdate): Promise<Tender>;

  /**
   * Удалить тендер
   */
  delete(id: string): Promise<void>;

  /**
   * Архивировать тендер
   */
  archive(id: string): Promise<void>;

  /**
   * Восстановить тендер из архива
   */
  unarchive(id: string): Promise<void>;
}
