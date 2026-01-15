import { calculateStringSimilarity, calculateNumericProximity } from '../../utils/similarity';
import type { ClientPosition } from '../../domain/entities';

/**
 * Структура данных для сопоставления позиций
 */
export interface PositionMatchInput {
  item_no: string;
  work_name: string;
  unit_code: string;
  volume: number | null;
}

/**
 * Детализация оценки совпадения
 */
export interface MatchScoreBreakdown {
  /** Баллы за совпадение номера раздела (0-30) */
  itemNoMatch: number;
  /** Баллы за схожесть наименования (0-50) */
  nameSimil: number;
  /** Баллы за совпадение единицы измерения (0-10) */
  unitMatch: number;
  /** Баллы за близость объема (0-10) */
  volumeProx: number;
  /** Общий балл (0-100) */
  total: number;
}

/**
 * Результат поиска совпадения
 */
export interface MatchResult<T> {
  item: T;
  score: MatchScoreBreakdown;
}

/**
 * Веса для расчета оценки совпадения
 */
export interface MatchWeights {
  itemNo: number;
  name: number;
  unit: number;
  volume: number;
}

/**
 * Сервис сопоставления позиций
 * Отвечает за поиск похожих позиций между версиями тендера
 */
export class MatchingService {
  private weights: MatchWeights;

  constructor(weights?: Partial<MatchWeights>) {
    this.weights = {
      itemNo: weights?.itemNo ?? 30,
      name: weights?.name ?? 50,
      unit: weights?.unit ?? 10,
      volume: weights?.volume ?? 10,
    };
  }

  /**
   * Вычислить комбинированную оценку совпадения двух позиций
   *
   * @param oldPos - позиция из старой версии
   * @param newPos - позиция из новой версии
   * @returns детализированная оценка с общим score
   */
  calculateMatchScore(
    oldPos: PositionMatchInput,
    newPos: PositionMatchInput
  ): MatchScoreBreakdown {
    // Нормализация строк для сравнения
    const normalizeString = (str: string | null | undefined): string => {
      return (str || '').trim().toLowerCase();
    };

    // 1. Совпадение номера раздела (item_no)
    const oldItemNo = normalizeString(oldPos.item_no);
    const newItemNo = normalizeString(newPos.item_no);
    const itemNoMatch = oldItemNo === newItemNo ? this.weights.itemNo : 0;

    // 2. Схожесть наименования работы
    const nameSimilarity = calculateStringSimilarity(
      oldPos.work_name || '',
      newPos.work_name || ''
    );
    const nameSimil = nameSimilarity * this.weights.name;

    // 3. Совпадение единицы измерения
    const oldUnitCode = normalizeString(oldPos.unit_code);
    const newUnitCode = normalizeString(newPos.unit_code);
    const unitMatch = oldUnitCode === newUnitCode ? this.weights.unit : 0;

    // 4. Близость количества
    const volumeProximity = calculateNumericProximity(
      oldPos.volume,
      newPos.volume
    );
    const volumeProx = volumeProximity * this.weights.volume;

    // Общая оценка
    const total = itemNoMatch + nameSimil + unitMatch + volumeProx;

    return {
      itemNoMatch,
      nameSimil,
      unitMatch,
      volumeProx,
      total,
    };
  }

  /**
   * Найти лучшие совпадения для позиции
   *
   * @param target - искомая позиция
   * @param candidates - кандидаты для сопоставления
   * @param minScore - минимальный порог оценки (по умолчанию 50)
   * @param maxResults - максимальное количество результатов (по умолчанию 5)
   * @returns отсортированный массив совпадений
   */
  findBestMatches<T extends PositionMatchInput>(
    target: PositionMatchInput,
    candidates: T[],
    minScore: number = 50,
    maxResults: number = 5
  ): MatchResult<T>[] {
    const results: MatchResult<T>[] = [];

    for (const candidate of candidates) {
      const score = this.calculateMatchScore(target, candidate);

      if (score.total >= minScore) {
        results.push({ item: candidate, score });
      }
    }

    // Сортируем по убыванию score
    results.sort((a, b) => b.score.total - a.score.total);

    // Ограничиваем количество результатов
    return results.slice(0, maxResults);
  }

  /**
   * Проверить, является ли score достаточным для автоматического сопоставления
   *
   * @param score - оценка совпадения
   * @param threshold - порог (по умолчанию 95)
   * @returns true если score >= threshold
   */
  isAutoMatchScore(score: MatchScoreBreakdown, threshold: number = 95): boolean {
    return score.total >= threshold;
  }

  /**
   * Форматировать оценку для отображения пользователю
   *
   * @param score - оценка совпадения
   * @returns форматированная строка
   */
  formatMatchScore(score: MatchScoreBreakdown): string {
    const breakdown =
      `раздел: ${score.itemNoMatch.toFixed(0)}, ` +
      `название: ${score.nameSimil.toFixed(1)}, ` +
      `ед.: ${score.unitMatch.toFixed(0)}, ` +
      `кол.: ${score.volumeProx.toFixed(1)}`;

    return `${score.total.toFixed(1)}% (${breakdown})`;
  }

  /**
   * Создать PositionMatchInput из ClientPosition
   */
  positionToMatchInput(position: ClientPosition): PositionMatchInput {
    return {
      item_no: position.item_no || '',
      work_name: position.work_name,
      unit_code: position.unit_code || '',
      volume: position.volume ?? null,
    };
  }
}
