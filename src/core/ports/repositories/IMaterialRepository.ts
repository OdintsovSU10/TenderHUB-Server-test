import type {
  MaterialName,
  MaterialNameCreate,
  MaterialLibrary,
  MaterialLibraryFull,
  MaterialLibraryCreate,
} from '../../domain/entities';
import type { MaterialType } from '../../domain/value-objects';

/**
 * Интерфейс репозитория наименований материалов
 */
export interface IMaterialNameRepository {
  /**
   * Получить все наименования
   */
  findAll(): Promise<MaterialName[]>;

  /**
   * Получить наименование по ID
   */
  findById(id: string): Promise<MaterialName | null>;

  /**
   * Поиск по названию
   */
  search(query: string): Promise<MaterialName[]>;

  /**
   * Создать наименование
   */
  create(data: MaterialNameCreate): Promise<MaterialName>;

  /**
   * Обновить наименование
   */
  update(id: string, data: Partial<MaterialNameCreate>): Promise<MaterialName>;

  /**
   * Удалить наименование
   */
  delete(id: string): Promise<void>;
}

/**
 * Интерфейс репозитория библиотеки материалов
 */
export interface IMaterialLibraryRepository {
  /**
   * Получить все записи
   */
  findAll(): Promise<MaterialLibraryFull[]>;

  /**
   * Получить запись по ID
   */
  findById(id: string): Promise<MaterialLibraryFull | null>;

  /**
   * Получить записи по ID наименования
   */
  findByMaterialNameId(materialNameId: string): Promise<MaterialLibraryFull[]>;

  /**
   * Получить записи по типу материала
   */
  findByMaterialType(materialType: MaterialType): Promise<MaterialLibraryFull[]>;

  /**
   * Поиск по названию материала
   */
  search(query: string): Promise<MaterialLibraryFull[]>;

  /**
   * Создать запись
   */
  create(data: MaterialLibraryCreate): Promise<MaterialLibrary>;

  /**
   * Обновить запись
   */
  update(id: string, data: Partial<MaterialLibraryCreate>): Promise<MaterialLibrary>;

  /**
   * Удалить запись
   */
  delete(id: string): Promise<void>;
}
