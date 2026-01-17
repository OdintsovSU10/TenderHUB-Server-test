import { message } from 'antd';
import { useRollbackBoqItem } from '../../../client/hooks/useBoqItemMutations';
import type { BoqItemAudit } from '../../../types/audit';

interface UseAuditRollbackReturn {
  rollback: (record: BoqItemAudit) => Promise<void>;
  rolling: boolean;
}

/**
 * Хук для восстановления BOQ item к предыдущей версии из audit log
 *
 * @param positionId - ID позиции для инвалидации запросов
 * @returns Функция rollback и состояние загрузки
 */
export function useAuditRollback(positionId: string): UseAuditRollbackReturn {
  const rollbackMutation = useRollbackBoqItem();

  const rollback = async (record: BoqItemAudit) => {
    // Проверка возможности rollback
    if (!record.old_data) {
      message.error('Невозможно восстановить: нет данных предыдущей версии');
      return;
    }

    if (record.operation_type === 'DELETE') {
      message.error('Невозможно восстановить удаленный элемент');
      return;
    }

    try {
      await rollbackMutation.mutateAsync({
        boqItemId: record.boq_item_id,
        positionId,
        oldData: record.old_data,
      });

      message.success('Версия успешно восстановлена');
      // TanStack Query автоматически инвалидирует запросы - перезагрузка не нужна
    } catch (err) {
      console.error('[useAuditRollback] Ошибка восстановления:', err);

      const errorMessage =
        err instanceof Error ? err.message : 'Неизвестная ошибка восстановления';

      message.error(`Ошибка восстановления: ${errorMessage}`);
    }
  };

  return {
    rollback,
    rolling: rollbackMutation.isPending,
  };
}
