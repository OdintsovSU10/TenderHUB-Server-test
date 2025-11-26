import { useState, useEffect } from 'react';
import { message } from 'antd';
import { supabase, type Tender } from '../../../../lib/supabase';
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
  createdAt: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  version: string;
}

export const useTendersData = () => {
  const [tendersData, setTendersData] = useState<TenderRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTenders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Ошибка загрузки тендеров:', error);
        message.error('Ошибка загрузки тендеров');
      } else if (data) {
        const formattedData: TenderRecord[] = await Promise.all(data.map(async (tender: Tender) => {
          const { data: positions } = await supabase
            .from('client_positions')
            .select('id')
            .eq('tender_id', tender.id);

          let totalCommercialCost = 0;

          if (positions && positions.length > 0) {
            const positionIds = positions.map(p => p.id);
            const { data: boqItems } = await supabase
              .from('boq_items')
              .select('total_commercial_material_cost, total_commercial_work_cost')
              .in('client_position_id', positionIds);

            if (boqItems) {
              totalCommercialCost = boqItems.reduce((sum, item) => {
                return sum + (item.total_commercial_material_cost || 0) + (item.total_commercial_work_cost || 0);
              }, 0);
            }
          }

          return {
            key: tender.id,
            id: tender.id,
            tender: tender.title,
            tenderNumber: tender.tender_number,
            deadline: tender.submission_deadline ? dayjs(tender.submission_deadline).format('DD.MM.YYYY') : '',
            daysUntilDeadline: tender.submission_deadline ?
              dayjs(tender.submission_deadline).diff(dayjs(), 'day') : 0,
            client: tender.client_name,
            estimatedCost: totalCommercialCost,
            areaClient: tender.area_client || 0,
            areaSp: tender.area_sp || 0,
            areaZakazchik: tender.area_client || 0,
            usdRate: tender.usd_rate || 0,
            eurRate: tender.eur_rate || 0,
            cnyRate: tender.cny_rate || 0,
            hasLinks: !!(tender.upload_folder || tender.bsm_link || tender.tz_link || tender.qa_form_link),
            uploadFolder: tender.upload_folder || undefined,
            bsmLink: tender.bsm_link || undefined,
            tzLink: tender.tz_link || undefined,
            qaFormLink: tender.qa_form_link || undefined,
            createdAt: dayjs(tender.created_at).format('DD.MM.YYYY'),
            description: tender.description || '',
            status: 'in_progress' as const,
            version: tender.version?.toString() || '1'
          };
        }));
        setTendersData(formattedData);
      }
    } catch (err) {
      console.error('Неожиданная ошибка:', err);
      message.error('Произошла неожиданная ошибка');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenders();
  }, []);

  return {
    tendersData,
    loading,
    fetchTenders,
  };
};
