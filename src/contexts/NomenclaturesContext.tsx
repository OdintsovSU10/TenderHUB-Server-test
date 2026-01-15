import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { MaterialName, WorkName } from '../lib/supabase/types';

interface Unit {
  code: string;
  name: string;
}

interface NomenclaturesContextType {
  materialNames: MaterialName[];
  workNames: WorkName[];
  units: Unit[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  refreshMaterialNames: () => Promise<void>;
  refreshWorkNames: () => Promise<void>;
  refreshAll: () => Promise<void>;
  getMaterialNameById: (id: string) => MaterialName | undefined;
  getWorkNameById: (id: string) => WorkName | undefined;
  getUnitByCode: (code: string) => Unit | undefined;
}

const NomenclaturesContext = createContext<NomenclaturesContextType | undefined>(undefined);

interface NomenclaturesProviderProps {
  children: ReactNode;
}

// Batch загрузка с пагинацией (обход лимита Supabase в 1000 строк)
async function fetchAllWithBatching<T>(
  tableName: string,
  orderBy: string = 'name'
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order(orderBy, { ascending: true })
      .range(from, from + batchSize - 1);

    if (error) throw error;

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      from += batchSize;
      hasMore = data.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export const NomenclaturesProvider: React.FC<NomenclaturesProviderProps> = ({ children }) => {
  const [materialNames, setMaterialNames] = useState<MaterialName[]>([]);
  const [workNames, setWorkNames] = useState<WorkName[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Кэш для быстрого поиска по ID
  const [materialNamesMap, setMaterialNamesMap] = useState<Map<string, MaterialName>>(new Map());
  const [workNamesMap, setWorkNamesMap] = useState<Map<string, WorkName>>(new Map());
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());

  const refreshMaterialNames = useCallback(async () => {
    try {
      const data = await fetchAllWithBatching<MaterialName>('material_names', 'name');
      setMaterialNames(data);
      setMaterialNamesMap(new Map(data.map(item => [item.id, item])));
    } catch (err: any) {
      console.error('[NomenclaturesContext] Ошибка загрузки material_names:', err);
      throw err;
    }
  }, []);

  const refreshWorkNames = useCallback(async () => {
    try {
      const data = await fetchAllWithBatching<WorkName>('work_names', 'name');
      setWorkNames(data);
      setWorkNamesMap(new Map(data.map(item => [item.id, item])));
    } catch (err: any) {
      console.error('[NomenclaturesContext] Ошибка загрузки work_names:', err);
      throw err;
    }
  }, []);

  const refreshUnits = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('units')
        .select('code, name')
        .order('code', { ascending: true });

      if (err) throw err;

      const unitsData = data || [];
      setUnits(unitsData);
      setUnitsMap(new Map(unitsData.map(item => [item.code, item])));
    } catch (err: any) {
      console.error('[NomenclaturesContext] Ошибка загрузки units:', err);
      throw err;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshMaterialNames(),
        refreshWorkNames(),
        refreshUnits(),
      ]);
      setIsLoaded(true);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки справочников');
    } finally {
      setIsLoading(false);
    }
  }, [refreshMaterialNames, refreshWorkNames, refreshUnits]);

  // Быстрый поиск по ID (O(1) вместо O(n))
  const getMaterialNameById = useCallback((id: string): MaterialName | undefined => {
    return materialNamesMap.get(id);
  }, [materialNamesMap]);

  const getWorkNameById = useCallback((id: string): WorkName | undefined => {
    return workNamesMap.get(id);
  }, [workNamesMap]);

  const getUnitByCode = useCallback((code: string): Unit | undefined => {
    return unitsMap.get(code);
  }, [unitsMap]);

  // Загрузка при монтировании
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  return (
    <NomenclaturesContext.Provider
      value={{
        materialNames,
        workNames,
        units,
        isLoaded,
        isLoading,
        error,
        refreshMaterialNames,
        refreshWorkNames,
        refreshAll,
        getMaterialNameById,
        getWorkNameById,
        getUnitByCode,
      }}
    >
      {children}
    </NomenclaturesContext.Provider>
  );
};

export const useNomenclatures = () => {
  const context = useContext(NomenclaturesContext);
  if (context === undefined) {
    throw new Error('useNomenclatures must be used within a NomenclaturesProvider');
  }
  return context;
};
