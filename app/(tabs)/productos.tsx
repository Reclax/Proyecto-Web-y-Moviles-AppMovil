import CategoryChip from "@/components/catalog/CategoryChip";
import { FilterModal } from "@/components/catalog/FilterModal";
import ProductCard from "@/components/catalog/ProductCard";
import EmptyState from "@/components/common/EmptyState";
import { useFavorites } from "@/hooks/useFavorites";
import { categoryAPI, productAPI } from "@/services/api";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProductosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    (params.categoryId as string) || "all"
  );
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    minPrice: "",
    maxPrice: "",
    location: "",
  });
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">(
    "newest"
  );

  const { favoriteIds, toggleFavorite, refetch } = useFavorites(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
      ]);

      setProducts(productsData || []);
      setCategories(categoriesData || []);
    } catch (err) {
      console.error("Error loading products:", err);
      setError("No se pudieron cargar los productos");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadData(), refetch()]);
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  }, [loadData, refetch]);

  const mainCategories = useMemo(
    () => [
      { id: "all", name: "Todos" },
      ...categories.filter((c) => !c.parentCategoryId),
    ],
    [categories]
  );

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch = product.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        product.categoryId == parseInt(selectedCategory as string, 10);

      // Apply custom filters
      const price = parseFloat(product.price);
      const matchesMinPrice = filters.minPrice
        ? price >= parseFloat(filters.minPrice)
        : true;
      const matchesMaxPrice = filters.maxPrice
        ? price <= parseFloat(filters.maxPrice)
        : true;
      const matchesLocation = filters.location
        ? product.location
            ?.toLowerCase()
            .includes(filters.location.toLowerCase())
        : true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesLocation
      );
    });

    // Apply Sorting
    return result.sort((a, b) => {
      if (sortBy === "price_asc")
        return parseFloat(a.price) - parseFloat(b.price);
      if (sortBy === "price_desc")
        return parseFloat(b.price) - parseFloat(a.price);
      // Default to newest (assuming higher ID is newer for now, or createdAt if available)
      return b.id - a.id;
    });
  }, [products, searchTerm, selectedCategory, filters, sortBy]);

  const handleFavorite = useCallback(
    async (id: number) => {
      try {
        await toggleFavorite(id);
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    },
    [toggleFavorite]
  );

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.minPrice) count++;
    if (filters.maxPrice) count++;
    if (filters.location) count++;
    return count;
  }, [filters]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Explorar</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setIsFilterModalVisible(true)}
          >
            <Ionicons name="options-outline" size={24} color={palette.text} />
            {activeFiltersCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFiltersCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={palette.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar productos, marcas..."
            placeholderTextColor={palette.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => setSearchTerm("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Content */}
      {loading && !products.length ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loadingText}>Cargando catálogo...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[palette.primary]}
              tintColor={palette.primary}
            />
          }
          ListHeaderComponent={
            <View>
              {error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="warning" size={18} color={palette.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoriesScroll}
                contentContainerStyle={styles.categoriesContent}
              >
                {mainCategories.map((category) => (
                  <CategoryChip
                    key={category.id}
                    label={category.name}
                    selected={selectedCategory === category.id.toString()}
                    onPress={() => setSelectedCategory(category.id.toString())}
                  />
                ))}
              </ScrollView>

              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {filteredProducts.length} resultados
                </Text>
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => {
                    if (sortBy === "newest") setSortBy("price_asc");
                    else if (sortBy === "price_asc") setSortBy("price_desc");
                    else setSortBy("newest");
                  }}
                >
                  <Text style={styles.sortText}>
                    {sortBy === "newest"
                      ? "Más recientes"
                      : sortBy === "price_asc"
                      ? "Precio: Bajo a Alto"
                      : "Precio: Alto a Bajo"}
                  </Text>
                  <Ionicons
                    name="chevron-down"
                    size={14}
                    color={palette.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              isFavorite={favoriteIds.has(Number(item.id))}
              onPress={() => router.push(`/producto/${item.id}`)}
              onToggleFavorite={() => handleFavorite(item.id)}
              showBadges={true}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title="No se encontraron productos"
              message={
                searchTerm || activeFiltersCount > 0
                  ? "Intenta ajustar tus filtros o búsqueda"
                  : "No hay productos disponibles en esta categoría"
              }
            />
          }
        />
      )}

      <FilterModal
        visible={isFilterModalVisible}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={setFilters}
        initialFilters={filters}
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
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    ...shadows.sm,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
    letterSpacing: -0.5,
  },
  filterButton: {
    position: "relative",
    padding: 4,
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: palette.primary,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: palette.surface,
  },
  badgeText: {
    color: palette.surface,
    fontSize: 9,
    fontWeight: "bold",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.muted,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    height: 44,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body,
    color: palette.text,
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
    color: palette.textMuted,
  },
  categoriesScroll: {
    marginVertical: spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  resultsCount: {
    fontSize: typography.caption,
    color: palette.textMuted,
    fontWeight: "600",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortText: {
    fontSize: typography.caption,
    color: palette.primary,
    fontWeight: "600",
  },
  columnWrapper: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  listContent: {
    paddingBottom: spacing.xl * 2,
    paddingTop: spacing.sm,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  errorText: {
    color: palette.error,
    flex: 1,
  },
});
