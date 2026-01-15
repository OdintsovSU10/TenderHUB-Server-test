/**
 * Core Utils - чистые утилиты без побочных эффектов
 *
 * Эти утилиты НЕ зависят от:
 * - React / UI библиотек
 * - Supabase / конкретных хранилищ
 * - Browser API (кроме стандартных JS API)
 */

export * from './levenshtein';
export * from './similarity';
export * from './numberFormat';
export * from './pluralize';
