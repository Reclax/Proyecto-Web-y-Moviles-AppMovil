import { create } from 'zustand';
import { productAPI, categoryAPI } from '../services/api';

interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  location: string;
  categoryId: number;
  sellerId: number;
  photos?: string[];
  [key: string]: any;
}

interface ProductStore {
  products: Product[];
  myProducts: Product[];
  categories: any[];
  isLoading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  fetchMyProducts: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  createProduct: (data: any, photos?: File[]) => Promise<void>;
  updateProduct: (id: number, data: any, photos?: File[]) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductStore>((set) => ({
  products: [],
  myProducts: [],
  categories: [],
  isLoading: false,
  error: null,

  fetchProducts: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await productAPI.getAll();
      set({ products: data, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  fetchMyProducts: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await productAPI.getMyProducts();
      set({ myProducts: data, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await categoryAPI.getAll();
      set({ categories: data, isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
    }
  },

  createProduct: async (data: any, photos?: File[]) => {
    try {
      set({ isLoading: true, error: null });
      await productAPI.createWithPhotos(data, photos || []);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
      throw error;
    }
  },

  updateProduct: async (id: number, data: any, photos?: File[]) => {
    try {
      set({ isLoading: true, error: null });
      await productAPI.updateProduct(id, data, photos);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
      throw error;
    }
  },

  deleteProduct: async (id: number) => {
    try {
      set({ isLoading: true, error: null });
      await productAPI.deleteProduct(id);
      set((state) => ({
        myProducts: state.myProducts.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: (error as Error).message,
        isLoading: false,
      });
      throw error;
    }
  },
}));