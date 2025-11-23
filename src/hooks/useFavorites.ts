import { authAPI, favoriteAPI } from "@/services/api";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useFavorites(autoLoad: boolean = false) {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    const isAuth = await authAPI.isAuthenticated();
    if (!isAuth) {
      setFavorites([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await favoriteAPI.getUserFavorites(false);
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError((err as Error).message);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleFavorite = useCallback(
    async (productId: number) => {
      const isAuth = await authAPI.isAuthenticated();
      if (!isAuth) {
        throw new Error("Unauthenticated");
      }

      const exists = favorites.some((favorite) => {
        const backendProductId = favorite.productId || favorite.Product?.id;
        return Number(backendProductId) === Number(productId);
      });

      if (exists) {
        await favoriteAPI.removeFavorite(productId);
      } else {
        await favoriteAPI.addFavorite(productId);
      }

      await fetchFavorites();
    },
    [favorites, fetchFavorites]
  );

  const favoriteIds = useMemo(() => {
    return new Set(
      favorites.map((favorite) =>
        Number(favorite.productId || favorite.Product?.id)
      )
    );
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
