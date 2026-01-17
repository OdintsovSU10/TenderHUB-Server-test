import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { MaterialName, WorkName } from '../../lib/supabase/types';

/**
 * Поиск наименований материалов через Supabase
 */
async function searchMaterialNames(query: string, limit: number = 50): Promise<MaterialName[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('material_names')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Ошибка поиска материалов:', error);
    throw error;
  }

  return data || [];
}

/**
 * Поиск наименований работ через Supabase
 */
async function searchWorkNames(query: string, limit: number = 50): Promise<WorkName[]> {
  if (!query || query.length < 2) return [];

  const { data, error } = await supabase
    .from('work_names')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Ошибка поиска работ:', error);
    throw error;
  }

  return data || [];
}

/**
 * Получить материал по ID (для отображения выбранного элемента)
 */
async function getMaterialNameById(id: string): Promise<MaterialName | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('material_names')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Ошибка получения материала:', error);
    return null;
  }

  return data;
}

/**
 * Получить работу по ID (для отображения выбранного элемента)
 */
async function getWorkNameById(id: string): Promise<WorkName | null> {
  if (!id) return null;

  const { data, error } = await supabase
    .from('work_names')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Ошибка получения работы:', error);
    return null;
  }

  return data;
}

/**
 * Хук для поиска материалов с debounce
 */
export function useMaterialSearch(initialValue: string = '', debounceMs: number = 300) {
  const [searchText, setSearchText] = useState(initialValue);
  const [debouncedText, setDebouncedText] = useState(initialValue);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(searchText);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchText, debounceMs]);

  const query = useQuery({
    queryKey: ['materialNames', 'search', debouncedText],
    queryFn: () => searchMaterialNames(debouncedText),
    enabled: debouncedText.length >= 2,
    staleTime: 30000, // 30 секунд - результаты поиска актуальны некоторое время
    gcTime: 5 * 60 * 1000, // 5 минут в кэше
  });

  return {
    searchText,
    setSearchText,
    results: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Хук для поиска работ с debounce
 */
export function useWorkSearch(initialValue: string = '', debounceMs: number = 300) {
  const [searchText, setSearchText] = useState(initialValue);
  const [debouncedText, setDebouncedText] = useState(initialValue);

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedText(searchText);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchText, debounceMs]);

  const query = useQuery({
    queryKey: ['workNames', 'search', debouncedText],
    queryFn: () => searchWorkNames(debouncedText),
    enabled: debouncedText.length >= 2,
    staleTime: 30000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут в кэше
  });

  return {
    searchText,
    setSearchText,
    results: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

/**
 * Хук для получения материала по ID с кэшированием
 */
export function useMaterialNameById(id: string | null | undefined) {
  return useQuery({
    queryKey: ['materialNames', 'byId', id],
    queryFn: () => getMaterialNameById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут в кэше
  });
}

/**
 * Хук для получения работы по ID с кэшированием
 */
export function useWorkNameById(id: string | null | undefined) {
  return useQuery({
    queryKey: ['workNames', 'byId', id],
    queryFn: () => getWorkNameById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут в кэше
  });
}

/**
 * Кэш недавно выбранных элементов (in-memory)
 * Для быстрого отображения без запросов к API
 */
const recentMaterials = new Map<string, MaterialName>();
const recentWorks = new Map<string, WorkName>();
const MAX_RECENT_ITEMS = 100;

function addToRecentCache<T>(cache: Map<string, T>, id: string, item: T) {
  // Удаляем старые элементы если превышен лимит
  if (cache.size >= MAX_RECENT_ITEMS) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(id, item);
}

/**
 * Хук для работы с автокомплитом материалов
 * Комбинирует поиск + кэш выбранных элементов
 */
export function useMaterialAutocomplete(
  initialId?: string | null,
  initialName?: string
) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId || null);
  const [displayText, setDisplayText] = useState(initialName || '');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<string>('');

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Поиск
  const searchQuery = useQuery({
    queryKey: ['materialNames', 'search', debouncedSearch],
    queryFn: () => searchMaterialNames(debouncedSearch),
    enabled: debouncedSearch.length >= 2 && !selectedId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Загрузка выбранного элемента по ID (если не в кэше)
  const selectedQuery = useQuery({
    queryKey: ['materialNames', 'byId', selectedId],
    queryFn: async () => {
      // Сначала проверяем кэш
      if (selectedId && recentMaterials.has(selectedId)) {
        return recentMaterials.get(selectedId)!;
      }
      return getMaterialNameById(selectedId!);
    },
    enabled: !!selectedId && !displayText,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Обновляем displayText когда загружен выбранный элемент
  useEffect(() => {
    if (selectedQuery.data && !displayText) {
      setDisplayText(selectedQuery.data.name);
      addToRecentCache(recentMaterials, selectedQuery.data.id, selectedQuery.data);
    }
  }, [selectedQuery.data, displayText]);

  const handleSearch = useCallback((text: string) => {
    searchInputRef.current = text;
    setSearchText(text);
    setDisplayText(text);
    // При изменении текста сбрасываем выбранный ID
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((item: MaterialName) => {
    setSelectedId(item.id);
    setDisplayText(item.name);
    setSearchText('');
    addToRecentCache(recentMaterials, item.id, item);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(null);
    setDisplayText('');
    setSearchText('');
  }, []);

  return {
    selectedId,
    displayText,
    searchResults: searchQuery.data || [],
    isSearching: searchQuery.isLoading,
    selectedItem: selectedQuery.data || (selectedId ? recentMaterials.get(selectedId) : null),
    onSearch: handleSearch,
    onSelect: handleSelect,
    onClear: handleClear,
  };
}

/**
 * Хук для работы с автокомплитом работ
 * Комбинирует поиск + кэш выбранных элементов
 */
export function useWorkAutocomplete(
  initialId?: string | null,
  initialName?: string
) {
  const [selectedId, setSelectedId] = useState<string | null>(initialId || null);
  const [displayText, setDisplayText] = useState(initialName || '');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchInputRef = useRef<string>('');

  // Debounce поиска
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Поиск
  const searchQuery = useQuery({
    queryKey: ['workNames', 'search', debouncedSearch],
    queryFn: () => searchWorkNames(debouncedSearch),
    enabled: debouncedSearch.length >= 2 && !selectedId,
    staleTime: 30000,
    gcTime: 5 * 60 * 1000,
  });

  // Загрузка выбранного элемента по ID (если не в кэше)
  const selectedQuery = useQuery({
    queryKey: ['workNames', 'byId', selectedId],
    queryFn: async () => {
      // Сначала проверяем кэш
      if (selectedId && recentWorks.has(selectedId)) {
        return recentWorks.get(selectedId)!;
      }
      return getWorkNameById(selectedId!);
    },
    enabled: !!selectedId && !displayText,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Обновляем displayText когда загружен выбранный элемент
  useEffect(() => {
    if (selectedQuery.data && !displayText) {
      setDisplayText(selectedQuery.data.name);
      addToRecentCache(recentWorks, selectedQuery.data.id, selectedQuery.data);
    }
  }, [selectedQuery.data, displayText]);

  const handleSearch = useCallback((text: string) => {
    searchInputRef.current = text;
    setSearchText(text);
    setDisplayText(text);
    // При изменении текста сбрасываем выбранный ID
    setSelectedId(null);
  }, []);

  const handleSelect = useCallback((item: WorkName) => {
    setSelectedId(item.id);
    setDisplayText(item.name);
    setSearchText('');
    addToRecentCache(recentWorks, item.id, item);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedId(null);
    setDisplayText('');
    setSearchText('');
  }, []);

  return {
    selectedId,
    displayText,
    searchResults: searchQuery.data || [],
    isSearching: searchQuery.isLoading,
    selectedItem: selectedQuery.data || (selectedId ? recentWorks.get(selectedId) : null),
    onSearch: handleSearch,
    onSelect: handleSelect,
    onClear: handleClear,
  };
}
