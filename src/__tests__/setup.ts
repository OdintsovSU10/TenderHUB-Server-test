/**
 * Глобальная настройка Vitest
 * Запускается перед каждым тестовым файлом
 */

import { vi } from 'vitest';

// Мок для Supabase клиента
vi.mock('../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
        })),
        in: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null }))
  }
}));

// Мок для logger чтобы не засорять вывод тестов
vi.mock('../utils/debug/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

// Глобальные типы для Vitest
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Vi {
    interface Assertion {
      toBeCloseTo(expected: number, numDigits?: number): void;
    }
  }
}

// Настройка console для тестов
beforeAll(() => {
  // Подавляем console.log в тестах для чистого вывода
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
