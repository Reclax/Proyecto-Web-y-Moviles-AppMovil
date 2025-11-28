import { create } from 'zustand';
import { authAPI } from '@/services/api';

interface User {
  id: number;
  email: string;
  name: string;
  lastname: string;
  avatarUrl?: string;
  phone?: string;
  dni?: string;
  rating?: number;
  roles?: string[];
  [key: string]: any;
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (formData: FormData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with true to prevent redirect before auth check
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.login(email, password);

      if (response?.token) {
        await authAPI.saveAuthData(response.token, response.user);
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error en login';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  register: async (formData: FormData) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authAPI.register(formData);

      if (response?.token) {
        await authAPI.saveAuthData(response.token, response.user);
        set({
          user: response.user,
          isAuthenticated: true,
          isLoading: false,
        });
      }
    } catch (error) {
      const errorMessage = (error as Error).message || 'Error en registro';
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      set({ isLoading: true });
      await authAPI.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  checkAuth: async () => {
    try {
      console.log('[AuthStore] checkAuth started');
      set({ isLoading: true });
      
      const isAuth = await authAPI.isAuthenticated();
      console.log('[AuthStore] isAuthenticated result:', isAuth);

      if (isAuth) {
        const userData = await authAPI.getUserData();
        console.log('[AuthStore] userData:', userData);
        set({
          user: userData,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        console.log('[AuthStore] Not authenticated, redirecting to login');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('[AuthStore] checkAuth error:', error);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));