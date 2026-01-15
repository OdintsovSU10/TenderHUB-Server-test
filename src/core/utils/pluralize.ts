/**
 * Склонение слов в зависимости от числа
 *
 * @param count - число
 * @param one - форма для 1 (один)
 * @param two - форма для 2-4 (два)
 * @param five - форма для 5+ (пять)
 * @returns правильная форма слова
 *
 * @example
 * pluralize(1, 'позиция', 'позиции', 'позиций') // => 'позиция'
 * pluralize(3, 'позиция', 'позиции', 'позиций') // => 'позиции'
 * pluralize(5, 'позиция', 'позиции', 'позиций') // => 'позиций'
 * pluralize(21, 'позиция', 'позиции', 'позиций') // => 'позиция'
 */
export function pluralize(count: number, one: string, two: string, five: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return two;
  return five;
}

/**
 * Склонение слов с числом
 *
 * @param count - число
 * @param one - форма для 1 (один)
 * @param two - форма для 2-4 (два)
 * @param five - форма для 5+ (пять)
 * @returns строка вида "5 позиций"
 *
 * @example
 * pluralizeWithCount(5, 'позиция', 'позиции', 'позиций') // => '5 позиций'
 */
export function pluralizeWithCount(count: number, one: string, two: string, five: string): string {
  return `${count} ${pluralize(count, one, two, five)}`;
}
