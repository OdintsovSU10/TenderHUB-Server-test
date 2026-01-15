/**
 * Интерфейс сервиса уведомлений
 * Абстракция для отображения уведомлений пользователю
 */
export interface INotificationService {
  /**
   * Показать уведомление об успехе
   */
  success(message: string, description?: string): void;

  /**
   * Показать уведомление об ошибке
   */
  error(message: string, description?: string): void;

  /**
   * Показать предупреждение
   */
  warning(message: string, description?: string): void;

  /**
   * Показать информационное уведомление
   */
  info(message: string, description?: string): void;

  /**
   * Показать уведомление о загрузке
   * @returns функция для закрытия уведомления
   */
  loading(message: string): () => void;
}
