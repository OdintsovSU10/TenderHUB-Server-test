import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { AuthUser, UserOrganization } from '../lib/supabase/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearAuthError: () => void;
  /** Переключить текущую организацию */
  switchOrganization: (organizationId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);
  const initCompletedRef = useRef(false);

  // Очистка ошибки аутентификации
  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  // Синхронизируем ref с state
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Загрузка организаций пользователя
  const loadUserOrganizations = useCallback(async (userId: string): Promise<UserOrganization[]> => {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          organization_id,
          role,
          organizations(id, name)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('[AuthContext] Ошибка загрузки организаций:', error.message);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.organizations?.id || item.organization_id,
        name: item.organizations?.name || 'Неизвестная организация',
        role: item.role as 'owner' | 'admin' | 'member',
      }));
    } catch (err) {
      console.error('[AuthContext] Исключение при загрузке организаций:', err);
      return [];
    }
  }, []);

  // Загрузка данных пользователя из public.users
  const loadUserData = useCallback(async (authUserId: string): Promise<AuthUser | null> => {
    try {
      console.log('[AuthContext] Загрузка пользователя:', authUserId);

      // Загружаем данные пользователя без .single()
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, role_code, access_status, allowed_pages, access_enabled')
        .eq('id', authUserId);

      console.log('[AuthContext] Результат запроса:', { userDataArray, userError });

      if (userError) {
        console.error('[AuthContext] Ошибка загрузки пользователя:', userError?.message);
        return null;
      }

      // Проверяем что вернулась ровно одна запись
      if (!userDataArray || userDataArray.length === 0) {
        console.error('[AuthContext] Пользователь не найден в таблице users, ID:', authUserId);
        return null;
      }

      if (userDataArray.length > 1) {
        console.error('[AuthContext] Найдено несколько записей пользователя в таблице users');
        return null;
      }

      const userData = userDataArray[0];

      // Загружаем данные роли и организации параллельно
      const [roleDataArray, organizations] = await Promise.all([
        supabase
          .from('roles')
          .select('name, color')
          .eq('code', userData.role_code)
          .then(res => res.data),
        loadUserOrganizations(authUserId),
      ]);

      const roleData = roleDataArray?.[0];

      // Определяем текущую организацию (первая из списка или из localStorage)
      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const currentOrganizationId = organizations.find(o => o.id === savedOrgId)?.id
        || organizations[0]?.id
        || null;

      return {
        id: userData.id,
        email: userData.email,
        full_name: userData.full_name,
        role: roleData?.name as any || 'Инженер',
        role_code: userData.role_code,
        role_color: roleData?.color,
        access_status: userData.access_status,
        allowed_pages: userData.allowed_pages || [],
        access_enabled: userData.access_enabled,
        organizations,
        currentOrganizationId,
      };
    } catch (err) {
      console.error('[AuthContext] Исключение при загрузке пользователя:', err);
      return null;
    }
  }, [loadUserOrganizations]);

  // Обновление данных пользователя
  const refreshUser = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const userData = await loadUserData(session.user.id);
      setUser(userData);
    } else {
      setUser(null);
    }
  }, [loadUserData]);

  // Выход из системы
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      localStorage.removeItem('currentOrganizationId');
    } catch (error) {
      console.error('[AuthContext] Ошибка при выходе:', error);
    }
  }, []);

  // Переключение текущей организации
  const switchOrganization = useCallback((organizationId: string) => {
    if (!user) return;

    // Проверяем, что пользователь состоит в этой организации
    const org = user.organizations.find(o => o.id === organizationId);
    if (!org) {
      console.error('[AuthContext] Пользователь не состоит в организации:', organizationId);
      return;
    }

    // Сохраняем в localStorage
    localStorage.setItem('currentOrganizationId', organizationId);

    // Обновляем state
    setUser(prev => prev ? { ...prev, currentOrganizationId: organizationId } : null);
  }, [user]);

  // Инициализация при монтировании
  useEffect(() => {
    let mounted = true;

    // Подписываемся на изменения auth состояния
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // Игнорируем INITIAL_SESSION - обработаем в initAuth
      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Обрабатываем только если initAuth завершился И user ещё не установлен
        if (initCompletedRef.current && !userRef.current) {
          const userData = await loadUserData(session.user.id);
          if (mounted) {
            if (userData) {
              // Устанавливаем user для всех статусов - Login покажет соответствующий экран
              setUser(userData);
              setAuthError(null);
            } else {
              // Аутентификация успешна, но данные пользователя не найдены
              console.error('[AuthContext] SIGNED_IN: пользователь не найден в БД');
              setAuthError('Профиль пользователя не найден. Обратитесь к администратору.');
              // Выходим из системы, т.к. без профиля работать нельзя
              await supabase.auth.signOut();
            }
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        const userData = await loadUserData(session.user.id);
        if (mounted && userData) {
          setUser(userData);
        }
      }
    });

    const initAuth = async () => {
      try {
        // Таймаут для getSession - если зависнет, продолжаем без сессии
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }, error: null }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: null }), 5000);
        });

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (session?.user && mounted) {
          const userData = await loadUserData(session.user.id);

          if (mounted && userData) {
            // Устанавливаем user для всех статусов - Login покажет соответствующий экран
            setUser(userData);
          }
        }
      } catch (error) {
        console.error('[AuthContext] Ошибка инициализации:', error);
      } finally {
        initCompletedRef.current = true;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  return (
    <AuthContext.Provider value={{ user, loading, authError, signOut, refreshUser, clearAuthError, switchOrganization }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// HOC для компонентов, требующих навигации после signOut
export const useAuthWithNavigation = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  const signOutAndRedirect = useCallback(async () => {
    await auth.signOut();
    navigate('/login', { replace: true });
  }, [auth, navigate]);

  return {
    ...auth,
    signOut: signOutAndRedirect,
  };
};
