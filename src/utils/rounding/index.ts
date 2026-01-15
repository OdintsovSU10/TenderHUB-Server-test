/**
 * Утилиты умного округления
 *
 * Предоставляет общие функции для округления цен до кратных 5 рублям
 * с компенсацией ошибки округления.
 */

export { smartRound } from './smartRounding';
export { roundTo5 } from './roundTo5';
export { compensateError } from './compensateError';
export type {
  RoundableItem,
  RoundedResult,
  RoundingOptions,
  RoundingTrackingItem,
} from './types';
