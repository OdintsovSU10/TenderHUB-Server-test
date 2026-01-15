/**
 * Core Module - чистая бизнес-логика
 *
 * Этот модуль НЕ зависит от:
 * - React / UI библиотек
 * - Ant Design
 * - Supabase / конкретных реализаций хранилища
 *
 * Структура:
 * - domain/: сущности и value objects
 * - ports/: интерфейсы (контракты) для репозиториев и сервисов
 * - services/: бизнес-сервисы
 * - utils/: чистые утилиты без побочных эффектов
 */

export * from './domain';
export * from './ports';
export * from './utils';
export * from './services';
