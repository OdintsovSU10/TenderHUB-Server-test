import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { useCoreServices } from '../contexts/CoreServicesContext';
import { clientPositionKeys } from './useClientPositionQueries';
import type { BoqItemCreate } from '@/core/domain/entities';

/**
 * Query keys для BOQ элементов
 */
export const boqItemKeys = {
  all: ['boqItems'] as const,
  lists: () => [...boqItemKeys.all, 'list'] as const,
  byPosition: (positionId: string) => [...boqItemKeys.lists(), 'position', positionId] as const,
  byTender: (tenderId: string) => [...boqItemKeys.lists(), 'tender', tenderId] as const,
  details: () => [...boqItemKeys.all, 'detail'] as const,
  detail: (id: string) => [...boqItemKeys.details(), id] as const,
  audit: (positionId: string) => [...boqItemKeys.all, 'audit', positionId] as const,
};

/**
 * Хук для создания BOQ элемента с audit
 */
export function useCreateBoqItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async (data: BoqItemCreate) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.create(data);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка создания элемента');
      }
      return result.item!;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(variables.client_position_id) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(variables.client_position_id) });
    },
  });
}

/**
 * Хук для пакетного создания BOQ элементов с audit
 */
export function useCreateManyBoqItems() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async (items: BoqItemCreate[]) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.createMany(items);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка создания элементов');
      }
      return result;
    },
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        const positionId = variables[0].client_position_id;
        queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(positionId) });
        queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(positionId) });
      }
    },
  });
}

/**
 * Хук для обновления BOQ элемента с audit
 */
export function useUpdateBoqItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async ({
      id,
      positionId,
      data,
    }: {
      id: string;
      positionId: string;
      data: Partial<BoqItemCreate>;
    }) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.update(id, data);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления элемента');
      }
      return { item: result.item!, positionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(result.positionId) });
      queryClient.invalidateQueries({ queryKey: boqItemKeys.detail(result.item.id) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(result.positionId) });
    },
  });
}

/**
 * Хук для пакетного обновления BOQ элементов с audit
 */
export function useUpdateManyBoqItems() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async ({
      items,
      positionId,
    }: {
      items: { id: string; data: Partial<BoqItemCreate> }[];
      positionId: string;
    }) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.updateMany(items);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления элементов');
      }
      return { items: result.items!, positionId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(result.positionId) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(result.positionId) });
    },
  });
}

/**
 * Хук для удаления BOQ элемента с audit
 */
export function useDeleteBoqItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async ({ id, positionId }: { id: string; positionId: string }) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.delete(id);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка удаления элемента');
      }
      return { id, positionId };
    },
    onSuccess: (_, { positionId }) => {
      queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(positionId) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(positionId) });
    },
  });
}

/**
 * Хук для rollback BOQ элемента из audit истории
 */
export function useRollbackBoqItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { boqItemWriteService } = useCoreServices();

  return useMutation({
    mutationFn: async ({
      boqItemId,
      positionId,
      oldData,
    }: {
      boqItemId: string;
      positionId: string;
      oldData: Partial<BoqItemCreate>;
    }) => {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.rollback(boqItemId, oldData);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка восстановления элемента');
      }
      return { item: result.item!, positionId };
    },
    onSuccess: (_, { positionId }) => {
      queryClient.invalidateQueries({ queryKey: boqItemKeys.byPosition(positionId) });
      queryClient.invalidateQueries({ queryKey: boqItemKeys.audit(positionId) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(positionId) });
    },
  });
}

// ============= Utility Types =============

export type CreateBoqItemMutation = ReturnType<typeof useCreateBoqItem>;
export type CreateManyBoqItemsMutation = ReturnType<typeof useCreateManyBoqItems>;
export type UpdateBoqItemMutation = ReturnType<typeof useUpdateBoqItem>;
export type DeleteBoqItemMutation = ReturnType<typeof useDeleteBoqItem>;
export type RollbackBoqItemMutation = ReturnType<typeof useRollbackBoqItem>;
