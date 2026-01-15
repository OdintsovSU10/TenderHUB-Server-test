/**
 * Опции для диалога подтверждения
 */
export interface ConfirmationOptions {
  title: string;
  content?: string;
  okText?: string;
  cancelText?: string;
  danger?: boolean;
}

/**
 * Интерфейс сервиса подтверждения действий
 * Абстракция для запроса подтверждения от пользователя
 */
export interface IConfirmationService {
  /**
   * Запросить подтверждение действия
   * @returns Promise<boolean> - true если пользователь подтвердил
   */
  confirm(options: ConfirmationOptions): Promise<boolean>;

  /**
   * Запросить подтверждение удаления
   * @param itemName - название удаляемого элемента
   */
  confirmDelete(itemName: string): Promise<boolean>;

  /**
   * Запросить подтверждение потенциально опасного действия
   */
  confirmDanger(options: ConfirmationOptions): Promise<boolean>;
}
