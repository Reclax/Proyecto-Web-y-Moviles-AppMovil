import ProductCard from "@/components/catalog/ProductCard";
import EmptyState from "@/components/common/EmptyState";
import LocationPicker from "@/components/common/LocationPicker";
import { useFavorites } from "@/hooks/useFavorites";
import { categoryAPI, productAPI } from "@/services/api";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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

interface Category {
  id: number;
  name: string;
  parentCategoryId: number | null;
}

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface Filters {
  minPrice: string;
  maxPrice: string;
  location: string;
  locationCoords: LocationData | null;
  searchRadius: number;
  categoryId: string;
  subcategoryId: string;
  condition: string;
}

const CONDITIONS = [
  { id: "", label: "Todos" },
  { id: "new", label: "Nuevo" },
  { id: "like_new", label: "Como nuevo" },
  { id: "good", label: "Buen estado" },
  { id: "fair", label: "Aceptable" },
];

const PRICE_RANGES = [
  { id: "", label: "Todos", min: "", max: "" },
  { id: "0-100", label: "$0 - $100", min: "0", max: "100" },
  { id: "100-500", label: "$100 - $500", min: "100", max: "500" },
  { id: "500-1000", label: "$500 - $1000", min: "500", max: "1000" },
  { id: "1000+", label: "$1000+", min: "1000", max: "" },
];

export default function ProductosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter Modal State
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempFilters, setTempFilters] = useState<Filters>({
    minPrice: "",
    maxPrice: "",
    location: "",
    locationCoords: null,
    searchRadius: 10,
    categoryId: "",
    subcategoryId: "",
    condition: "",
  });
  const [appliedFilters, setAppliedFilters] = useState<Filters>({
    minPrice: "",
    maxPrice: "",
    location: "",
    locationCoords: null,
    searchRadius: 10,
    categoryId: (params.categoryId as string) || "",
    subcategoryId: "",
    condition: "",
  });

  // Category expansion state
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
    new Set()
  );

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

  // Categorías principales
  const mainCategories = useMemo(() => {
    return categories.filter((cat) => !cat.parentCategoryId);
  }, [categories]);

  // Función para obtener subcategorías de una categoría
  const getSubcategories = useCallback(
    (categoryId: number) => {
      return categories.filter((cat) => cat.parentCategoryId === categoryId);
    },
    [categories]
  );

  // Contar productos por categoría
  const getProductCount = useCallback(
    (categoryId: number, isMain: boolean = false) => {
      if (isMain) {
        // Para categorías principales, contar productos propios + de subcategorías
        const subcats = getSubcategories(categoryId);
        const subcatIds = subcats.map((s) => s.id);
        return products.filter(
          (p) => p.categoryId === categoryId || subcatIds.includes(p.categoryId)
        ).length;
      }
      return products.filter((p) => p.categoryId === categoryId).length;
    },
    [products, getSubcategories]
  );

  // Función para calcular distancia entre dos coordenadas (fórmula de Haversine)
  const calculateDistance = useCallback(
    (lat1: number, lon1: number, lat2: number, lon2: number): number => {
      const R = 6371; // Radio de la Tierra en km
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c; // Distancia en km
    },
    []
  );

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const matchesSearch = product.title
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

      // Category filter
      let matchesCategory = true;
      if (appliedFilters.categoryId) {
        const mainCatId = parseInt(appliedFilters.categoryId);
        const subcats = getSubcategories(mainCatId);
        const subcatIds = subcats.map((s) => s.id);

        // Si hay subcategoría seleccionada, filtrar solo por ella
        if (appliedFilters.subcategoryId) {
          matchesCategory =
            product.categoryId === parseInt(appliedFilters.subcategoryId);
        } else {
          // Si no, incluir la categoría principal y sus subcategorías
          matchesCategory =
            product.categoryId === mainCatId ||
            subcatIds.includes(product.categoryId);
        }
      }

      // Condition filter
      const matchesCondition =
        !appliedFilters.condition ||
        product.condition === appliedFilters.condition;

      // Price filters
      const price = parseFloat(product.price);
      const matchesMinPrice = appliedFilters.minPrice
        ? price >= parseFloat(appliedFilters.minPrice)
        : true;
      const matchesMaxPrice = appliedFilters.maxPrice
        ? price <= parseFloat(appliedFilters.maxPrice)
        : true;

      // Location filter - por coordenadas o por texto
      let matchesLocation = true;
      if (appliedFilters.locationCoords && product.coords) {
        // Filtrar por distancia usando coordenadas
        const distance = calculateDistance(
          appliedFilters.locationCoords.lat,
          appliedFilters.locationCoords.lng,
          product.coords.lat,
          product.coords.lng
        );
        matchesLocation = distance <= appliedFilters.searchRadius;
      } else if (appliedFilters.location) {
        // Filtrar por texto de ubicación
        matchesLocation = product.location
          ?.toLowerCase()
          .includes(appliedFilters.location.toLowerCase());
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCondition &&
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
      return b.id - a.id;
    });
  }, [products, searchTerm, appliedFilters, sortBy, getSubcategories]);

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
    if (appliedFilters.minPrice || appliedFilters.maxPrice) count++;
    if (appliedFilters.location || appliedFilters.locationCoords) count++;
    if (appliedFilters.categoryId) count++;
    if (appliedFilters.subcategoryId) count++;
    if (appliedFilters.condition) count++;
    return count;
  }, [appliedFilters]);

  // Open filter modal with current applied filters
  const openFilterModal = () => {
    setTempFilters({ ...appliedFilters });
    setIsFilterModalVisible(true);
  };

  // Apply filters and close modal
  const handleApplyFilters = () => {
    setAppliedFilters({ ...tempFilters });
    setIsFilterModalVisible(false);
  };

  // Clear all filters
  const handleClearFilters = () => {
    const emptyFilters: Filters = {
      minPrice: "",
      maxPrice: "",
      location: "",
      locationCoords: null,
      searchRadius: 10,
      categoryId: "",
      subcategoryId: "",
      condition: "",
    };
    setTempFilters(emptyFilters);
  };

  // Toggle category expansion
  const toggleCategoryExpansion = (categoryId: number) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Select category in filter modal
  const selectCategory = (
    categoryId: string,
    isSubcategory: boolean = false
  ) => {
    if (isSubcategory) {
      setTempFilters((prev) => ({
        ...prev,
        subcategoryId: prev.subcategoryId === categoryId ? "" : categoryId,
      }));
    } else {
      setTempFilters((prev) => ({
        ...prev,
        categoryId: prev.categoryId === categoryId ? "" : categoryId,
        subcategoryId: "",
      }));
      // Auto-expand when selecting
      if (categoryId) {
        setExpandedCategories((prev) => {
          const newSet = new Set(Array.from(prev));
          newSet.add(parseInt(categoryId));
          return newSet;
        });
      }
    }
  };

  // Get active filter tags for display
  const getActiveFilterTags = () => {
    const tags: { label: string; key: string }[] = [];

    if (appliedFilters.categoryId) {
      const cat = categories.find(
        (c) => c.id === parseInt(appliedFilters.categoryId)
      );
      if (cat) tags.push({ label: `📁 ${cat.name}`, key: "category" });
    }

    if (appliedFilters.subcategoryId) {
      const subcat = categories.find(
        (c) => c.id === parseInt(appliedFilters.subcategoryId)
      );
      if (subcat) tags.push({ label: `📂 ${subcat.name}`, key: "subcategory" });
    }

    if (appliedFilters.condition) {
      const cond = CONDITIONS.find((c) => c.id === appliedFilters.condition);
      if (cond) tags.push({ label: `🏷️ ${cond.label}`, key: "condition" });
    }

    if (appliedFilters.minPrice || appliedFilters.maxPrice) {
      const priceLabel =
        appliedFilters.minPrice && appliedFilters.maxPrice
          ? `$${appliedFilters.minPrice} - $${appliedFilters.maxPrice}`
          : appliedFilters.minPrice
          ? `Desde $${appliedFilters.minPrice}`
          : `Hasta $${appliedFilters.maxPrice}`;
      tags.push({ label: `💰 ${priceLabel}`, key: "price" });
    }

    if (appliedFilters.locationCoords) {
      const shortAddress =
        appliedFilters.locationCoords.address.length > 25
          ? appliedFilters.locationCoords.address.substring(0, 25) + "..."
          : appliedFilters.locationCoords.address;
      tags.push({
        label: `📍 ${shortAddress} (${appliedFilters.searchRadius}km)`,
        key: "location",
      });
    } else if (appliedFilters.location) {
      tags.push({ label: `📍 ${appliedFilters.location}`, key: "location" });
    }

    return tags;
  };

  const removeFilterTag = (key: string) => {
    setAppliedFilters((prev) => {
      const newFilters = { ...prev };
      switch (key) {
        case "category":
          newFilters.categoryId = "";
          newFilters.subcategoryId = "";
          break;
        case "subcategory":
          newFilters.subcategoryId = "";
          break;
        case "condition":
          newFilters.condition = "";
          break;
        case "price":
          newFilters.minPrice = "";
          newFilters.maxPrice = "";
          break;
        case "location":
          newFilters.location = "";
          newFilters.locationCoords = null;
          break;
      }
      return newFilters;
    });
  };

  // Render Filter Modal
  const renderFilterModal = () => (
    <Modal
      visible={isFilterModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setIsFilterModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Filtrar Productos</Text>
              <Text style={styles.modalSubtitle}>
                Selecciona los filtros y presiona aplicar
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setIsFilterModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Categorías Agrupadas */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Categorías</Text>

              {/* Opción Todas */}
              <TouchableOpacity
                style={[
                  styles.categoryItem,
                  !tempFilters.categoryId && styles.categoryItemSelected,
                ]}
                onPress={() => selectCategory("")}
              >
                <View style={styles.categoryItemContent}>
                  <Ionicons
                    name="apps"
                    size={20}
                    color={
                      !tempFilters.categoryId
                        ? palette.surface
                        : palette.primary
                    }
                  />
                  <Text
                    style={[
                      styles.categoryItemText,
                      !tempFilters.categoryId &&
                        styles.categoryItemTextSelected,
                    ]}
                  >
                    Todas las categorías
                  </Text>
                </View>
                <Text
                  style={[
                    styles.categoryCount,
                    !tempFilters.categoryId && styles.categoryCountSelected,
                  ]}
                >
                  {products.length}
                </Text>
              </TouchableOpacity>

              {/* Categorías principales con subcategorías */}
              {mainCategories.map((category) => {
                const subcats = getSubcategories(category.id);
                const isExpanded =
                  expandedCategories.has(category.id) ||
                  tempFilters.categoryId === String(category.id);
                const isSelected =
                  tempFilters.categoryId === String(category.id);

                return (
                  <View key={category.id}>
                    <TouchableOpacity
                      style={[
                        styles.categoryItem,
                        isSelected && styles.categoryItemSelected,
                      ]}
                      onPress={() => selectCategory(String(category.id))}
                    >
                      <View style={styles.categoryItemContent}>
                        <Ionicons
                          name="folder"
                          size={20}
                          color={isSelected ? palette.surface : palette.primary}
                        />
                        <Text
                          style={[
                            styles.categoryItemText,
                            isSelected && styles.categoryItemTextSelected,
                          ]}
                        >
                          {category.name}
                        </Text>
                      </View>
                      <View style={styles.categoryItemRight}>
                        <Text
                          style={[
                            styles.categoryCount,
                            isSelected && styles.categoryCountSelected,
                          ]}
                        >
                          {getProductCount(category.id, true)}
                        </Text>
                        {subcats.length > 0 && (
                          <TouchableOpacity
                            onPress={() => toggleCategoryExpansion(category.id)}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={18}
                              color={
                                isSelected ? palette.surface : palette.textMuted
                              }
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Subcategorías */}
                    {isExpanded && subcats.length > 0 && (
                      <View style={styles.subcategoriesContainer}>
                        {/* Opción "Todas" en subcategorías */}
                        <TouchableOpacity
                          style={[
                            styles.subcategoryItem,
                            isSelected &&
                              !tempFilters.subcategoryId &&
                              styles.subcategoryItemSelected,
                          ]}
                          onPress={() => {
                            setTempFilters((prev) => ({
                              ...prev,
                              categoryId: String(category.id),
                              subcategoryId: "",
                            }));
                          }}
                        >
                          <Text
                            style={[
                              styles.subcategoryText,
                              isSelected &&
                                !tempFilters.subcategoryId &&
                                styles.subcategoryTextSelected,
                            ]}
                          >
                            Todas
                          </Text>
                        </TouchableOpacity>

                        {subcats.map((subcat) => {
                          const isSubSelected =
                            tempFilters.subcategoryId === String(subcat.id);
                          return (
                            <TouchableOpacity
                              key={subcat.id}
                              style={[
                                styles.subcategoryItem,
                                isSubSelected && styles.subcategoryItemSelected,
                              ]}
                              onPress={() =>
                                selectCategory(String(subcat.id), true)
                              }
                            >
                              <Text
                                style={[
                                  styles.subcategoryText,
                                  isSubSelected &&
                                    styles.subcategoryTextSelected,
                                ]}
                              >
                                {subcat.name}
                              </Text>
                              <Text
                                style={[
                                  styles.subcategoryCount,
                                  isSubSelected &&
                                    styles.subcategoryCountSelected,
                                ]}
                              >
                                {getProductCount(subcat.id)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Estado del producto */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Estado</Text>
              <View style={styles.conditionGrid}>
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[
                      styles.conditionChip,
                      tempFilters.condition === cond.id &&
                        styles.conditionChipSelected,
                    ]}
                    onPress={() =>
                      setTempFilters((prev) => ({
                        ...prev,
                        condition: cond.id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.conditionChipText,
                        tempFilters.condition === cond.id &&
                          styles.conditionChipTextSelected,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rango de precio */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Rango de Precio</Text>
              <View style={styles.priceRangeGrid}>
                {PRICE_RANGES.map((range) => {
                  const isSelected =
                    tempFilters.minPrice === range.min &&
                    tempFilters.maxPrice === range.max;
                  return (
                    <TouchableOpacity
                      key={range.id || "all"}
                      style={[
                        styles.priceRangeChip,
                        isSelected && styles.priceRangeChipSelected,
                      ]}
                      onPress={() =>
                        setTempFilters((prev) => ({
                          ...prev,
                          minPrice: range.min,
                          maxPrice: range.max,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.priceRangeChipText,
                          isSelected && styles.priceRangeChipTextSelected,
                        ]}
                      >
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Precio personalizado */}
              <Text style={styles.customPriceLabel}>
                O ingresa un rango personalizado:
              </Text>
              <View style={styles.customPriceRow}>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>Mín</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      value={tempFilters.minPrice}
                      onChangeText={(text) =>
                        setTempFilters((prev) => ({ ...prev, minPrice: text }))
                      }
                    />
                  </View>
                </View>
                <Text style={styles.priceDivider}>-</Text>
                <View style={styles.priceInputWrapper}>
                  <Text style={styles.priceInputLabel}>Máx</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="∞"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      value={tempFilters.maxPrice}
                      onChangeText={(text) =>
                        setTempFilters((prev) => ({ ...prev, maxPrice: text }))
                      }
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Ubicación */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Ubicación</Text>

              {tempFilters.locationCoords ? (
                <View style={styles.locationSelectedContainer}>
                  <View style={styles.locationSelectedInfo}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={palette.primary}
                    />
                    <View style={styles.locationTextContainer}>
                      <Text
                        style={styles.locationSelectedText}
                        numberOfLines={2}
                      >
                        {tempFilters.locationCoords.address}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.locationActions}>
                    <TouchableOpacity
                      style={styles.locationChangeButton}
                      onPress={() => setShowLocationPicker(true)}
                    >
                      <Ionicons
                        name="pencil"
                        size={16}
                        color={palette.primary}
                      />
                      <Text style={styles.locationChangeText}>Cambiar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.locationClearButton}
                      onPress={() =>
                        setTempFilters((prev) => ({
                          ...prev,
                          locationCoords: null,
                          location: "",
                        }))
                      }
                    >
                      <Ionicons
                        name="close-circle"
                        size={20}
                        color={palette.danger}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.locationPickerButton}
                  onPress={() => setShowLocationPicker(true)}
                >
                  <Ionicons
                    name="map-outline"
                    size={22}
                    color={palette.primary}
                  />
                  <Text style={styles.locationPickerButtonText}>
                    Seleccionar ubicación en mapa
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={palette.textMuted}
                  />
                </TouchableOpacity>
              )}

              {/* Radio de búsqueda */}
              {tempFilters.locationCoords && (
                <View style={styles.radiusContainer}>
                  <Text style={styles.radiusLabel}>Radio de búsqueda:</Text>
                  <View style={styles.radiusOptions}>
                    {[5, 10, 20, 50, 100].map((radius) => (
                      <TouchableOpacity
                        key={radius}
                        style={[
                          styles.radiusChip,
                          tempFilters.searchRadius === radius &&
                            styles.radiusChipSelected,
                        ]}
                        onPress={() =>
                          setTempFilters((prev) => ({
                            ...prev,
                            searchRadius: radius,
                          }))
                        }
                      >
                        <Text
                          style={[
                            styles.radiusChipText,
                            tempFilters.searchRadius === radius &&
                              styles.radiusChipTextSelected,
                          ]}
                        >
                          {radius} km
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={handleClearFilters}
            >
              <Ionicons name="refresh-outline" size={18} color={palette.text} />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApplyFilters}
            >
              <Ionicons name="checkmark" size={18} color={palette.surface} />
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* LocationPicker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={(location: LocationData) => {
          setTempFilters((prev) => ({
            ...prev,
            locationCoords: location,
            location: location.address,
          }));
          setShowLocationPicker(false);
        }}
        initialPosition={
          tempFilters.locationCoords
            ? {
                lat: tempFilters.locationCoords.lat,
                lng: tempFilters.locationCoords.lng,
              }
            : null
        }
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Explorar</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={openFilterModal}
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
                  <Ionicons name="warning" size={18} color={palette.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Active Filter Tags */}
              {getActiveFilterTags().length > 0 && (
                <View style={styles.activeFiltersContainer}>
                  <Text style={styles.activeFiltersTitle}>
                    Filtros activos:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.filterTagsScroll}
                  >
                    {getActiveFilterTags().map((tag) => (
                      <TouchableOpacity
                        key={tag.key}
                        style={styles.filterTag}
                        onPress={() => removeFilterTag(tag.key)}
                      >
                        <Text style={styles.filterTagText}>{tag.label}</Text>
                        <Ionicons
                          name="close"
                          size={14}
                          color={palette.surface}
                        />
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.clearAllButton}
                      onPress={() =>
                        setAppliedFilters({
                          minPrice: "",
                          maxPrice: "",
                          location: "",
                          locationCoords: null,
                          searchRadius: 10,
                          categoryId: "",
                          subcategoryId: "",
                          condition: "",
                        })
                      }
                    >
                      <Text style={styles.clearAllText}>Limpiar todo</Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

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
                      ? "Precio ↑"
                      : "Precio ↓"}
                  </Text>
                  <Ionicons
                    name="swap-vertical"
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
                  : "No hay productos disponibles"
              }
            />
          }
        />
      )}

      {renderFilterModal()}
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
  activeFiltersContainer: {
    backgroundColor: "#FFF7ED",
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },
  activeFiltersTitle: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: "#C2410C",
    marginBottom: spacing.sm,
  },
  filterTagsScroll: {
    flexDirection: "row",
  },
  filterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    gap: 4,
  },
  filterTagText: {
    color: palette.surface,
    fontSize: typography.caption,
    fontWeight: "500",
  },
  clearAllButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearAllText: {
    color: "#C2410C",
    fontSize: typography.caption,
    fontWeight: "600",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginVertical: spacing.md,
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
    color: palette.danger,
    flex: 1,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  modalTitle: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.text,
  },
  modalSubtitle: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  filterSection: {
    marginBottom: spacing.xl,
  },
  filterSectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.md,
  },
  categoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
    backgroundColor: palette.background,
    borderRadius: radius.lg,
    marginBottom: spacing.xs,
  },
  categoryItemSelected: {
    backgroundColor: palette.primary,
  },
  categoryItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryItemText: {
    fontSize: typography.body,
    fontWeight: "500",
    color: palette.text,
  },
  categoryItemTextSelected: {
    color: palette.surface,
  },
  categoryItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  categoryCount: {
    fontSize: typography.caption,
    color: palette.textMuted,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  categoryCountSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
    color: palette.surface,
  },
  subcategoriesContainer: {
    marginLeft: spacing.lg,
    paddingLeft: spacing.md,
    borderLeftWidth: 2,
    borderLeftColor: "#FDBA74",
    marginBottom: spacing.sm,
  },
  subcategoryItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: 2,
  },
  subcategoryItemSelected: {
    backgroundColor: "#FFF7ED",
  },
  subcategoryText: {
    fontSize: typography.body,
    color: palette.text,
  },
  subcategoryTextSelected: {
    color: palette.primary,
    fontWeight: "600",
  },
  subcategoryCount: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  subcategoryCountSelected: {
    color: palette.primary,
  },
  conditionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  conditionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
  },
  conditionChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  conditionChipText: {
    fontSize: typography.body,
    color: palette.text,
  },
  conditionChipTextSelected: {
    color: palette.surface,
    fontWeight: "600",
  },
  priceRangeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  priceRangeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
  },
  priceRangeChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  priceRangeChipText: {
    fontSize: typography.caption,
    color: palette.text,
  },
  priceRangeChipTextSelected: {
    color: palette.surface,
    fontWeight: "600",
  },
  customPriceLabel: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: spacing.sm,
  },
  customPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  priceInputWrapper: {
    flex: 1,
  },
  priceInputLabel: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: 4,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: typography.body,
    color: palette.textMuted,
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: palette.text,
  },
  priceDivider: {
    fontSize: typography.subtitle,
    color: palette.textMuted,
    paddingBottom: spacing.md,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  locationInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: palette.text,
  },
  // Location Picker Styles
  locationSelectedContainer: {
    backgroundColor: palette.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  locationSelectedInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationSelectedText: {
    fontSize: typography.body,
    color: palette.text,
    fontWeight: "500",
  },
  locationCoordsText: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  locationActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  locationChangeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    backgroundColor: "#FFF7ED",
    borderRadius: radius.md,
  },
  locationChangeText: {
    fontSize: typography.caption,
    color: palette.primary,
    fontWeight: "500",
  },
  locationClearButton: {
    padding: spacing.xs,
  },
  locationPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  locationPickerButtonText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body,
    color: palette.text,
  },
  radiusContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  radiusLabel: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: spacing.sm,
  },
  radiusOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  radiusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.border,
  },
  radiusChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  radiusChipText: {
    fontSize: typography.caption,
    color: palette.text,
  },
  radiusChipTextSelected: {
    color: palette.surface,
    fontWeight: "600",
  },
  locationOrText: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  modalFooter: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingBottom: spacing.xl,
  },
  clearButton: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    gap: spacing.xs,
  },
  clearButtonText: {
    color: palette.text,
    fontWeight: "600",
    fontSize: typography.body,
  },
  applyButton: {
    flex: 1,
    flexDirection: "row",
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: palette.primary,
    gap: spacing.xs,
  },
  applyButtonText: {
    color: palette.surface,
    fontWeight: "600",
    fontSize: typography.body,
  },
});
