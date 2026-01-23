import React, { createContext, useContext, useMemo } from 'react';

// Core сервисы
import {
  PositionHierarchyService,
  MarkupCalculatorService,
  MatchingService,
} from '@/core/services';

// Core порты
import type {
  INotificationService,
  IConfirmationService,
  ILoggerService,
  IBoqItemRepository,
  ITenderRepository,
  IClientPositionRepository,
  IBoqItemWriteService,
  IMaterialNameRepository,
  IMaterialLibraryRepository,
  IWorkNameRepository,
  IWorkLibraryRepository,
  IMarkupTacticRepository,
  IProjectRepository,
  IProjectAgreementRepository,
  IProjectCompletionRepository,
} from '@/core/ports';

// Адаптеры
import {
  AntdNotificationService,
  AntdConfirmationService,
  ConsoleLoggerService,
  SupabaseBoqItemRepository,
  SupabaseTenderRepository,
  SupabaseClientPositionRepository,
  SupabaseBoqItemWriteService,
  SupabaseMaterialNameRepository,
  SupabaseMaterialLibraryRepository,
  SupabaseWorkNameRepository,
  SupabaseWorkLibraryRepository,
  SupabaseMarkupTacticRepository,
  SupabaseProjectRepository,
  SupabaseProjectAgreementRepository,
  SupabaseProjectCompletionRepository,
} from '../adapters';

/**
 * Интерфейс контейнера сервисов
 */
export interface CoreServices {
  // Бизнес-сервисы
  positionHierarchy: PositionHierarchyService;
  markupCalculator: MarkupCalculatorService;
  matching: MatchingService;

  // UI сервисы
  notifications: INotificationService;
  confirmations: IConfirmationService;
  logger: ILoggerService;

  // Репозитории
  boqItemRepository: IBoqItemRepository;
  tenderRepository: ITenderRepository;
  clientPositionRepository: IClientPositionRepository;

  // Репозитории материалов
  materialNameRepository: IMaterialNameRepository;
  materialLibraryRepository: IMaterialLibraryRepository;

  // Репозитории работ
  workNameRepository: IWorkNameRepository;
  workLibraryRepository: IWorkLibraryRepository;

  // Репозиторий тактик наценок
  markupTacticRepository: IMarkupTacticRepository;

  // Репозитории проектов
  projectRepository: IProjectRepository;
  projectAgreementRepository: IProjectAgreementRepository;
  projectCompletionRepository: IProjectCompletionRepository;

  // Сервис записи BOQ элементов (с audit)
  boqItemWriteService: IBoqItemWriteService;
}

const CoreServicesContext = createContext<CoreServices | null>(null);

interface CoreServicesProviderProps {
  children: React.ReactNode;
}

/**
 * Провайдер Core сервисов (DI контейнер)
 *
 * Инициализирует все сервисы и репозитории, делая их доступными
 * через контекст для всего приложения.
 */
export function CoreServicesProvider({ children }: CoreServicesProviderProps) {
  const services = useMemo<CoreServices>(() => {
    // UI сервисы
    const logger = new ConsoleLoggerService('App', 'info');
    const notifications = new AntdNotificationService();
    const confirmations = new AntdConfirmationService();

    // Бизнес-сервисы
    const positionHierarchy = new PositionHierarchyService();
    const markupCalculator = new MarkupCalculatorService(logger.child('MarkupCalculator'));
    const matching = new MatchingService();

    // Репозитории
    const boqItemRepository = new SupabaseBoqItemRepository();
    const tenderRepository = new SupabaseTenderRepository();
    const clientPositionRepository = new SupabaseClientPositionRepository();

    // Репозитории материалов
    const materialNameRepository = new SupabaseMaterialNameRepository();
    const materialLibraryRepository = new SupabaseMaterialLibraryRepository();

    // Репозитории работ
    const workNameRepository = new SupabaseWorkNameRepository();
    const workLibraryRepository = new SupabaseWorkLibraryRepository();

    // Репозиторий тактик наценок
    const markupTacticRepository = new SupabaseMarkupTacticRepository();

    // Репозитории проектов
    const projectRepository = new SupabaseProjectRepository();
    const projectAgreementRepository = new SupabaseProjectAgreementRepository();
    const projectCompletionRepository = new SupabaseProjectCompletionRepository();

    // Сервис записи BOQ элементов
    const boqItemWriteService = new SupabaseBoqItemWriteService();

    return {
      positionHierarchy,
      markupCalculator,
      matching,
      notifications,
      confirmations,
      logger,
      boqItemRepository,
      tenderRepository,
      clientPositionRepository,
      materialNameRepository,
      materialLibraryRepository,
      workNameRepository,
      workLibraryRepository,
      markupTacticRepository,
      projectRepository,
      projectAgreementRepository,
      projectCompletionRepository,
      boqItemWriteService,
    };
  }, []);

  return (
    <CoreServicesContext.Provider value={services}>
      {children}
    </CoreServicesContext.Provider>
  );
}

/**
 * Хук для доступа к Core сервисам
 *
 * @throws Error если используется вне CoreServicesProvider
 *
 * @example
 * const { positionHierarchy, notifications } = useCoreServices();
 * const sorted = positionHierarchy.sortItemsByHierarchy(items);
 * notifications.success('Готово!');
 */
export function useCoreServices(): CoreServices {
  const context = useContext(CoreServicesContext);

  if (!context) {
    throw new Error('useCoreServices must be used within CoreServicesProvider');
  }

  return context;
}

/**
 * Хуки для отдельных сервисов (для удобства)
 */

export function useNotifications(): INotificationService {
  return useCoreServices().notifications;
}

export function useConfirmations(): IConfirmationService {
  return useCoreServices().confirmations;
}

export function useLogger(): ILoggerService {
  return useCoreServices().logger;
}

export function usePositionHierarchy(): PositionHierarchyService {
  return useCoreServices().positionHierarchy;
}

export function useMarkupCalculator(): MarkupCalculatorService {
  return useCoreServices().markupCalculator;
}

export function useMatchingService(): MatchingService {
  return useCoreServices().matching;
}

export function useBoqItemWriteService(): IBoqItemWriteService {
  return useCoreServices().boqItemWriteService;
}

// Хуки для новых репозиториев

export function useMaterialNameRepository(): IMaterialNameRepository {
  return useCoreServices().materialNameRepository;
}

export function useMaterialLibraryRepository(): IMaterialLibraryRepository {
  return useCoreServices().materialLibraryRepository;
}

export function useWorkNameRepository(): IWorkNameRepository {
  return useCoreServices().workNameRepository;
}

export function useWorkLibraryRepository(): IWorkLibraryRepository {
  return useCoreServices().workLibraryRepository;
}

export function useMarkupTacticRepository(): IMarkupTacticRepository {
  return useCoreServices().markupTacticRepository;
}

export function useProjectRepository(): IProjectRepository {
  return useCoreServices().projectRepository;
}

export function useProjectAgreementRepository(): IProjectAgreementRepository {
  return useCoreServices().projectAgreementRepository;
}

export function useProjectCompletionRepository(): IProjectCompletionRepository {
  return useCoreServices().projectCompletionRepository;
}
