import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseTenderRepository } from '../adapters/repositories/SupabaseTenderRepository';
import type { Tender, TenderCreate, TenderUpdate } from '@/core/domain/entities';

// Singleton repository instance
const tenderRepository = new SupabaseTenderRepository();

// Query keys factory
export const tenderKeys = {
  all: ['tenders'] as const,
  lists: () => [...tenderKeys.all, 'list'] as const,
  list: (filters?: { archived?: boolean }) => [...tenderKeys.lists(), filters] as const,
  details: () => [...tenderKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenderKeys.details(), id] as const,
  active: () => [...tenderKeys.all, 'active'] as const,
  archived: () => [...tenderKeys.all, 'archived'] as const,
  byNumber: (number: string) => [...tenderKeys.all, 'byNumber', number] as const,
  byClient: (client: string) => [...tenderKeys.all, 'byClient', client] as const,
};

// ============= Queries =============

/**
 * Получить все тендеры
 */
export function useTenders() {
  return useQuery({
    queryKey: tenderKeys.lists(),
    queryFn: () => tenderRepository.findAll(),
  });
}

/**
 * Получить тендер по ID
 */
export function useTender(id: string | null | undefined) {
  return useQuery({
    queryKey: tenderKeys.detail(id!),
    queryFn: () => tenderRepository.findById(id!),
    enabled: !!id,
  });
}

/**
 * Получить активные тендеры (не архивные)
 */
export function useActiveTenders() {
  return useQuery({
    queryKey: tenderKeys.active(),
    queryFn: () => tenderRepository.findActive(),
  });
}

/**
 * Получить архивные тендеры
 */
export function useArchivedTenders() {
  return useQuery({
    queryKey: tenderKeys.archived(),
    queryFn: () => tenderRepository.findArchived(),
  });
}

/**
 * Поиск тендеров по номеру
 */
export function useTendersByNumber(tenderNumber: string) {
  return useQuery({
    queryKey: tenderKeys.byNumber(tenderNumber),
    queryFn: () => tenderRepository.findByNumber(tenderNumber),
    enabled: !!tenderNumber,
  });
}

/**
 * Поиск тендеров по клиенту
 */
export function useTendersByClient(clientName: string) {
  return useQuery({
    queryKey: tenderKeys.byClient(clientName),
    queryFn: () => tenderRepository.findByClient(clientName),
    enabled: !!clientName,
  });
}

// ============= Mutations =============

/**
 * Создать новый тендер
 */
export function useCreateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TenderCreate) => tenderRepository.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenderKeys.all });
    },
  });
}

/**
 * Обновить тендер
 */
export function useUpdateTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TenderUpdate }) =>
      tenderRepository.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: tenderKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenderKeys.lists() });
    },
  });
}

/**
 * Удалить тендер
 */
export function useDeleteTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenderRepository.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenderKeys.all });
    },
  });
}

/**
 * Архивировать тендер
 */
export function useArchiveTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenderRepository.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenderKeys.all });
    },
  });
}

/**
 * Восстановить тендер из архива
 */
export function useUnarchiveTender() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tenderRepository.unarchive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenderKeys.all });
    },
  });
}

// ============= Utility Types =============

export type TenderQueryResult = ReturnType<typeof useTenders>;
export type TenderDetailResult = ReturnType<typeof useTender>;
export type CreateTenderMutation = ReturnType<typeof useCreateTender>;
export type UpdateTenderMutation = ReturnType<typeof useUpdateTender>;
export type DeleteTenderMutation = ReturnType<typeof useDeleteTender>;
