import { useState, useCallback, useMemo } from 'react';
import { supabase } from '../../../lib/supabase';
import { SupabaseTenderRepository } from '../../../client/adapters/repositories';
import type { Tender } from '@/core/domain/entities';

const addNotification = async (
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'pending' = 'warning'
) => {
  try {
    await supabase.from('notifications').insert({
      title,
      message,
      type,
      is_read: false,
    });
  } catch (error) {
    console.error('Ошибка создания уведомления:', error);
  }
};

export const useTendersData = () => {
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(false);
  const tenderRepository = useMemo(() => new SupabaseTenderRepository(), []);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const tendersData = await tenderRepository.findAll();
      setTenders(tendersData);
    } catch (error) {
      console.error('Ошибка загрузки тендеров:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      await addNotification(
        'Ошибка загрузки списка тендеров',
        `Не удалось загрузить список тендеров: ${errorMessage}`,
        'warning'
      );
    } finally {
      setLoading(false);
    }
  }, [tenderRepository]);

  return {
    tenders,
    loading,
    loadTenders,
  };
};
