import SectionHeader from "@/components/common/SectionHeader";
import { categoryAPI } from "@/services/api";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Electrónica: "phone-portrait-outline",
  Moda: "shirt-outline",
  "Hogar y muebles": "home-outline",
  Deportes: "trophy-outline",
  Vehículos: "car-outline",
  Gaming: "game-controller-outline",
};

const TRENDING_CATEGORIES = [
  { name: "Celulares iPhone", count: 2345 },
  { name: "Laptops Gaming", count: 1890 },
  { name: "Muebles de Sala", count: 1567 },
  { name: "Bicicletas", count: 1234 },
  { name: "PlayStation", count: 1123 },
];

export default function CategoriasScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getMain();

      // Map icons
      const mapped = data.map((cat: any) => ({
        ...cat,
        icon: CATEGORY_ICONS[cat.name] || "grid-outline",
      }));

      setCategories(mapped);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Categorías</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Ionicons name="trending-up" size={16} color={palette.primary} />
            <Text style={styles.badgeText}>EXPLORA POR CATEGORÍA</Text>
          </View>
          <Text style={styles.heroTitle}>
            Todas las{"\n"}
            <Text style={styles.heroHighlight}>categorías</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            Encuentra exactamente lo que buscas navegando por nuestras
            categorías populares
          </Text>
        </View>

        {/* Main Categories Grid */}
        <View style={styles.gridContainer}>
          {loading ? (
            <ActivityIndicator
              size="large"
              color={palette.primary}
              style={{ marginTop: spacing.xl }}
            />
          ) : (
            categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                activeOpacity={0.9}
                onPress={() =>
                  router.push(`/productos?categoryId=${category.id}`)
                }
              >
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name={category.icon}
                      size={28}
                      color={palette.primary}
                    />
                  </View>
                  <View style={styles.cardTextContent}>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryDesc} numberOfLines={2}>
                      {category.description ||
                        "Explora productos en esta categoría"}
                    </Text>
                  </View>
                </View>

                {category.subcategories &&
                  category.subcategories.length > 0 && (
                    <View style={styles.subcategoriesContainer}>
                      {category.subcategories.slice(0, 3).map((sub: any) => (
                        <View key={sub.id} style={styles.subcategoryChip}>
                          <Text style={styles.subcategoryText}>{sub.name}</Text>
                        </View>
                      ))}
                      {category.subcategories.length > 3 && (
                        <Text style={styles.moreText}>
                          +{category.subcategories.length - 3}
                        </Text>
                      )}
                    </View>
                  )}

                <View style={styles.cardFooter}>
                  <Text style={styles.viewLink}>Ver productos</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={palette.primary}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Trending Section */}
        <View style={styles.section}>
          <SectionHeader
            title="🔥 Más buscadas"
            subtitle="Tendencias de la semana"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.trendingScroll}
          >
            {TRENDING_CATEGORIES.map((cat, index) => (
              <TouchableOpacity
                key={index}
                style={styles.trendingCard}
                onPress={() =>
                  router.push(
                    `/productos?search=${encodeURIComponent(cat.name)}`
                  )
                }
              >
                <Text style={styles.trendingName}>{cat.name}</Text>
                <Text style={styles.trendingCount}>{cat.count} productos</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* CTA Section */}
        <View style={styles.ctaSection}>
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>¿No encuentras lo que buscas?</Text>
            <Text style={styles.ctaText}>
              Publica tu producto de forma gratuita y llega a miles de
              compradores
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => router.push("/vender")}
            >
              <Text style={styles.ctaButtonText}>Publicar gratis</Text>
              <Ionicons name="arrow-forward" size={20} color={palette.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
  },
  hero: {
    padding: spacing.xl,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F2",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  badgeText: {
    color: palette.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: palette.text,
    textAlign: "center",
    marginBottom: spacing.sm,
    lineHeight: 36,
  },
  heroHighlight: {
    color: palette.primary,
  },
  heroSubtitle: {
    fontSize: typography.body,
    color: palette.textMuted,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
  },
  gridContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: "#FFF5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextContent: {
    flex: 1,
    justifyContent: "center",
  },
  categoryName: {
    fontSize: typography.subtitle,
    fontWeight: "800",
    color: palette.text,
    marginBottom: 4,
  },
  categoryDesc: {
    fontSize: typography.caption,
    color: palette.textMuted,
    lineHeight: 18,
  },
  subcategoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  subcategoryChip: {
    backgroundColor: palette.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  subcategoryText: {
    fontSize: 11,
    color: palette.textMuted,
    fontWeight: "500",
  },
  moreText: {
    fontSize: 11,
    color: palette.textMuted,
    alignSelf: "center",
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  viewLink: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: palette.primary,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  trendingScroll: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  trendingCard: {
    backgroundColor: "#FFFBEB", // Yellow-50
    padding: spacing.md,
    borderRadius: radius.lg,
    minWidth: 140,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FEF3C7", // Yellow-100
  },
  trendingName: {
    fontSize: typography.body,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
    textAlign: "center",
  },
  trendingCount: {
    fontSize: 10,
    color: palette.textMuted,
  },
  ctaSection: {
    padding: spacing.lg,
    marginTop: spacing.lg,
  },
  ctaCard: {
    backgroundColor: palette.primary, // Using primary color for gradient effect simulation
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.surface,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  ctaText: {
    fontSize: typography.body,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    ...shadows.md,
  },
  ctaButtonText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: typography.body,
  },
});
