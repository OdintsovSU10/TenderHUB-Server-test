/**
 * Уровни логирования
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Интерфейс сервиса логирования
 * Абстракция для записи логов (может быть console, файл, или внешний сервис)
 */
export interface ILoggerService {
  /**
   * Записать отладочное сообщение
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Записать информационное сообщение
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Записать предупреждение
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Записать ошибку
   */
  error(message: string, ...args: unknown[]): void;

  /**
   * Создать дочерний логгер с префиксом
   */
  child(prefix: string): ILoggerService;

  /**
   * Установить минимальный уровень логирования
   */
  setLevel(level: LogLevel): void;
}
