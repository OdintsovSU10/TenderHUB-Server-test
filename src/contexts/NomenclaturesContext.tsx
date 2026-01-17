import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface Unit {
  code: string;
  name: string;
}

interface NomenclaturesContextType {
  /** Список единиц измерения (небольшая таблица, загружается при старте) */
  units: Unit[];
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  /** Обновить список единиц измерения */
  refreshUnits: () => Promise<void>;
  /** Получить единицу измерения по коду */
  getUnitByCode: (code: string) => Unit | undefined;

  // Deprecated: эти массивы больше не загружаются автоматически
  // Используйте хуки useMaterialAutocomplete и useWorkAutocomplete из @/client/hooks
  /** @deprecated Используйте useMaterialAutocomplete */
  materialNames: never[];
  /** @deprecated Используйте useWorkAutocomplete */
  workNames: never[];
  /** @deprecated Не используется */
  refreshMaterialNames: () => Promise<void>;
  /** @deprecated Не используется */
  refreshWorkNames: () => Promise<void>;
  /** @deprecated Не используется */
  refreshAll: () => Promise<void>;
  /** @deprecated Используйте useMaterialNameById */
  getMaterialNameById: (id: string) => undefined;
  /** @deprecated Используйте useWorkNameById */
  getWorkNameById: (id: string) => undefined;
}

const NomenclaturesContext = createContext<NomenclaturesContextType | undefined>(undefined);

interface NomenclaturesProviderProps {
  children: ReactNode;
}

export const NomenclaturesProvider: React.FC<NomenclaturesProviderProps> = ({ children }) => {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Кэш для быстрого поиска по коду
  const [unitsMap, setUnitsMap] = useState<Map<string, Unit>>(new Map());

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
    } catch (err: unknown) {
      const e = err as Error;
      console.error('[NomenclaturesContext] Ошибка загрузки units:', e.message);
      throw err;
    }
  }, []);

  // Загрузка только units при монтировании
  useEffect(() => {
    const loadUnits = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await refreshUnits();
        setIsLoaded(true);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Ошибка загрузки справочников');
      } finally {
        setIsLoading(false);
      }
    };
    loadUnits();
  }, [refreshUnits]);

  // Быстрый поиск по коду (O(1))
  const getUnitByCode = useCallback((code: string): Unit | undefined => {
    return unitsMap.get(code);
  }, [unitsMap]);

  // Deprecated функции - возвращают пустые значения
  const deprecatedNoOp = useCallback(async () => {
    console.warn('[NomenclaturesContext] Deprecated: используйте хуки из @/client/hooks');
  }, []);

  const deprecatedGetById = useCallback((): undefined => {
    console.warn('[NomenclaturesContext] Deprecated: используйте useMaterialNameById/useWorkNameById');
    return undefined;
  }, []);

  return (
    <NomenclaturesContext.Provider
      value={{
        units,
        isLoaded,
        isLoading,
        error,
        refreshUnits,
        getUnitByCode,

        // Deprecated - пустые значения для обратной совместимости
        materialNames: [] as never[],
        workNames: [] as never[],
        refreshMaterialNames: deprecatedNoOp,
        refreshWorkNames: deprecatedNoOp,
        refreshAll: deprecatedNoOp,
        getMaterialNameById: deprecatedGetById,
        getWorkNameById: deprecatedGetById,
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
