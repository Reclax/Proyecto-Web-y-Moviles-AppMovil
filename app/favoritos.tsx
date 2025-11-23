import ProductCard from "@/components/catalog/ProductCard";
import EmptyState from "@/components/common/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";
import { palette, spacing } from "@/theme";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function FavoritosScreen() {
  const router = useRouter();
  const { favorites, favoriteIds, loading, refetch, toggleFavorite } =
    useFavorites(true);

  const products = useMemo(() => {
    return favorites.map((fav: any) => fav.Product || fav.product || fav);
  }, [favorites]);

  const handleToggle = async (productId: number) => {
    try {
      await toggleFavorite(productId);
    } catch (error) {
      Alert.alert("Ups", "No pudimos actualizar el favorito.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Favoritos</Text>
        <Text style={styles.subtitle}>
          {products.length} productos guardados
        </Text>
      </View>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
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
          <EmptyState
            icon="heart-outline"
            title="Aún no tienes favoritos"
            message="Guarda productos desde el catálogo para verlos aquí."
          />
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    color: palette.textMuted,
    marginTop: spacing.xs,
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
