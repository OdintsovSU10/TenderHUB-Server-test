import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseClientPositionRepository } from '../adapters/repositories/SupabaseClientPositionRepository';
import type { ClientPosition, ClientPositionCreate, ClientPositionUpdate } from '@/core/domain/entities';

// Singleton repository instance
const clientPositionRepository = new SupabaseClientPositionRepository();

// Query keys factory
export const clientPositionKeys = {
  all: ['clientPositions'] as const,
  lists: () => [...clientPositionKeys.all, 'list'] as const,
  byTender: (tenderId: string) => [...clientPositionKeys.lists(), 'tender', tenderId] as const,
  details: () => [...clientPositionKeys.all, 'detail'] as const,
  detail: (id: string) => [...clientPositionKeys.details(), id] as const,
  children: (parentId: string) => [...clientPositionKeys.all, 'children', parentId] as const,
  root: (tenderId: string) => [...clientPositionKeys.all, 'root', tenderId] as const,
};

// ============= Queries =============

/**
 * Получить позиции по ID тендера
 */
export function useClientPositions(tenderId: string | null | undefined) {
  return useQuery({
    queryKey: clientPositionKeys.byTender(tenderId!),
    queryFn: () => clientPositionRepository.findByTenderId(tenderId!),
    enabled: !!tenderId,
  });
}

/**
 * Получить позицию по ID
 */
export function useClientPosition(id: string | null | undefined) {
  return useQuery({
    queryKey: clientPositionKeys.detail(id!),
    queryFn: () => clientPositionRepository.findById(id!),
    enabled: !!id,
  });
}

/**
 * Получить дочерние позиции
 */
export function useChildPositions(parentPositionId: string | null | undefined) {
  return useQuery({
    queryKey: clientPositionKeys.children(parentPositionId!),
    queryFn: () => clientPositionRepository.findChildren(parentPositionId!),
    enabled: !!parentPositionId,
  });
}

/**
 * Получить корневые позиции тендера (без родителя)
 */
export function useRootPositions(tenderId: string | null | undefined) {
  return useQuery({
    queryKey: clientPositionKeys.root(tenderId!),
    queryFn: () => clientPositionRepository.findRootPositions(tenderId!),
    enabled: !!tenderId,
  });
}

// ============= Mutations =============

/**
 * Создать новую позицию
 */
export function useCreateClientPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientPositionCreate) => clientPositionRepository.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(variables.tender_id) });
    },
  });
}

/**
 * Создать несколько позиций
 */
export function useCreateManyClientPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (items: ClientPositionCreate[]) => clientPositionRepository.createMany(items),
    onSuccess: (_, variables) => {
      if (variables.length > 0) {
        queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(variables[0].tender_id) });
      }
    },
  });
}

/**
 * Обновить позицию
 */
export function useUpdateClientPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ClientPositionUpdate }) =>
      clientPositionRepository.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(result.id) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(result.tender_id) });
    },
  });
}

/**
 * Удалить позицию
 */
export function useDeleteClientPosition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, tenderId }: { id: string; tenderId: string }) => {
      await clientPositionRepository.delete(id);
      return { id, tenderId };
    },
    onSuccess: (_, { tenderId }) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(tenderId) });
    },
  });
}

/**
 * Удалить все позиции тендера
 */
export function useDeleteAllClientPositions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tenderId: string) => clientPositionRepository.deleteByTenderId(tenderId),
    onSuccess: (_, tenderId) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(tenderId) });
    },
  });
}

/**
 * Обновить итоговые суммы позиции
 */
export function useUpdateClientPositionTotals() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      tenderId,
      totals,
    }: {
      id: string;
      tenderId: string;
      totals: {
        total_material?: number;
        total_works?: number;
        material_cost_per_unit?: number;
        work_cost_per_unit?: number;
        total_commercial_material?: number;
        total_commercial_work?: number;
        total_commercial_material_per_unit?: number;
        total_commercial_work_per_unit?: number;
      };
    }) => clientPositionRepository.updateTotals(id, totals),
    onSuccess: (_, { id, tenderId }) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(tenderId) });
    },
  });
}

/**
 * Обновить порядок позиций
 */
export function useUpdatePositionNumbers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ items, tenderId }: { items: { id: string; position_number: number }[]; tenderId: string }) =>
      clientPositionRepository.updatePositionNumbers(items),
    onSuccess: (_, { tenderId }) => {
      queryClient.invalidateQueries({ queryKey: clientPositionKeys.byTender(tenderId) });
    },
  });
}

// ============= Utility Types =============

export type ClientPositionsResult = ReturnType<typeof useClientPositions>;
export type ClientPositionDetailResult = ReturnType<typeof useClientPosition>;
export type CreateClientPositionMutation = ReturnType<typeof useCreateClientPosition>;
export type UpdateClientPositionMutation = ReturnType<typeof useUpdateClientPosition>;
