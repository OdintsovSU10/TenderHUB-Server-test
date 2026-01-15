import { Modal } from 'antd';
import type { IConfirmationService, ConfirmationOptions } from '@/core/ports/services';

/**
 * Реализация IConfirmationService через Ant Design Modal.confirm
 */
export class AntdConfirmationService implements IConfirmationService {
  confirm(options: ConfirmationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      Modal.confirm({
        title: options.title,
        content: options.content,
        okText: options.okText || 'Да',
        cancelText: options.cancelText || 'Отмена',
        okButtonProps: options.danger ? { danger: true } : undefined,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  confirmDelete(itemName: string): Promise<boolean> {
    return this.confirm({
      title: 'Подтвердите удаление',
      content: `Вы уверены, что хотите удалить "${itemName}"? Это действие нельзя отменить.`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      danger: true,
    });
  }

  confirmDanger(options: ConfirmationOptions): Promise<boolean> {
    return this.confirm({
      ...options,
      danger: true,
    });
  }
}
