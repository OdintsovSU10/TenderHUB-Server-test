/**
 * Округляет число до ближайшего кратного 5
 *
 * @param value - Число для округления
 * @param minimumValue - Минимальное значение (по умолчанию 2.5)
 * @returns Округленное число
 */
export function roundTo5(value: number, minimumValue: number = 2.5): number {
  if (value < minimumValue) return 0;
  return Math.round(value / 5) * 5;
}
