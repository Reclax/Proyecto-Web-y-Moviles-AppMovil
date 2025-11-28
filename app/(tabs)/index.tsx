import ProductCard from "@/components/catalog/ProductCard";
import SectionHeader from "@/components/common/SectionHeader";
import { useFavorites } from "@/hooks/useFavorites";
import { categoryAPI, productAPI } from "@/services/api";
import { gradients, palette, radius, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FEATURES = [
  {
    icon: "shield-checkmark",
    title: "Seguro",
    copy: "Usuarios verificados y pagos protegidos.",
  },
  {
    icon: "location",
    title: "Cercano",
    copy: "Conecta con vendedores cerca de ti.",
  },
  { icon: "flash", title: "Rápido", copy: "Publica y vende en minutos." },
];

const QUICK_STATS = [
  { label: "Usuarios", value: "250k+" },
  { label: "Productos", value: "1.2M+" },
  { label: "Satisfacción", value: "98%" },
];

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { favoriteIds, toggleFavorite, refetch } = useFavorites(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productAPI.getAll(),
        categoryAPI.getAll(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await refetch();
    setRefreshing(false);
  };

  const featuredProducts = useMemo(() => products.slice(0, 6), [products]);
  const mainCategories = useMemo(() => categories.slice(0, 6), [categories]);

  // Debug log for favorites
  useEffect(() => {
    if (featuredProducts.length > 0) {
      console.log('[HomeScreen] favoriteIds:', Array.from(favoriteIds));
      console.log('[HomeScreen] Product IDs:', featuredProducts.map(p => p.id));
      featuredProducts.forEach(p => {
        console.log(`[HomeScreen] Product ${p.id} isFavorite:`, favoriteIds.has(p.id));
      });
    }
  }, [favoriteIds, featuredProducts]);

  const handleFavorite = async (id: number) => {
    try {
      await toggleFavorite(id);
    } catch (error) {
      Alert.alert("Ups", "No pudimos actualizar tus favoritos.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
            progressViewOffset={insets.top + 20}
          />
        }
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient
          colors={gradients.hero as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 20 }]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.heroBadgeContainer}>
              <Text style={styles.heroBadge}>+50.000 panas activos</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Encuentra cosas {"\n"}
            <Text style={styles.heroHighlight}>chéveres cerca de ti</Text>
          </Text>
          <Text style={styles.heroCopy}>
            Compra y vende productos de segunda mano con la misma experiencia
            del sitio web.
          </Text>

          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => router.push("/productos")}
            activeOpacity={0.9}
          >
            <Ionicons name="search" size={20} color={palette.primary} />
            <Text style={styles.searchPlaceholder}>Buscar productos...</Text>
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.cta, styles.primaryCta]}
              onPress={() => router.push("/productos")}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[palette.primary, "#E67E22"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Ionicons name="rocket" size={20} color={palette.surface} />
                <Text style={styles.ctaLabel}>Explorar</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cta, styles.secondaryCta]}
              onPress={() => router.push("/vender")}
              activeOpacity={0.8}
            >
              <Ionicons name="pricetag" size={20} color={palette.text} />
              <Text style={[styles.ctaLabel, styles.secondaryCtaLabel]}>
                Vender
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {QUICK_STATS.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <SectionHeader
            title="Categorías populares"
            subtitle="Explora lo que más se vende"
            actionLabel="Ver todas"
            onActionPress={() => router.push("/categorias")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScroll}
          >
            {mainCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                activeOpacity={0.85}
                onPress={() =>
                  router.push(`/productos?categoryId=${category.id}`)
                }
              >
                <LinearGradient
                  colors={["#ffffff", "#f8f9fa"]}
                  style={styles.categoryGradient}
                >
                  <View style={styles.categoryIconPlaceholder}>
                    <Text style={styles.categoryInitial}>
                      {category.name.charAt(0)}
                    </Text>
                  </View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="¿Por qué Shop&Buy?"
            subtitle="Tu marketplace de confianza"
          />
          <View style={styles.featuresGrid}>
            {FEATURES.map((feature) => (
              <View key={feature.title} style={styles.featureCard}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={feature.icon as any}
                    size={24}
                    color={palette.primary}
                  />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureCopy}>{feature.copy}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="Destacados"
            subtitle="Lo más buscado esta semana"
            actionLabel="Ver todo"
            onActionPress={() => router.push("/productos")}
          />
          <View style={styles.productsGrid}>
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.has(Number(product.id))}
                onPress={() => router.push(`/producto/${product.id}`)}
                onToggleFavorite={() => handleFavorite(product.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroHeader: {
    marginBottom: spacing.sm,
  },
  heroBadgeContainer: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: radius.full,
    padding: 4,
  },
  heroBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: "#FFEDE2",
    borderRadius: radius.md,
    fontSize: typography.caption,
    fontWeight: "700",
    color: palette.primary,
    overflow: "hidden",
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: palette.text,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  heroHighlight: {
    color: palette.primary,
  },
  heroCopy: {
    marginTop: spacing.sm,
    fontSize: typography.body,
    color: palette.textMuted,
    lineHeight: 22,
    maxWidth: "90%",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchPlaceholder: {
    color: palette.textMuted,
    fontSize: typography.body,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cta: {
    flex: 1,
    borderRadius: radius.full,
    overflow: "hidden",
    elevation: 2,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: spacing.xs,
  },
  primaryCta: {
    // handled by gradient
  },
  secondaryCta: {
    backgroundColor: palette.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "#eee",
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  ctaLabel: {
    fontWeight: "700",
    fontSize: typography.body,
    color: palette.surface,
  },
  secondaryCtaLabel: {
    color: palette.text,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.text,
  },
  statLabel: {
    marginTop: 4,
    fontSize: typography.caption,
    color: palette.textMuted,
    fontWeight: "500",
  },
  section: {
    paddingTop: spacing.xl,
  },
  categoriesScroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  categoryCard: {
    marginRight: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryGradient: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 100,
  },
  categoryIconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0E6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  categoryInitial: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.primary,
  },
  categoryName: {
    fontWeight: "600",
    color: palette.text,
    fontSize: 13,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  featureCard: {
    width: "30%",
    flexGrow: 1,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  featureTitle: {
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
    fontSize: 13,
    textAlign: "center",
  },
  featureCopy: {
    color: palette.textMuted,
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
});
