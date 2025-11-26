import { useState, useEffect } from 'react';
import { message } from 'antd';
import { supabase } from '../../../lib/supabase';
import type { TemplateItem } from '../../../lib/supabase';

export interface TemplateItemWithDetails extends TemplateItem {
  work_name?: string;
  work_unit?: string;
  work_item_type?: string;
  work_unit_rate?: number;
  work_currency_type?: string;
  material_name?: string;
  material_unit?: string;
  material_item_type?: string;
  material_type?: string;
  material_consumption_coefficient?: number;
  material_unit_rate?: number;
  material_currency_type?: string;
  material_delivery_price_type?: string;
  material_delivery_amount?: number;
  parent_work_name?: string;
  detail_cost_category_name?: string;
  detail_cost_category_full?: string;
  manual_cost_override?: boolean;
}

export const useTemplateItems = () => {
  const [loadedTemplateItems, setLoadedTemplateItems] = useState<Record<string, TemplateItemWithDetails[]>>({});

  const fetchAllTemplateItems = async () => {
    try {
      const { data, error } = await supabase
        .from('template_items')
        .select(`
          *,
          works_library:work_library_id(*, work_names(name, unit)),
          materials_library:material_library_id(*, material_names(name, unit)),
          detail_cost_categories:detail_cost_category_id(name, location, cost_categories(name))
        `)
        .order('position');

      if (error) throw error;

      const itemsByTemplate: Record<string, TemplateItemWithDetails[]> = {};

      (data || []).forEach((item: any) => {
        if (!itemsByTemplate[item.template_id]) {
          itemsByTemplate[item.template_id] = [];
        }

        let parentWorkName = undefined;
        if (item.parent_work_item_id) {
          const parentWork = (data || []).find((i: any) => i.id === item.parent_work_item_id);
          parentWorkName = parentWork?.works_library?.work_names?.name;
        }

        let detailCostCategoryFull = undefined;
        if (item.detail_cost_categories) {
          const categoryName = item.detail_cost_categories.cost_categories?.name || '';
          const detailName = item.detail_cost_categories.name || '';
          const location = item.detail_cost_categories.location || '';
          detailCostCategoryFull = `${categoryName} / ${detailName} / ${location}`;
        }

        const formatted: TemplateItemWithDetails = {
          ...item,
          work_name: item.works_library?.work_names?.name,
          work_unit: item.works_library?.work_names?.unit,
          work_item_type: item.works_library?.item_type,
          work_unit_rate: item.works_library?.unit_rate,
          work_currency_type: item.works_library?.currency_type,
          material_name: item.materials_library?.material_names?.name,
          material_unit: item.materials_library?.material_names?.unit,
          material_item_type: item.materials_library?.item_type,
          material_type: item.materials_library?.material_type,
          material_consumption_coefficient: item.materials_library?.consumption_coefficient,
          material_unit_rate: item.materials_library?.unit_rate,
          material_currency_type: item.materials_library?.currency_type,
          material_delivery_price_type: item.materials_library?.delivery_price_type,
          material_delivery_amount: item.materials_library?.delivery_amount,
          parent_work_name: parentWorkName,
          detail_cost_category_name: item.detail_cost_categories?.name,
          detail_cost_category_full: detailCostCategoryFull,
        };

        itemsByTemplate[item.template_id].push(formatted);
      });

      setLoadedTemplateItems(itemsByTemplate);
    } catch (error: any) {
      message.error('Ошибка загрузки элементов шаблонов: ' + error.message);
    }
  };

  const handleDeleteTemplateItem = async (templateId: string, itemId: string) => {
    try {
      const currentItems = loadedTemplateItems[templateId] || [];
      const itemToDelete = currentItems.find(item => item.id === itemId);

      if (itemToDelete?.kind === 'work') {
        const linkedMaterials = currentItems.filter(
          item => item.kind === 'material' && item.parent_work_item_id === itemId
        );

        for (const material of linkedMaterials) {
          const { error: updateError } = await supabase
            .from('template_items')
            .update({
              parent_work_item_id: null,
              conversation_coeff: null,
            })
            .eq('id', material.id);

          if (updateError) throw updateError;
        }
      }

      const { error } = await supabase
        .from('template_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      message.success('Элемент удален');

      setLoadedTemplateItems(prev => {
        const items = prev[templateId] || [];
        const updatedItems = items
          .filter(item => item.id !== itemId)
          .map(item => {
            if (item.kind === 'material' && item.parent_work_item_id === itemId) {
              return {
                ...item,
                parent_work_item_id: null,
                conversation_coeff: null,
              };
            }
            return item;
          });

        return {
          ...prev,
          [templateId]: updatedItems,
        };
      });
    } catch (error: any) {
      message.error('Ошибка удаления элемента: ' + error.message);
    }
  };

  useEffect(() => {
    fetchAllTemplateItems();
  }, []);

  return {
    loadedTemplateItems,
    setLoadedTemplateItems,
    fetchAllTemplateItems,
    handleDeleteTemplateItem,
  };
};
