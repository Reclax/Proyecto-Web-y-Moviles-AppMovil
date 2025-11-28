import { authAPI, favoriteAPI } from "@/services/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function useFavorites(autoLoad: boolean = false) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const togglingRef = useRef<Set<number>>(new Set()); // Track products being toggled

  const fetchFavorites = useCallback(async () => {
    const isAuth = await authAPI.isAuthenticated();
    if (!isAuth) {
      console.log('[useFavorites] Not authenticated, clearing favorites');
      setFavorites([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await favoriteAPI.getUserFavorites(false);
      console.log('[useFavorites] Fetched favorites:', data?.length, 'items');
      console.log('[useFavorites] Raw favorites data:', JSON.stringify(data?.slice(0, 2)));
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[useFavorites] Error fetching favorites:', err);
      setError((err as Error).message);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(
    async (productId: number) => {
      const numericProductId = Number(productId);
      
      // Prevent double-toggling the same product
      if (togglingRef.current.has(numericProductId)) {
        console.log('[useFavorites] Already toggling product:', numericProductId);
        return;
      }

      const isAuth = await authAPI.isAuthenticated();
      if (!isAuth) {
        throw new Error("Unauthenticated");
      }

      togglingRef.current.add(numericProductId);

      // Check if exists before optimistic update
      const exists = favorites.some((favorite) => {
        const backendProductId = favorite.productId || favorite.Product?.id;
        return Number(backendProductId) === numericProductId;
      });

      console.log('[useFavorites] Toggle favorite - productId:', numericProductId, 'exists:', exists);

      // Optimistic update - immediately update UI
      if (exists) {
        setFavorites(prev => prev.filter(fav => {
          const favProductId = Number(fav.productId ?? fav.Product?.id);
          return favProductId !== numericProductId;
        }));
      } else {
        setFavorites(prev => [...prev, { productId: numericProductId }]);
      }

      try {
        if (exists) {
          await favoriteAPI.removeFavorite(numericProductId);
        } else {
          await favoriteAPI.addFavorite(numericProductId);
        }

        // Refresh to get accurate data from server
        await fetchFavorites();
      } catch (err) {
        console.error('[useFavorites] Error toggling favorite:', err);
        // Revert on error
        await fetchFavorites();
        throw err;
      } finally {
        togglingRef.current.delete(numericProductId);
      }
    },
    [favorites, fetchFavorites]
  );

  const favoriteIds = useMemo(() => {
    const ids = new Set(
      favorites.map((favorite) => {
        // Handle both direct productId and nested Product.id
        const id = Number(favorite.productId ?? favorite.Product?.id);
        return id;
      }).filter((id) => !isNaN(id))
    );
    console.log('[useFavorites] favoriteIds Set:', Array.from(ids));
    return ids;
  }, [favorites]);

  const isFavorite = useCallback(
    (productId: number) => favoriteIds.has(Number(productId)),
    [favoriteIds]
  );

  useEffect(() => {
    if (autoLoad) {
      fetchFavorites();
    }
  }, [autoLoad, fetchFavorites]);

  return {
    favorites,
    favoriteIds,
    loading,
    error,
    refetch: fetchFavorites,
    toggleFavorite,
    isFavorite,
  };
}

export default useFavorites;
