import ProductCard from "@/components/catalog/ProductCard";
import EmptyState from "@/components/common/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";
import { productAPI } from "@/services/api";
import { palette, radius, spacing } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function FavoritosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { favorites, favoriteIds, loading, refetch, toggleFavorite } =
    useFavorites(true);
  const [productsWithPhotos, setProductsWithPhotos] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Obtener los IDs de productos de los favoritos
  const favoriteProductIds = useMemo(() => {
    return favorites
      .map((fav: any) => {
        const product = fav.Product || fav.product || fav;
        return product.id;
      })
      .filter(Boolean);
  }, [favorites]);

  // Cargar los productos completos con fotos
  const loadProductsWithPhotos = useCallback(async () => {
    if (favoriteProductIds.length === 0) {
      setProductsWithPhotos([]);
      return;
    }

    setLoadingProducts(true);
    try {
      const productPromises = favoriteProductIds.map(async (id: number) => {
        try {
          const fullProduct = await productAPI.getById(id);
          console.log(
            `[Favoritos] Product ${id} photos:`,
            fullProduct?.ProductPhotos
          );
          return fullProduct;
        } catch (error) {
          console.log(`[Favoritos] Error fetching product ${id}:`, error);
          // Si falla, retornar los datos básicos del favorito
          const fav = favorites.find((f: any) => {
            const p = f.Product || f.product || f;
            return p.id === id;
          });
          return fav?.Product || fav?.product || fav;
        }
      });

      const products = await Promise.all(productPromises);
      setProductsWithPhotos(products.filter(Boolean));
    } catch (error) {
      console.error("[Favoritos] Error loading products:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, [favoriteProductIds, favorites]);

  // Cargar productos cuando cambien los favoritos
  useEffect(() => {
    loadProductsWithPhotos();
  }, [loadProductsWithPhotos]);

  const handleToggle = async (productId: number) => {
    try {
      await toggleFavorite(productId);
    } catch (error) {
      Alert.alert("Ups", "No pudimos actualizar el favorito.");
    }
  };

  const handleRefresh = async () => {
    await refetch();
    // loadProductsWithPhotos se llamará automáticamente por el useEffect
  };

  const handleRemoveAll = () => {
    if (productsWithPhotos.length === 0) return;

    Alert.alert(
      "Eliminar todos los favoritos",
      `¿Estás seguro de eliminar los ${productsWithPhotos.length} favoritos? Esta acción no se puede deshacer.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar todos",
          style: "destructive",
          onPress: async () => {
            try {
              // Eliminar todos uno por uno
              await Promise.all(
                productsWithPhotos.map((p: any) => toggleFavorite(p.id))
              );
              Alert.alert("Listo", "Todos los favoritos han sido eliminados");
            } catch (error) {
              Alert.alert(
                "Error",
                "No se pudieron eliminar todos los favoritos"
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Favoritos</Text>
            <Text style={styles.subtitle}>
              {productsWithPhotos.length} productos guardados
            </Text>
          </View>
        </View>
        {productsWithPhotos.length > 0 && (
          <TouchableOpacity
            style={styles.removeAllButton}
            onPress={handleRemoveAll}
          >
            <Ionicons name="trash-outline" size={18} color={palette.danger} />
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={productsWithPhotos}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading || loadingProducts}
            onRefresh={handleRefresh}
            colors={[palette.primary]}
          />
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            isFavorite={favoriteIds.has(item.id)}
            onPress={() => router.push(`/producto/${item.id}`)}
            onToggleFavorite={() => handleToggle(item.id)}
          />
        )}
        ListEmptyComponent={
          !loading && !loadingProducts ? (
            <EmptyState
              icon="heart-outline"
              title="Aún no tienes favoritos"
              message="Guarda productos desde el catálogo para verlos aquí."
            />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    color: palette.textMuted,
    marginTop: 2,
  },
  removeAllButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  columnWrapper: {
    gap: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
});
