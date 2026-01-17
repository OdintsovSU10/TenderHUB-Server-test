import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import { supabase, type Tender, type ClientPosition } from '../../../lib/supabase';

interface PositionStats {
  position_id: string;
  works_count: number;
  materials_count: number;
  total_sum: number;
}

export const useClientPositions = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null);
  const [clientPositions, setClientPositions] = useState<ClientPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [positionCounts, setPositionCounts] = useState<Record<string, { works: number; materials: number; total: number }>>({});
  const [totalSum, setTotalSum] = useState<number>(0);
  const [leafPositionIndices, setLeafPositionIndices] = useState<Set<string>>(new Set());

  // Throttle для realtime обновлений
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRefreshRef = useRef(false);

  // Загрузка тендеров
  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenders(data || []);
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка загрузки тендеров: ' + err.message);
    }
  };

  // Вычисление листовых позиций (конечных узлов иерархии)
  const computeLeafPositions = (positions: ClientPosition[]): Set<string> => {
    const leafIds = new Set<string>();

    positions.forEach((position, index) => {
      if (index === positions.length - 1) {
        leafIds.add(position.id);
        return;
      }

      const currentLevel = position.hierarchy_level || 0;
      let nextIndex = index + 1;

      // Пропускаем ДОП работы при определении листового узла
      while (nextIndex < positions.length && positions[nextIndex].is_additional) {
        nextIndex++;
      }

      if (nextIndex >= positions.length) {
        leafIds.add(position.id);
        return;
      }

      const nextLevel = positions[nextIndex].hierarchy_level || 0;
      if (currentLevel >= nextLevel) {
        leafIds.add(position.id);
      }
    });

    return leafIds;
  };

  // Загрузка позиций заказчика через RPC
  const fetchClientPositions = useCallback(async (tenderId: string) => {
    setLoading(true);
    try {
      // 1. Загружаем позиции (с пагинацией если нужно)
      let allPositions: ClientPosition[] = [];
      let from = 0;
      const positionsBatchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('client_positions')
          .select('*')
          .eq('tender_id', tenderId)
          .order('position_number', { ascending: true })
          .range(from, from + positionsBatchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
          allPositions = [...allPositions, ...data];
          from += positionsBatchSize;
          hasMore = data.length === positionsBatchSize;
        } else {
          hasMore = false;
        }
      }

      setClientPositions(allPositions);

      // Вычисляем листовые позиции для оптимизации рендеринга
      const leafIndices = computeLeafPositions(allPositions);
      setLeafPositionIndices(leafIndices);

      // 2. Загружаем статистику по позициям через RPC (один запрос вместо множества)
      if (allPositions.length > 0) {
        const { data: statsData, error: statsError } = await supabase
          .rpc('get_client_positions_stats', { p_tender_id: tenderId });

        if (statsError) {
          console.error('Ошибка загрузки статистики позиций:', statsError);
        } else {
          const counts: Record<string, { works: number; materials: number; total: number }> = {};
          (statsData as PositionStats[] || []).forEach((stat) => {
            counts[stat.position_id] = {
              works: stat.works_count,
              materials: stat.materials_count,
              total: Number(stat.total_sum) || 0,
            };
          });
          setPositionCounts(counts);
        }

        // 3. Загружаем общую сумму через RPC (один запрос)
        const { data: totalData, error: totalError } = await supabase
          .rpc('get_tender_total_sum', { p_tender_id: tenderId });

        if (totalError) {
          console.error('Ошибка загрузки общей суммы:', totalError);
          setTotalSum(0);
        } else {
          setTotalSum(Number(totalData) || 0);
        }
      } else {
        setPositionCounts({});
        setTotalSum(0);
      }
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка загрузки позиций: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Throttled refresh для realtime подписки
  const throttledRefresh = useCallback((tenderId: string) => {
    if (throttleTimerRef.current) {
      // Уже ожидаем - помечаем что нужен ещё один refresh
      pendingRefreshRef.current = true;
      return;
    }

    // Выполняем refresh
    fetchClientPositions(tenderId);

    // Устанавливаем throttle на 2 секунды
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchClientPositions(tenderId);
      }
    }, 2000);
  }, [fetchClientPositions]);

  // Подписка на изменения boq_items для текущего тендера
  useEffect(() => {
    if (!selectedTender?.id) return;

    const tenderId = selectedTender.id;

    // Подписываемся только на изменения для текущего тендера
    const subscription = supabase
      .channel(`boq_items_tender_${tenderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boq_items',
          filter: `tender_id=eq.${tenderId}`,
        },
        () => {
          // Throttled refresh при изменениях
          throttledRefresh(tenderId);
        }
      )
      .subscribe();

    return () => {
      // Очистка throttle таймера
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      pendingRefreshRef.current = false;
      subscription.unsubscribe();
    };
  }, [selectedTender?.id, throttledRefresh]);

  return {
    tenders,
    selectedTender,
    setSelectedTender,
    clientPositions,
    setClientPositions,
    loading,
    setLoading,
    positionCounts,
    totalSum,
    leafPositionIndices,
    fetchClientPositions,
  };
};
