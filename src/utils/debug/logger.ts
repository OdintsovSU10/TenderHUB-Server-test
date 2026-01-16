/**
 * Утилита логирования для development режима
 *
 * Использование:
 * - logger.debug() - только в development
 * - logger.info() - только в development
 * - logger.warn() - всегда (включая production)
 * - logger.error() - всегда (включая production)
 */

export const logger = {
  /**
   * Debug логи - только в development режиме
   * Используется для детальной отладки и трассировки
   */
  debug: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Info логи - только в development режиме
   * Используется для общей информации о ходе выполнения
   */
  info: (message: string, ...args: unknown[]): void => {
    if (import.meta.env.DEV) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  /**
   * Warning логи - всегда активны
   * Используется для предупреждений о потенциальных проблемах
   */
  warn: (message: string, ...args: unknown[]): void => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Error логи - всегда активны
   * Используется для критических ошибок
   */
  error: (message: string, ...args: unknown[]): void => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Группировка логов - только в development
   */
  group: (label: string): void => {
    if (import.meta.env.DEV) {
      console.group(label);
    }
  },

  groupEnd: (): void => {
    if (import.meta.env.DEV) {
      console.groupEnd();
    }
  },

  /**
   * Таблица данных - только в development
   */
  table: (data: unknown): void => {
    if (import.meta.env.DEV) {
      console.table(data);
    }
  },
};
