import { message } from 'antd';
import type { INotificationService } from '@/core/ports/services';

/**
 * Реализация INotificationService через Ant Design message
 */
export class AntdNotificationService implements INotificationService {
  success(text: string, description?: string): void {
    if (description) {
      message.success(`${text}: ${description}`);
    } else {
      message.success(text);
    }
  }

  error(text: string, description?: string): void {
    if (description) {
      message.error(`${text}: ${description}`);
    } else {
      message.error(text);
    }
  }

  warning(text: string, description?: string): void {
    if (description) {
      message.warning(`${text}: ${description}`);
    } else {
      message.warning(text);
    }
  }

  info(text: string, description?: string): void {
    if (description) {
      message.info(`${text}: ${description}`);
    } else {
      message.info(text);
    }
  }

  loading(text: string): () => void {
    const hide = message.loading(text, 0);
    return hide;
  }
}
