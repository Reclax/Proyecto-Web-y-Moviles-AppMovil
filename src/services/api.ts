import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from "expo-secure-store";

// Determine a sensible default backend URL for development.
// Prefer explicitly configured extra.apiUrl, then environment variable, then derive the host
// from Expo debuggerHost (useful when running on a device) and finally fall back to localhost.
function getDevHostFromDebugger(): string | null {
  try {
    // debuggerHost has the form "192.168.0.9:8081" when running Expo in development
    const dbg =
      (Constants as any).manifest?.debuggerHost ||
      (Constants as any).expoGo?.debuggerHost;
    if (dbg) return dbg.split(":")[0];
  } catch (e) {
    // ignore
  }
  return null;
}

const API_BASE_URL =
  // allow setting via EXPO_PUBLIC_API_URL at runtime (expo env loader in scripts)
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra as any)?.apiUrl ||
  (getDevHostFromDebugger()
    ? `http://${getDevHostFromDebugger()}:8080`
    : "http://localhost:8080");

console.log("API_BASE_URL configured:", API_BASE_URL);

export { API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

const secureStorage = {
  setAuthToken: async (token: string) => {
    try {
      await SecureStore.setItemAsync("authToken", token);
    } catch (error) {
      console.error("Error setting auth token:", error);
    }
  },

  getAuthToken: async () => {
    try {
      return await SecureStore.getItemAsync("authToken");
    } catch (error) {
      console.error("Error getting auth token:", error);
      return null;
    }
  },

  removeAuthToken: async () => {
    try {
      await SecureStore.deleteItemAsync("authToken");
    } catch (error) {
      console.error("Error removing auth token:", error);
    }
  },

  setUserData: async (userData: any) => {
    try {
      await SecureStore.setItemAsync("userData", JSON.stringify(userData));
    } catch (error) {
      console.error("Error setting user data:", error);
    }
  },

  getUserData: async () => {
    try {
      const data = await SecureStore.getItemAsync("userData");
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  },

  removeUserData: async () => {
    try {
      await SecureStore.deleteItemAsync("userData");
    } catch (error) {
      console.error("Error removing user data:", error);
    }
  },

  refreshSession: async () => {
    try {
      const token = await SecureStore.getItemAsync("authToken");
      if (token) {
        await secureStorage.setAuthToken(token);
      }
    } catch (error) {
      console.error("Error refreshing session:", error);
    }
  },
};

// Interceptor para autenticación
api.interceptors.request.use(
  async (config) => {
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${
        config.url
      }`
    );
    try {
      const token = await secureStorage.getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        await secureStorage.refreshSession();
      }

      if (!config.data || !(config.data instanceof FormData)) {
        config.headers["Content-Type"] = "application/json";
      }

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejar respuestas
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await secureStorage.removeAuthToken();
      await secureStorage.removeUserData();
    }
    return Promise.reject(error);
  }
);

// Funciones de autenticación
export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post("/users/login", { email, password });
    return response.data;
  },

  register: async (formData: FormData) => {
    // Use fetch for registration to handle multipart/form-data correctly on Android
    // similar to product creation/update
    console.log("Sending Register FormData via fetch");

    try {
      const response = await fetch(`${API_BASE_URL}/users/register`, {
        method: "POST",
        headers: {
          // Do NOT set Content-Type header, let the browser/engine set it with boundary
          // No auth token needed for registration usually, but if needed:
          // "Authorization": `Bearer ...`
        },
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch register error response:", errorText);

        // Try to parse JSON error if possible
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || `Error ${response.status}`);
        } catch (e) {
          throw new Error(
            `Error del servidor (${response.status}): ${errorText}`
          );
        }
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch register error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const webSocketService = await import("./websocket").then(
        (m) => m.default
      );
      if (webSocketService.isConnectedStatus?.()) {
        webSocketService.send({ type: "userLogout", reason: "manual_logout" });
        setTimeout(() => {
          webSocketService.disconnect();
        }, 500);
      }
    } catch (error) {
      console.error("Error notifying logout:", error);
    }

    await secureStorage.removeAuthToken();
    await secureStorage.removeUserData();
  },

  saveAuthData: async (token: string, userData: any) => {
    await secureStorage.setAuthToken(token);
    if (userData) {
      await secureStorage.setUserData(userData);
    }
  },

  getUserData: async () => {
    return secureStorage.getUserData();
  },

  isAuthenticated: async () => {
    const token = await secureStorage.getAuthToken();
    return !!token;
  },

  getAuthToken: async () => {
    return secureStorage.getAuthToken();
  },
};

// Funciones de usuarios
export const userAPI = {
  getProfile: async () => {
    const response = await api.get("/users/profile");
    return response.data;
  },

  whoAmI: async () => {
    const response = await api.get("/users/whoami");
    return response.data;
  },

  getUserById: async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateProfile: async (userId: number, userData: any) => {
    const response = await api.put(`/users/${userId}`, userData);

    if (response.data && response.data.user) {
      const currentUserData = await secureStorage.getUserData();
      const updatedUserData = {
        ...currentUserData,
        ...response.data.user,
      };
      await secureStorage.setUserData(updatedUserData);
    }

    return response.data;
  },

  updateAvatar: async (userId: number, avatarFile: any) => {
    const formData = new FormData();
    formData.append("avatar", {
      uri: avatarFile.uri,
      type: "image/jpeg",
      name: `avatar_${Date.now()}.jpg`,
    } as any);

    const response = await api.put(`/users/${userId}/avatar`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data && response.data.avatarUrl) {
      const currentUserData = await secureStorage.getUserData();
      const updatedUserData = {
        ...currentUserData,
        avatarUrl: response.data.avatarUrl,
      };
      await secureStorage.setUserData(updatedUserData);
    }

    return response.data;
  },

  changePassword: async (passwordData: any) => {
    const response = await api.put("/users/password", {
      oldPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
    return response.data;
  },

  refreshUserData: async () => {
    try {
      const currentUser = await userAPI.whoAmI();
      if (currentUser) {
        await secureStorage.setUserData(currentUser);
        return currentUser;
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
    return null;
  },
};

// Funciones de productos
export const productAPI = {
  getAll: async () => {
    const response = await api.get("/products");
    return response.data;
  },

  getById: async (id: number) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  create: async (productData: any) => {
    // Swagger requires multipart/form-data for creation
    return productAPI.createWithPhotos(productData, []);
  },

  createWithPhotos: async (productData: any, photos: any[]) => {
    const formData = new FormData();

    // Swagger ProductInput requires: sellerId, title, description, price, categoryId
    if (productData.sellerId)
      formData.append("sellerId", productData.sellerId.toString());
    formData.append("title", productData.title);
    formData.append("description", productData.description || "");
    formData.append("price", productData.price.toString());
    formData.append("categoryId", productData.categoryId.toString());

    // Optional fields
    if (productData.location) formData.append("location", productData.location);

    // locationCoords is an object in Swagger. Sending as JSON string.
    if (productData.locationCoords) {
      formData.append(
        "locationCoords",
        JSON.stringify(productData.locationCoords)
      );
    }

    // status has default 'active'
    formData.append("status", productData.status || "active");

    if (photos && photos.length > 0) {
      photos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          type: photo.type || "image/jpeg",
          name: photo.name || `product_${index}_${Date.now()}.jpg`,
        } as any);
      });
    }

    console.log(
      "Sending Product FormData via fetch:",
      JSON.stringify(formData)
    );

    // Usar fetch nativo para evitar problemas de Network Error con Axios y FormData en Android
    const token = await secureStorage.getAuthToken();
    const headers: any = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    // NOTA: No establecer Content-Type explícitamente, fetch lo generará con el boundary correcto

    try {
      const response = await fetch(`${API_BASE_URL}/products`, {
        method: "POST",
        headers: headers,
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch error response:", errorText);
        throw new Error(
          `Error del servidor (${response.status}): ${
            errorText || response.statusText
          }`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch error:", error);
      throw error;
    }
  },

  getMyProducts: async () => {
    const response = await api.get("/products/my");
    return response.data;
  },

  updateProduct: async (
    productId: number,
    productData: any,
    photos: any[] = []
  ) => {
    const formData = new FormData();

    // Swagger ProductInput requires sellerId even for updates
    if (productData.sellerId)
      formData.append("sellerId", productData.sellerId.toString());

    if (productData.title) formData.append("title", productData.title);
    if (productData.description)
      formData.append("description", productData.description);
    if (productData.price)
      formData.append("price", productData.price.toString());
    if (productData.categoryId)
      formData.append("categoryId", productData.categoryId.toString());
    if (productData.location) formData.append("location", productData.location);

    if (productData.locationCoords) {
      formData.append(
        "locationCoords",
        JSON.stringify(productData.locationCoords)
      );
    }

    if (productData.status) formData.append("status", productData.status);

    if (photos && photos.length > 0) {
      photos.forEach((photo, index) => {
        formData.append("photos", {
          uri: photo.uri,
          type: photo.type || "image/jpeg",
          name: photo.name || `product_${index}_${Date.now()}.jpg`,
        } as any);
      });
    }

    // Use fetch for update as well to handle multipart/form-data correctly on Android
    const token = await secureStorage.getAuthToken();
    const headers: any = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: "PUT",
        headers: headers,
        body: formData as any,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Fetch update error response:", errorText);
        throw new Error(
          `Error del servidor (${response.status}): ${
            errorText || response.statusText
          }`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Fetch update error:", error);
      throw error;
    }
  },

  deleteProduct: async (productId: number) => {
    const response = await api.delete(`/products/${productId}`);
    return response.data;
  },
};

// Funciones de categorías
export const categoryAPI = {
  getAll: async () => {
    const response = await api.get("/categories");
    return response.data;
  },

  getMain: async () => {
    const response = await api.get("/categories/main");
    return response.data;
  },
};

// API para Notificaciones
export const notificationAPI = {
  getAllNotifications: async () => {
    const response = await api.get("/notifications/");
    return response.data;
  },

  getNotificationById: async (id: number) => {
    const response = await api.get(`/notifications/${id}`);
    return response.data;
  },

  markAsRead: async (id: number) => {
    const response = await api.put(`/notifications/${id}`, { read: true });
    return response.data;
  },

  deleteNotification: async (id: number) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

// API para Conversaciones
export const conversationAPI = {
  getMyConversations: async () => {
    const response = await api.get("/conversations");
    return response.data;
  },

  createConversation: async (productId: number) => {
    // Swagger ConversationCreate only requires productId
    const response = await api.post("/conversations", {
      productId,
    });
    return response.data;
  },

  getConversationMessages: async (conversationId: number) => {
    const response = await api.get(
      `/messages/?conversationId=${conversationId}`
    );
    return response.data;
  },
};

// API para Mensajes
export const messageAPI = {
  sendMessage: async (conversationId: number, content: string) => {
    const payload = {
      conversationId: parseInt(conversationId.toString()),
      content: content.toString(),
    };
    const response = await api.post("/messages", payload);
    return response.data;
  },

  getMessages: async (conversationId: number) => {
    const response = await api.get(
      `/messages/?conversationId=${conversationId}`
    );
    return response.data;
  },
};

// API de Favoritos
let favoritesCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000;

export const favoriteAPI = {
  getUserFavorites: async (useCache: boolean = true) => {
    const now = Date.now();

    if (useCache && favoritesCache && now - cacheTimestamp < CACHE_DURATION) {
      return favoritesCache;
    }

    const response = await api.get("/favorites");

    favoritesCache = response.data;
    cacheTimestamp = now;

    return response.data;
  },

  clearCache: () => {
    favoritesCache = null;
    cacheTimestamp = 0;
  },

  addFavorite: async (productId: number) => {
    const numericProductId = parseInt(productId.toString());
    if (isNaN(numericProductId)) {
      throw new Error(`Invalid productId: ${productId}`);
    }

    const payload = { productId: numericProductId };
    const response = await api.post("/favorites", payload);

    favoriteAPI.clearCache();

    return response.data;
  },

  removeFavorite: async (productId: number) => {
    const numericProductId = parseInt(productId.toString());
    if (isNaN(numericProductId)) {
      throw new Error(`Invalid productId: ${productId}`);
    }

    console.log('[favoriteAPI] Removing favorite for productId:', numericProductId);

    try {
      const response = await api.delete(`/favorites/${numericProductId}`);
      favoriteAPI.clearCache();
      return response.data;
    } catch (error: any) {
      // If 404, the favorite was already removed - that's okay
      if (error.response?.status === 404) {
        console.log('[favoriteAPI] Favorite already removed (404)');
        favoriteAPI.clearCache();
        return { message: "Favorite already removed" };
      }
      throw error;
    }
  },

  isFavorite: async (productId: number) => {
    try {
      const favorites = await favoriteAPI.getUserFavorites();

      const numericProductId = parseInt(productId.toString());

      const isFav = favorites.some((favorite: any) => {
        const backendProductId = favorite.productId || favorite.Product?.id;
        const backendProductIdNum = parseInt(backendProductId);

        return backendProductIdNum === numericProductId;
      });

      return isFav;
    } catch (error) {
      console.error("Error checking favorite:", error);
      return false;
    }
  },
};

export default api;
