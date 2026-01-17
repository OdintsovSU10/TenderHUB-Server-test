import { useState, useEffect, useRef, useCallback } from 'react';
import { message } from 'antd';
import { supabase, type HousingClassType, type ConstructionScopeType } from '../../../../lib/supabase';
import dayjs from 'dayjs';

export interface TenderRecord {
  key: string;
  id: string;
  tender: string;
  tenderNumber: string;
  deadline: string;
  daysUntilDeadline: number;
  client: string;
  estimatedCost: number;
  areaClient: number;
  areaSp: number;
  areaZakazchik: number;
  usdRate: number;
  eurRate: number;
  cnyRate: number;
  hasLinks: boolean;
  uploadFolder?: string;
  bsmLink?: string;
  tzLink?: string;
  qaFormLink?: string;
  projectFolderLink?: string;
  createdAt: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  version: string;
  housingClass?: HousingClassType;
  constructionScope?: ConstructionScopeType;
  is_archived?: boolean;
}

interface TenderOverviewRow {
  id: string;
  title: string;
  tender_number: string;
  client_name: string;
  submission_deadline: string | null;
  area_client: number | null;
  area_sp: number | null;
  usd_rate: number | null;
  eur_rate: number | null;
  cny_rate: number | null;
  upload_folder: string | null;
  bsm_link: string | null;
  tz_link: string | null;
  qa_form_link: string | null;
  project_folder_link: string | null;
  housing_class: string | null;
  construction_scope: string | null;
  is_archived: boolean | null;
  description: string | null;
  version: number | null;
  created_at: string;
  updated_at: string;
  estimated_cost: number | null;
  positions_count: number | null;
  boq_items_count: number | null;
}

export const useTendersData = () => {
  const [tendersData, setTendersData] = useState<TenderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Throttle для realtime обновлений
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRefreshRef = useRef(false);

  const fetchTenders = useCallback(async () => {
    setLoading(true);
    try {
      // Получаем все тендеры с estimated_cost через один RPC
      const { data, error } = await supabase.rpc('get_tenders_overview');

      if (error) {
        console.error('Ошибка загрузки тендеров:', error);
        message.error('Ошибка загрузки тендеров');
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        setTendersData([]);
        setLoading(false);
        return;
      }

      // Форматируем данные
      const formattedData: TenderRecord[] = (data as TenderOverviewRow[]).map((tender) => ({
        key: tender.id,
        id: tender.id,
        tender: tender.title,
        tenderNumber: tender.tender_number,
        deadline: tender.submission_deadline ? dayjs(tender.submission_deadline).format('DD.MM.YYYY') : '',
        daysUntilDeadline: tender.submission_deadline ?
          dayjs(tender.submission_deadline).diff(dayjs(), 'day') : 0,
        client: tender.client_name,
        estimatedCost: Number(tender.estimated_cost) || 0,
        areaClient: Number(tender.area_client) || 0,
        areaSp: Number(tender.area_sp) || 0,
        areaZakazchik: Number(tender.area_client) || 0,
        usdRate: Number(tender.usd_rate) || 0,
        eurRate: Number(tender.eur_rate) || 0,
        cnyRate: Number(tender.cny_rate) || 0,
        hasLinks: !!(tender.upload_folder || tender.bsm_link || tender.tz_link || tender.qa_form_link || tender.project_folder_link),
        uploadFolder: tender.upload_folder || undefined,
        bsmLink: tender.bsm_link || undefined,
        tzLink: tender.tz_link || undefined,
        qaFormLink: tender.qa_form_link || undefined,
        projectFolderLink: tender.project_folder_link || undefined,
        createdAt: dayjs(tender.created_at).format('DD.MM.YYYY'),
        description: tender.description || '',
        status: 'in_progress' as const,
        version: tender.version?.toString() || '1',
        housingClass: tender.housing_class as HousingClassType || undefined,
        constructionScope: tender.construction_scope as ConstructionScopeType || undefined,
        is_archived: tender.is_archived ?? false,
      }));

      setTendersData(formattedData);
    } catch (err) {
      console.error('Неожиданная ошибка:', err);
      message.error('Произошла неожиданная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Throttled refresh для realtime подписки
  const throttledRefresh = useCallback(() => {
    if (throttleTimerRef.current) {
      // Уже ожидаем - помечаем что нужен ещё один refresh
      pendingRefreshRef.current = true;
      return;
    }

    // Выполняем refresh
    fetchTenders();

    // Устанавливаем throttle на 3 секунды (для списка тендеров можно дольше)
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchTenders();
      }
    }, 3000);
  }, [fetchTenders]);

  useEffect(() => {
    fetchTenders();

    // Подписка на изменения в tenders таблице (не boq_items!)
    // boq_items изменения отражаются в estimated_cost при следующем fetchTenders
    const tendersSubscription = supabase
      .channel('tenders_changes_admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tenders'
        },
        () => {
          // Throttled refresh при изменениях тендеров
          throttledRefresh();
        }
      )
      .subscribe();

    // Подписка на существенные изменения markup_percentage (влияет на estimated_cost)
    const markupSubscription = supabase
      .channel('markup_changes_admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tender_markup_percentage'
        },
        () => {
          throttledRefresh();
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
      tendersSubscription.unsubscribe();
      markupSubscription.unsubscribe();
    };
  }, [fetchTenders, throttledRefresh]);

  return {
    tendersData,
    loading,
    fetchTenders,
  };
};
