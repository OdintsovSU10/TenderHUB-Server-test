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
} from '@/core/ports';

// Адаптеры
import {
  AntdNotificationService,
  AntdConfirmationService,
  ConsoleLoggerService,
  SupabaseBoqItemRepository,
  SupabaseTenderRepository,
  SupabaseClientPositionRepository,
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
