import type { BoqItemFull } from '../../domain/entities';
import { isMaterialType, isWorkType } from '../../domain/value-objects';

/**
 * Сервис управления иерархией позиций
 * Отвечает за сортировку элементов BOQ по иерархии работа-материал
 */
export class PositionHierarchyService {
  /**
   * Сортирует элементы по иерархии:
   * 1. Работы с привязанными материалами (работа, затем её материалы)
   * 2. Непривязанные элементы (работы и материалы вперемешку по sort_number)
   *
   * @param items - массив элементов BOQ
   * @returns отсортированный массив
   */
  sortItemsByHierarchy(items: BoqItemFull[]): BoqItemFull[] {
    // Разделяем на работы и материалы
    const works = items.filter(item => isWorkType(item.boq_item_type));
    const materials = items.filter(item => isMaterialType(item.boq_item_type));

    // Разделяем материалы на привязанные и непривязанные
    const linkedMaterials = materials.filter(m => m.parent_work_item_id);
    const unlinkedMaterials = materials.filter(m => !m.parent_work_item_id);

    const result: BoqItemFull[] = [];

    // ГРУППА 1: Работы с привязанными материалами
    const worksWithMaterials = works.filter(work => {
      return linkedMaterials.some(m => m.parent_work_item_id === work.id);
    });

    // Сортируем работы с материалами по sort_number
    worksWithMaterials.sort((a, b) => (a.sort_number || 0) - (b.sort_number || 0));

    // Добавляем каждую работу и её материалы
    worksWithMaterials.forEach(work => {
      result.push(work);

      const workMaterials = linkedMaterials.filter(m => m.parent_work_item_id === work.id);
      workMaterials.sort((a, b) => (a.sort_number || 0) - (b.sort_number || 0));
      result.push(...workMaterials);
    });

    // ГРУППА 2: Непривязанные элементы (работы + материалы вперемешку)
    const unlinkedWorks = works.filter(w => !worksWithMaterials.includes(w));
    const unlinkedElements = [...unlinkedWorks, ...unlinkedMaterials];

    // Сортировка: sort_number > 0 → по sort_number, иначе по created_at
    unlinkedElements.sort((a, b) => {
      const aSortNum = a.sort_number || 0;
      const bSortNum = b.sort_number || 0;

      if (aSortNum === 0 && bSortNum === 0) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (aSortNum === 0) {
        return 1;
      } else if (bSortNum === 0) {
        return -1;
      } else {
        return aSortNum - bSortNum;
      }
    });

    result.push(...unlinkedElements);

    return result;
  }

  /**
   * Получить все дочерние материалы для работы
   *
   * @param items - массив элементов BOQ
   * @param workId - ID работы
   * @returns массив привязанных материалов
   */
  getChildMaterials(items: BoqItemFull[], workId: string): BoqItemFull[] {
    return items.filter(
      item => isMaterialType(item.boq_item_type) && item.parent_work_item_id === workId
    );
  }

  /**
   * Получить родительскую работу для материала
   *
   * @param items - массив элементов BOQ
   * @param materialId - ID материала
   * @returns родительская работа или null
   */
  getParentWork(items: BoqItemFull[], materialId: string): BoqItemFull | null {
    const material = items.find(item => item.id === materialId);
    if (!material || !material.parent_work_item_id) return null;

    return items.find(item => item.id === material.parent_work_item_id) || null;
  }

  /**
   * Проверить, можно ли привязать материал к работе
   *
   * @param material - материал
   * @param work - работа
   * @returns true если можно привязать
   */
  canLinkMaterialToWork(material: BoqItemFull, work: BoqItemFull): boolean {
    // Материал должен быть типа материал
    if (!isMaterialType(material.boq_item_type)) return false;

    // Работа должна быть типа работа
    if (!isWorkType(work.boq_item_type)) return false;

    // Материал не должен быть уже привязан
    if (material.parent_work_item_id) return false;

    return true;
  }
}
