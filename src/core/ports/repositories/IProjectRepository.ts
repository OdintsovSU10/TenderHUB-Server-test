import type {
  Project,
  ProjectFull,
  ProjectCreate,
  ProjectAgreement,
  ProjectAgreementCreate,
  ProjectCompletion,
  ProjectCompletionCreate,
} from '../../domain/entities';

/**
 * Интерфейс репозитория проектов
 * Абстракция для доступа к данным текущих объектов
 */
export interface IProjectRepository {
  /**
   * Получить все проекты
   */
  findAll(): Promise<ProjectFull[]>;

  /**
   * Получить проект по ID
   */
  findById(id: string): Promise<ProjectFull | null>;

  /**
   * Получить активные проекты
   */
  findActive(): Promise<ProjectFull[]>;

  /**
   * Получить проект по связанному тендеру
   */
  findByTenderId(tenderId: string): Promise<ProjectFull | null>;

  /**
   * Создать проект
   */
  create(data: ProjectCreate): Promise<Project>;

  /**
   * Обновить проект
   */
  update(id: string, data: Partial<ProjectCreate>): Promise<Project>;

  /**
   * Удалить проект
   */
  delete(id: string): Promise<void>;

  /**
   * Деактивировать проект
   */
  deactivate(id: string): Promise<void>;

  /**
   * Активировать проект
   */
  activate(id: string): Promise<void>;
}

/**
 * Интерфейс репозитория дополнительных соглашений
 */
export interface IProjectAgreementRepository {
  /**
   * Получить все соглашения проекта
   */
  findByProjectId(projectId: string): Promise<ProjectAgreement[]>;

  /**
   * Получить соглашение по ID
   */
  findById(id: string): Promise<ProjectAgreement | null>;

  /**
   * Создать соглашение
   */
  create(data: ProjectAgreementCreate): Promise<ProjectAgreement>;

  /**
   * Обновить соглашение
   */
  update(id: string, data: Partial<ProjectAgreementCreate>): Promise<ProjectAgreement>;

  /**
   * Удалить соглашение
   */
  delete(id: string): Promise<void>;
}

/**
 * Интерфейс репозитория выполнения проекта
 */
export interface IProjectCompletionRepository {
  /**
   * Получить все записи выполнения проекта
   */
  findByProjectId(projectId: string): Promise<ProjectCompletion[]>;

  /**
   * Получить записи за определенный год
   */
  findByProjectIdAndYear(projectId: string, year: number): Promise<ProjectCompletion[]>;

  /**
   * Получить запись по ID
   */
  findById(id: string): Promise<ProjectCompletion | null>;

  /**
   * Создать запись
   */
  create(data: ProjectCompletionCreate): Promise<ProjectCompletion>;

  /**
   * Обновить запись
   */
  update(id: string, data: Partial<ProjectCompletionCreate>): Promise<ProjectCompletion>;

  /**
   * Удалить запись
   */
  delete(id: string): Promise<void>;

  /**
   * Получить сумму выполнения проекта
   */
  getTotalCompletion(projectId: string): Promise<number>;
}
