/**
 * Утилиты для форматирования числовых значений
 * Поддержка русской локализации с запятой как десятичным разделителем
 */

/**
 * Нормализует числовое значение, заменяя запятую на точку
 * Используется для поддержки русского формата ввода чисел (1,5 вместо 1.5)
 *
 * @param value - строка или число для нормализации
 * @returns нормализованное число или undefined
 *
 * @example
 * normalizeNumber("1,5") // => 1.5
 * normalizeNumber("10,25") // => 10.25
 * normalizeNumber("100") // => 100
 * normalizeNumber(50) // => 50
 */
export function normalizeNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  // Если уже число, возвращаем как есть
  if (typeof value === 'number') {
    return value;
  }

  // Заменяем запятую на точку
  const normalized = value.toString().replace(',', '.');
  const parsed = parseFloat(normalized);

  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Парсер для ввода чисел
 * Преобразует русский формат (запятая или точка) в формат для JS
 *
 * @param value - строковое значение (может содержать запятую или точку)
 * @returns число
 *
 * @example
 * parseNumberInput("1,5") // => 1.5
 * parseNumberInput("1.5") // => 1.5
 */
export function parseNumberInput(value: string | undefined): number {
  if (!value || value.trim() === '') return 0;

  // Заменяем и запятую, и точку на точку для корректного парсинга JavaScript
  let normalized = value.replace(/,/g, '.');

  // Если несколько точек, оставляем только последнюю как десятичный разделитель
  const parts = normalized.split('.');
  if (parts.length > 2) {
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Форматтер чисел в русский формат (с запятой)
 *
 * @param value - числовое значение
 * @returns строка с запятой вместо точки
 *
 * @example
 * formatNumberOutput(1.5) // => "1,5"
 */
export function formatNumberOutput(value: number | undefined): string {
  if (value === undefined || value === null) return '';
  return value.toString().replace('.', ',');
}

/**
 * Парсер для ввода чисел с разделителями тысяч
 * Убирает пробелы и заменяет запятую/точку на десятичный разделитель
 *
 * @param value - строка из поля ввода (может содержать пробелы, запятые и точки)
 * @returns число
 *
 * @example
 * parseNumberWithSpaces("1 000,5") // => 1000.5
 * parseNumberWithSpaces("1 000.5") // => 1000.5
 */
export function parseNumberWithSpaces(value: string | undefined): number {
  if (!value || value.trim() === '') return 0;

  // Убираем все пробелы
  let normalized = value.replace(/\s/g, '');

  // Заменяем запятые на точки
  normalized = normalized.replace(/,/g, '.');

  // Если несколько точек, оставляем только последнюю как десятичный разделитель
  const parts = normalized.split('.');
  if (parts.length > 2) {
    normalized = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Форматтер чисел с разделителями тысяч
 * Добавляет пробелы между тысячами и заменяет точку на запятую
 *
 * @param value - числовое значение
 * @returns строка с пробелами и запятой
 *
 * @example
 * formatNumberWithSpaces(1000.5) // => "1 000,5"
 */
export function formatNumberWithSpaces(value: number | undefined): string {
  if (value === undefined || value === null) return '';

  // Разделяем целую и дробную части
  const parts = value.toString().split('.');

  // Добавляем пробелы между тысячами
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Заменяем точку на запятую для дробной части
  return parts.join(',');
}

/**
 * Форматирует денежную сумму с сокращениями
 * @param value - числовое значение
 * @returns форматированная строка (например, "1.5 млн" или "500 тыс")
 */
export function formatMoney(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    const billions = absValue / 1_000_000_000;
    if (billions % 1 === 0) return `${sign}${billions.toFixed(0)} млрд`;
    return `${sign}${billions.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} млрд`;
  }

  if (absValue >= 1_000_000) {
    const millions = absValue / 1_000_000;
    if (millions % 1 === 0) return `${sign}${millions.toFixed(0)} млн`;
    return `${sign}${millions.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 2 })} млн`;
  }

  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    if (thousands % 1 === 0) return `${sign}${thousands.toFixed(0)} тыс`;
    return `${sign}${thousands.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} тыс`;
  }

  return value.toLocaleString('ru-RU');
}

/**
 * Форматирует денежную сумму со знаком
 * @param value - числовое значение
 * @returns форматированная строка со знаком (например, "+1.5 млн" или "-500 тыс")
 */
export function formatMoneyWithSign(value: number): string {
  if (value > 0) return `+${formatMoney(value)}`;
  if (value < 0) return formatMoney(value);
  return '0';
}

/**
 * Форматирует коммерческую стоимость
 * @param value - числовое значение
 * @param decimals - количество знаков после запятой (по умолчанию 2)
 * @returns отформатированная строка
 */
export function formatCommercialCost(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}
