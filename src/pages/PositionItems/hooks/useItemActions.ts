import { message } from 'antd';
import {
  supabase,
  type ClientPosition,
  type BoqItemType,
  type MaterialType,
  type CurrencyType,
  type DeliveryPriceType,
  type WorkLibraryFull,
  type MaterialLibraryFull,
  type BoqItemFull,
} from '../../../lib/supabase';
import { insertTemplateItems } from '../../../utils/insertTemplateItems';
import { useAuth } from '../../../contexts/AuthContext';
import { useBoqItemWriteService } from '../../../client/contexts/CoreServicesContext';
import type { BoqItemCreate } from '@/core/domain/entities';

interface UseItemActionsProps {
  position: ClientPosition | null;
  works: WorkLibraryFull[];
  materials: MaterialLibraryFull[];
  items: BoqItemFull[];
  getCurrencyRate: (currency: CurrencyType) => number;
  fetchItems: () => Promise<void>;
}

export const useItemActions = ({
  position,
  works,
  materials,
  items,
  getCurrencyRate,
  fetchItems,
}: UseItemActionsProps) => {
  const { user } = useAuth();
  const boqItemWriteService = useBoqItemWriteService();

  /**
   * Пересчитать итоги позиции (total_material, total_works) через RPC
   */
  const recalcPositionTotals = async (positionId: string) => {
    try {
      const result = await boqItemWriteService.recalcPositionTotals(positionId);
      if (!result.success) {
        console.error('Ошибка обновления итогов позиции:', result.error);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка обновления итогов позиции:', err.message);
    }
  };

  const handleAddWork = async (workNameId: string) => {
    if (!workNameId || !position) {
      message.error('Выберите работу');
      return;
    }

    try {
      const workLib = works.find(w => w.work_name_id === workNameId);
      if (!workLib) throw new Error('Работа не найдена в библиотеке');

      const maxSort = Math.max(...items.map(i => i.sort_number || 0), 0);

      const quantity = 1;
      const unitRate = workLib.unit_rate || 0;
      const rate = getCurrencyRate(workLib.currency_type as CurrencyType);
      const totalAmount = quantity * unitRate * rate;

      const newItem: BoqItemCreate = {
        tender_id: position.tender_id,
        client_position_id: position.id,
        sort_number: maxSort + 1,
        boq_item_type: workLib.item_type as BoqItemType,
        work_name_id: workLib.work_name_id,
        unit_code: workLib.unit,
        quantity: quantity,
        unit_rate: unitRate,
        currency_type: workLib.currency_type as CurrencyType,
        total_amount: totalAmount,
      };

      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.create(newItem);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка создания элемента');
      }

      message.success('Работа добавлена');
      await fetchItems();
      await recalcPositionTotals(position.id);
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка добавления работы: ' + err.message);
    }
  };

  const handleAddMaterial = async (materialNameId: string) => {
    if (!materialNameId || !position) {
      message.error('Выберите материал');
      return;
    }

    try {
      const matLib = materials.find(m => m.material_name_id === materialNameId);
      if (!matLib) throw new Error('Материал не найден в библиотеке');

      const maxSort = Math.max(...items.map(i => i.sort_number || 0), 0);

      // Для непривязанных материалов используем количество ГП из позиции
      const gpVolume = position.manual_volume || 0;
      // base_quantity должно быть > 0 из-за CHECK constraint
      const baseQuantity = gpVolume > 0 ? gpVolume : 1;
      const consumptionCoeff = matLib.consumption_coefficient || 1;
      // Quantity теперь представляет базовое количество (без коэффициента расхода)
      const quantity = baseQuantity;
      const unitRate = matLib.unit_rate || 0;
      const rate = getCurrencyRate(matLib.currency_type as CurrencyType);

      let deliveryPrice = 0;
      if (matLib.delivery_price_type === 'не в цене') {
        deliveryPrice = Math.round(unitRate * rate * 0.03 * 100) / 100;
      } else if (matLib.delivery_price_type === 'суммой' && matLib.delivery_amount) {
        deliveryPrice = matLib.delivery_amount;
      }

      // Для непривязанных материалов применяем коэффициент расхода к итоговой сумме
      const totalAmount = quantity * consumptionCoeff * (unitRate * rate + deliveryPrice);

      const newItem: BoqItemCreate = {
        tender_id: position.tender_id,
        client_position_id: position.id,
        sort_number: maxSort + 1,
        boq_item_type: matLib.item_type as BoqItemType,
        material_type: matLib.material_type as MaterialType,
        material_name_id: matLib.material_name_id,
        unit_code: matLib.unit,
        quantity: quantity,
        base_quantity: baseQuantity,
        unit_rate: unitRate,
        consumption_coefficient: matLib.consumption_coefficient,
        currency_type: matLib.currency_type as CurrencyType,
        delivery_price_type: matLib.delivery_price_type as DeliveryPriceType,
        delivery_amount: matLib.delivery_amount,
        total_amount: totalAmount,
      };

      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.create(newItem);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка создания элемента');
      }

      message.success('Материал добавлен');
      await fetchItems();
      await recalcPositionTotals(position.id);
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка добавления материала: ' + err.message);
    }
  };

  const handleAddTemplate = async (templateId: string, setLoading: (loading: boolean) => void) => {
    if (!templateId || !position) {
      message.error('Выберите шаблон');
      return;
    }

    if (!user?.id) {
      message.error('Пользователь не авторизован');
      return;
    }

    try {
      setLoading(true);
      const result = await insertTemplateItems(
        templateId,
        position.id,
        boqItemWriteService,
        user.id
      );

      message.success(
        `Вставлено из шаблона: ${result.worksCount} работ, ${result.materialsCount} материалов`
      );
      await fetchItems();
      await recalcPositionTotals(position.id);
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка вставки шаблона: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }
      const result = await boqItemWriteService.delete(id);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка удаления элемента');
      }

      message.success('Элемент удален');
      await fetchItems();
      if (position) {
        await recalcPositionTotals(position.id);
      }
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка удаления: ' + err.message);
    }
  };

  /**
   * Пересчитать количество и сумму привязанных материалов через RPC
   * Выполняется на сервере без JS циклов
   */
  const recalcLinkedMaterials = async (workId: string) => {
    try {
      const result = await boqItemWriteService.recalcLinkedMaterials(workId);
      if (!result.success) {
        console.error('Ошибка обновления материалов:', result.error);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Ошибка обновления количества материалов:', err.message);
    }
  };

  const handleFormSave = async (
    data: Partial<BoqItemCreate>,
    expandedRowKeys: string[],
    items: BoqItemFull[],
    onSuccess: () => void,
    onConflict?: () => void
  ) => {
    try {
      const recordId = expandedRowKeys[0];
      if (!recordId) return;

      // Получаем текущую версию записи для optimistic concurrency
      const currentItem = items.find(item => item.id === recordId);
      const expectedVersion = currentItem?.row_version;

      if (user?.id) {
        boqItemWriteService.setUser(user.id);
      }

      const result = await boqItemWriteService.update(recordId, data, expectedVersion);

      // Обработка конфликта версий
      if (result.conflict) {
        if (onConflict) {
          onConflict();
        } else {
          message.error('Запись была изменена другим пользователем');
        }
        return;
      }

      if (!result.success) {
        throw new Error(result.error || 'Ошибка обновления элемента');
      }

      const updatedItem = items.find(item => item.id === recordId);
      if (updatedItem && ['раб', 'суб-раб', 'раб-комп.'].includes(updatedItem.boq_item_type)) {
        await recalcLinkedMaterials(recordId);
      }

      message.success('Изменения сохранены');
      await fetchItems();
      if (position) {
        await recalcPositionTotals(position.id);
      }
      onSuccess();
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка сохранения: ' + err.message);
    }
  };

  const handleSaveGPData = async (
    positionId: string,
    gpVolume: number,
    gpNote: string,
    onSuccess: () => void
  ) => {
    try {
      const { error } = await supabase
        .from('client_positions')
        .update({
          manual_volume: gpVolume,
          manual_note: gpNote,
        })
        .eq('id', positionId);

      if (error) throw error;
      onSuccess();
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка сохранения данных ГП: ' + err.message);
    }
  };

  const handleSaveAdditionalWorkData = async (
    positionId: string,
    workName: string,
    unitCode: string,
    onSuccess: () => void
  ) => {
    try {
      const { error } = await supabase
        .from('client_positions')
        .update({
          work_name: workName,
          unit_code: unitCode,
        })
        .eq('id', positionId);

      if (error) throw error;
      onSuccess();
      message.success('Данные дополнительной работы сохранены');
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка сохранения данных: ' + err.message);
    }
  };

  const getItemGroupBounds = (
    item: BoqItemFull,
    items: BoqItemFull[]
  ): { start: number; end: number } => {
    // Привязанный материал - границы блока работы
    if (item.parent_work_item_id) {
      const workIndex = items.findIndex(i => i.id === item.parent_work_item_id);
      let endIndex = workIndex;

      for (let i = workIndex + 1; i < items.length; i++) {
        if (items[i].parent_work_item_id === item.parent_work_item_id) {
          endIndex = i;
        } else {
          break;
        }
      }

      return { start: workIndex + 1, end: endIndex };
    }

    // Работа с материалами - перемещается среди других работ с материалами (Группа 1)
    const isWork = ['раб', 'суб-раб', 'раб-комп.'].includes(item.boq_item_type);
    const hasMaterials = items.some(m => m.parent_work_item_id === item.id);

    if (isWork && hasMaterials) {
      // Найти первую и последнюю работу с материалами (включая их материалы)
      let start = 0;
      let end = items.length - 1;

      for (let i = 0; i < items.length; i++) {
        const isWorkWithMats = ['раб', 'суб-раб', 'раб-комп.'].includes(items[i].boq_item_type) &&
          items.some(m => m.parent_work_item_id === items[i].id);
        if (isWorkWithMats) {
          start = i;
          break;
        }
      }

      // Найти последний привязанный материал
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].parent_work_item_id) {
          end = i;
          break;
        }
      }

      return { start, end };
    }

    // Непривязанный элемент (работа или материал) - Группа 2
    // Все непривязанные элементы идут после Группы 1
    let start = 0;
    for (let i = 0; i < items.length; i++) {
      const isUnlinked = !items[i].parent_work_item_id &&
        !items.some(m => m.parent_work_item_id === items[i].id);
      if (isUnlinked) {
        start = i;
        break;
      }
    }

    return { start, end: items.length - 1 };
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    try {
      const currentIndex = items.findIndex(i => i.id === itemId);
      const item = items[currentIndex];
      const bounds = getItemGroupBounds(item, items);

      // Проверка возможности перемещения
      if (direction === 'up' && currentIndex <= bounds.start) {
        message.warning('Невозможно переместить элемент выше');
        return;
      }

      if (direction === 'down' && currentIndex >= bounds.end) {
        message.warning('Невозможно переместить элемент ниже');
        return;
      }

      // Swap с соседним элементом через один RPC вызов
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetItem = items[targetIndex];

      // Атомарно меняем sort_number на сервере
      const result = await boqItemWriteService.swapSortNumbers(item.id, targetItem.id);
      if (!result.success) {
        throw new Error(result.error || 'Ошибка перемещения');
      }

      await fetchItems();
      message.success('Элемент перемещен');
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка перемещения: ' + err.message);
    }
  };

  return {
    handleAddWork,
    handleAddMaterial,
    handleAddTemplate,
    handleDelete,
    handleFormSave,
    handleSaveGPData,
    handleSaveAdditionalWorkData,
    handleMoveItem,
  };
};
