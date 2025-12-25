import { useState, useEffect } from 'react';
import { message } from 'antd';
import { supabase, type Tender, type HousingClassType, type ConstructionScopeType } from '../../../../lib/supabase';
import dayjs from 'dayjs';
import { calculateGrandTotal } from '../../../../utils/calculateGrandTotal';

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

export const useTendersData = () => {
  const [tendersData, setTendersData] = useState<TenderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      // Получаем все тендеры
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

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

      // Рассчитываем grandTotal для каждого тендера (параллельно)
      const tenderIds = data.map(t => t.id);
      const grandTotalPromises = tenderIds.map(tenderId => calculateGrandTotal({ tenderId }));
      const grandTotals = await Promise.all(grandTotalPromises);

      const commercialCostsByTender: Record<string, number> = {};
      tenderIds.forEach((tenderId, index) => {
        commercialCostsByTender[tenderId] = grandTotals[index];
      });

      // Форматируем данные
      const formattedData: TenderRecord[] = data.map((tender: Tender) => ({
        ...tender,
        key: tender.id,
        id: tender.id,
        tender: tender.title,
        tenderNumber: tender.tender_number,
        deadline: tender.submission_deadline ? dayjs(tender.submission_deadline).format('DD.MM.YYYY') : '',
        daysUntilDeadline: tender.submission_deadline ?
          dayjs(tender.submission_deadline).diff(dayjs(), 'day') : 0,
        client: tender.client_name,
        estimatedCost: commercialCostsByTender[tender.id] || 0,
        areaClient: tender.area_client || 0,
        areaSp: tender.area_sp || 0,
        areaZakazchik: tender.area_client || 0,
        usdRate: tender.usd_rate || 0,
        eurRate: tender.eur_rate || 0,
        cnyRate: tender.cny_rate || 0,
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
        housingClass: tender.housing_class || undefined,
        constructionScope: tender.construction_scope || undefined
      }));

      setTendersData(formattedData);
    } catch (err) {
      console.error('Неожиданная ошибка:', err);
      message.error('Произошла неожиданная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();

    // Подписка на изменения в boq_items для автообновления итоговых сумм
    const boqSubscription = supabase
      .channel('boq_items_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'boq_items'
        },
        () => {
          // Перезагружаем данные при любом изменении в boq_items
          fetchTenders();
        }
      )
      .subscribe();

    return () => {
      boqSubscription.unsubscribe();
    };
  }, []);

  return {
    tendersData,
    loading,
    fetchTenders,
  };
};
