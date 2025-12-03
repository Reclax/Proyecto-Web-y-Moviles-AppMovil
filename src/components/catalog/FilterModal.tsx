import { categoryAPI } from "@/services/api";
import { palette, radius, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface Category {
  id: number;
  name: string;
  parentId: number | null;
}

interface Filters {
  minPrice: string;
  maxPrice: string;
  location: string;
  categoryId: string;
  subcategoryId: string;
  condition: string;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: Filters) => void;
  initialFilters: Partial<Filters>;
}

const CONDITIONS = [
  { id: "", label: "Todos" },
  { id: "new", label: "Nuevo" },
  { id: "like_new", label: "Como nuevo" },
  { id: "good", label: "Buen estado" },
  { id: "fair", label: "Aceptable" },
];

export function FilterModal({
  visible,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [minPrice, setMinPrice] = useState(initialFilters.minPrice || "");
  const [maxPrice, setMaxPrice] = useState(initialFilters.maxPrice || "");
  const [location, setLocation] = useState(initialFilters.location || "");
  const [categoryId, setCategoryId] = useState(initialFilters.categoryId || "");
  const [subcategoryId, setSubcategoryId] = useState(
    initialFilters.subcategoryId || ""
  );
  const [condition, setCondition] = useState(initialFilters.condition || "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Cargar categorías
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const data = await categoryAPI.getAll();
        setCategories(data);
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    if (visible) {
      loadCategories();
    }
  }, [visible]);

  // Categorías principales (sin parent)
  const mainCategories = useMemo(() => {
    return categories.filter((cat) => cat.parentId === null);
  }, [categories]);

  // Subcategorías de la categoría seleccionada
  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return categories.filter((cat) => cat.parentId === parseInt(categoryId));
  }, [categories, categoryId]);

  // Actualizar filtros cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setMinPrice(initialFilters.minPrice || "");
      setMaxPrice(initialFilters.maxPrice || "");
      setLocation(initialFilters.location || "");
      setCategoryId(initialFilters.categoryId || "");
      setSubcategoryId(initialFilters.subcategoryId || "");
      setCondition(initialFilters.condition || "");
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({
      minPrice,
      maxPrice,
      location,
      categoryId,
      subcategoryId,
      condition,
    });
    onClose();
  };

  const handleClear = () => {
    setMinPrice("");
    setMaxPrice("");
    setLocation("");
    setCategoryId("");
    setSubcategoryId("");
    setCondition("");
  };

  // Contar filtros activos
  const activeFiltersCount = [
    minPrice,
    maxPrice,
    location,
    categoryId,
    subcategoryId,
    condition,
  ].filter(Boolean).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Filtrar Productos</Text>
              {activeFiltersCount > 0 && (
                <Text style={styles.filterCount}>
                  {activeFiltersCount} filtro{activeFiltersCount > 1 ? "s" : ""}{" "}
                  activo{activeFiltersCount > 1 ? "s" : ""}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Categoría Principal */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Categoría</Text>
              {loadingCategories ? (
                <ActivityIndicator
                  size="small"
                  color={palette.primary}
                  style={styles.loader}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      categoryId === "" && styles.chipSelected,
                    ]}
                    onPress={() => {
                      setCategoryId("");
                      setSubcategoryId("");
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        categoryId === "" && styles.chipTextSelected,
                      ]}
                    >
                      Todas
                    </Text>
                  </TouchableOpacity>
                  {mainCategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        categoryId === String(cat.id) && styles.chipSelected,
                      ]}
                      onPress={() => {
                        setCategoryId(String(cat.id));
                        setSubcategoryId("");
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          categoryId === String(cat.id) &&
                            styles.chipTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Subcategoría */}
            {subcategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Subcategoría</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.chipsContainer}
                >
                  <TouchableOpacity
                    style={[
                      styles.chip,
                      subcategoryId === "" && styles.chipSelected,
                    ]}
                    onPress={() => setSubcategoryId("")}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        subcategoryId === "" && styles.chipTextSelected,
                      ]}
                    >
                      Todas
                    </Text>
                  </TouchableOpacity>
                  {subcategories.map((cat) => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.chip,
                        subcategoryId === String(cat.id) && styles.chipSelected,
                      ]}
                      onPress={() => setSubcategoryId(String(cat.id))}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          subcategoryId === String(cat.id) &&
                            styles.chipTextSelected,
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Estado del producto */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado del producto</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsContainer}
              >
                {CONDITIONS.map((cond) => (
                  <TouchableOpacity
                    key={cond.id}
                    style={[
                      styles.chip,
                      condition === cond.id && styles.chipSelected,
                    ]}
                    onPress={() => setCondition(cond.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        condition === cond.id && styles.chipTextSelected,
                      ]}
                    >
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Rango de precio */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Rango de Precio</Text>
              <View style={styles.row}>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Mínimo</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="0"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      value={minPrice}
                      onChangeText={setMinPrice}
                    />
                  </View>
                </View>
                <View style={styles.inputDivider}>
                  <Text style={styles.inputDividerText}>-</Text>
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.label}>Máximo</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>$</Text>
                    <TextInput
                      style={styles.priceInput}
                      placeholder="∞"
                      placeholderTextColor={palette.textMuted}
                      keyboardType="numeric"
                      value={maxPrice}
                      onChangeText={setMaxPrice}
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Ubicación */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>
              <View style={styles.locationInputContainer}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={palette.textMuted}
                  style={styles.locationIcon}
                />
                <TextInput
                  style={styles.locationInput}
                  placeholder="Ej. Quito, Guayaquil, Lima..."
                  placeholderTextColor={palette.textMuted}
                  value={location}
                  onChangeText={setLocation}
                />
                {location.length > 0 && (
                  <TouchableOpacity onPress={() => setLocation("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={palette.textMuted}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
              <Ionicons
                name="refresh-outline"
                size={18}
                color={palette.text}
                style={styles.buttonIcon}
              />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Ionicons
                name="checkmark"
                size={18}
                color={palette.surface}
                style={styles.buttonIcon}
              />
              <Text style={styles.applyButtonText}>Aplicar Filtros</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "85%",
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.text,
  },
  filterCount: {
    fontSize: typography.caption,
    color: palette.primary,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: "600",
    color: palette.text,
    marginBottom: spacing.sm,
  },
  loader: {
    paddingVertical: spacing.md,
  },
  chipsContainer: {
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: typography.body,
    color: palette.text,
  },
  chipTextSelected: {
    color: palette.surface,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
  },
  label: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: spacing.xs,
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
  inputDivider: {
    paddingBottom: spacing.md,
  },
  inputDividerText: {
    fontSize: typography.subtitle,
    color: palette.textMuted,
  },
  locationInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  locationIcon: {
    marginRight: spacing.sm,
  },
  locationInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: palette.text,
  },
  footer: {
    flexDirection: "row",
    padding: spacing.lg,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
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
  },
  buttonIcon: {
    marginRight: spacing.xs,
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
  },
  applyButtonText: {
    color: palette.surface,
    fontWeight: "600",
    fontSize: typography.body,
  },
});
