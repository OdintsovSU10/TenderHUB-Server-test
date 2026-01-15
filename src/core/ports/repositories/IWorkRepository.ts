import type {
  WorkName,
  WorkNameCreate,
  WorkLibrary,
  WorkLibraryFull,
  WorkLibraryCreate,
} from '../../domain/entities';
import type { WorkItemType } from '../../domain/value-objects';

/**
 * Интерфейс репозитория наименований работ
 */
export interface IWorkNameRepository {
  /**
   * Получить все наименования
   */
  findAll(): Promise<WorkName[]>;

  /**
   * Получить наименование по ID
   */
  findById(id: string): Promise<WorkName | null>;

  /**
   * Поиск по названию
   */
  search(query: string): Promise<WorkName[]>;

  /**
   * Создать наименование
   */
  create(data: WorkNameCreate): Promise<WorkName>;

  /**
   * Обновить наименование
   */
  update(id: string, data: Partial<WorkNameCreate>): Promise<WorkName>;

  /**
   * Удалить наименование
   */
  delete(id: string): Promise<void>;
}

/**
 * Интерфейс репозитория библиотеки работ
 */
export interface IWorkLibraryRepository {
  /**
   * Получить все записи
   */
  findAll(): Promise<WorkLibraryFull[]>;

  /**
   * Получить запись по ID
   */
  findById(id: string): Promise<WorkLibraryFull | null>;

  /**
   * Получить записи по ID наименования
   */
  findByWorkNameId(workNameId: string): Promise<WorkLibraryFull[]>;

  /**
   * Получить записи по типу работы
   */
  findByItemType(itemType: WorkItemType): Promise<WorkLibraryFull[]>;

  /**
   * Поиск по названию работы
   */
  search(query: string): Promise<WorkLibraryFull[]>;

  /**
   * Создать запись
   */
  create(data: WorkLibraryCreate): Promise<WorkLibrary>;

  /**
   * Обновить запись
   */
  update(id: string, data: Partial<WorkLibraryCreate>): Promise<WorkLibrary>;

  /**
   * Удалить запись
   */
  delete(id: string): Promise<void>;
}
