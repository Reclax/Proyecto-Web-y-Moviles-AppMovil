import { create } from 'zustand';
import { authAPI, userAPI } from '@/services/api';

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
      
      const token = await authAPI.getAuthToken();
      console.log('[AuthStore] has token:', !!token);

      if (!token) {
        console.log('[AuthStore] No token, not authenticated');
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
        return;
      }

      // First, try to use cached data to show UI quickly
      const cachedUserData = await authAPI.getUserData();
      if (cachedUserData) {
        console.log('[AuthStore] Using cached userData for quick load');
        set({
          user: cachedUserData,
          isAuthenticated: true,
          isLoading: false,
        });
        
        // Then validate token in background (don't block UI)
        setTimeout(async () => {
          try {
            console.log('[AuthStore] Background token validation...');
            const userData = await userAPI.whoAmI();
            if (userData) {
              console.log('[AuthStore] Token valid, updating user data');
              await authAPI.saveAuthData(token, userData);
              set({ user: userData });
            }
          } catch (error: any) {
            console.log('[AuthStore] Background validation failed:', error?.message);
            // If 401, token expired - logout
            if (error?.response?.status === 401) {
              console.log('[AuthStore] Token expired, logging out');
              await authAPI.logout();
              set({ user: null, isAuthenticated: false });
            }
          }
        }, 100);
        return;
      }

      // No cached data, must validate with server
      console.log('[AuthStore] No cached data, validating with server...');
      try {
        const userData = await userAPI.whoAmI();
        console.log('[AuthStore] Token valid, userData from server:', userData?.id);
        
        if (userData) {
          await authAPI.saveAuthData(token, userData);
          set({
            user: userData,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          throw new Error('No user data returned');
        }
      } catch (serverError: any) {
        console.error('[AuthStore] Token validation failed:', serverError?.message);
        
        // Token invalid or network error - clear auth
        console.log('[AuthStore] Clearing auth data');
        await authAPI.logout();
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