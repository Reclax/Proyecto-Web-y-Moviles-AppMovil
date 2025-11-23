import EmptyState from "@/components/common/EmptyState";
import {
  authAPI,
  categoryAPI,
  conversationAPI,
  favoriteAPI,
  productAPI,
  userAPI,
} from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import {
  formatCurrency,
  getAbsoluteUrl,
  getProductGallery,
} from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const IMG_HEIGHT = width * 1.1;

const STATUS_COLORS: Record<string, string> = {
  active: "#16A34A",
  sold: "#6B7280",
  reserved: "#F97316",
  inactive: "#B91C1C",
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const productId = Number(id);

  const [product, setProduct] = useState<any>(null);
  const [categoryLabel, setCategoryLabel] = useState("Sin categoría");
  const [seller, setSeller] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [contacting, setContacting] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (!productId) return;
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productAPI.getById(productId);
      setProduct(data);

      if (data.categoryId) {
        try {
          const allCategories = await categoryAPI.getAll();
          const category = allCategories.find(
            (cat: any) => Number(cat.id) === Number(data.categoryId)
          );
          if (category) {
            setCategoryLabel(category.name);
          }
        } catch (catErr) {
          console.warn("No se pudieron cargar las categorías", catErr);
        }
      }

      if (data.sellerId) {
        try {
          const sellerData = await userAPI.getUserById(data.sellerId);
          setSeller(sellerData);
        } catch (sellerErr) {
          console.warn("No se pudo cargar el vendedor", sellerErr);
        }
      }

      if (await authAPI.isAuthenticated()) {
        try {
          const favoriteStatus = await favoriteAPI.isFavorite(productId);
          setIsFavorite(favoriteStatus);
        } catch (favErr) {
          console.warn("No se pudo verificar favoritos", favErr);
        }
      }
    } catch (err) {
      console.error("Error loading product detail", err);
      setError("No pudimos cargar este producto.");
    } finally {
      setLoading(false);
    }
  };

  const gallery = useMemo(() => {
    const normalized = getProductGallery(product);
    return normalized.length ? normalized : [null];
  }, [product]);

  const isSelfProduct = useMemo(() => {
    if (!user || !product) return false;
    return Number(user.id) === Number(product.sellerId);
  }, [user, product]);

  const statusLabel = useMemo(() => {
    switch (product?.status) {
      case "sold":
        return "Vendido";
      case "reserved":
        return "Reservado";
      case "inactive":
        return "Inactivo";
      default:
        return "Activo";
    }
  }, [product?.status]);

  const handleToggleFavorite = async () => {
    try {
      setFavoriteLoading(true);
      if (isFavorite) {
        await favoriteAPI.removeFavorite(productId);
        setIsFavorite(false);
      } else {
        await favoriteAPI.addFavorite(productId);
        setIsFavorite(true);
      }
    } catch (err) {
      Alert.alert("Ups", "No pudimos actualizar tus favoritos.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleContact = async () => {
    if (!product) return;
    try {
      setContacting(true);
      const conversation = await conversationAPI.createConversation(product.id);
      router.push(`/chat/${conversation.id}`);
    } catch (err) {
      console.error("Error creating conversation", err);
      router.push("/chat");
    } finally {
      setContacting(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;
    try {
      await Share.share({
        title: product.title,
        message: `${product.title} - ${formatCurrency(product.price)}`,
      });
    } catch (err) {
      console.warn("No se pudo compartir", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={palette.primary} />
        <Text style={styles.centeredText}>Cargando producto...</Text>
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="alert-circle"
          title={error || "Producto no disponible"}
          message="Intenta recargar o vuelve al listado."
        />
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={16} color={palette.surface} />
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Gallery Section */}
        <View style={styles.galleryWrapper}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const nextIndex = Math.round(
                event.nativeEvent.contentOffset.x /
                  event.nativeEvent.layoutMeasurement.width
              );
              setActiveImage(nextIndex);
            }}
          >
            {gallery.map((uri: string | null, idx: number) => (
              <View key={idx} style={styles.gallerySlide}>
                {uri && !imageErrors[idx] ? (
                  <Image
                    source={{ uri }}
                    style={styles.galleryImage}
                    onError={() =>
                      setImageErrors((prev) => ({ ...prev, [idx]: true }))
                    }
                  />
                ) : (
                  <View style={styles.galleryPlaceholder}>
                    <Ionicons name="cube" size={64} color={palette.primary} />
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.4)", "transparent", "transparent"]}
            style={[styles.headerGradient, { height: insets.top + 60 }]}
          />

          {/* Header Actions */}
          <View style={[styles.headerOverlay, { paddingTop: insets.top }]}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </TouchableOpacity>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={palette.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleToggleFavorite}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite ? palette.danger : palette.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Image Indicator */}
          {gallery.length > 1 && (
            <View style={styles.galleryIndicator}>
              <Text style={styles.galleryIndicatorText}>
                {activeImage + 1}/{gallery.length}
              </Text>
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.dragHandle} />

          <View style={styles.mainInfo}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{categoryLabel}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      STATUS_COLORS[product?.status || "active"] ||
                      STATUS_COLORS.active,
                  },
                ]}
              >
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>

            <Text style={styles.title}>{product.title}</Text>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={18}
                color={palette.textMuted}
              />
              <Text style={styles.locationText}>
                {product.location || "Ubicación no especificada"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>
              {product.description ||
                "El vendedor no ha añadido una descripción detallada para este producto."}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendedor</Text>
            <TouchableOpacity style={styles.sellerCard} activeOpacity={0.8}>
              <View style={styles.sellerInfo}>
                <View style={styles.avatar}>
                  {seller?.avatarUrl && !avatarError ? (
                    <Image
                      source={{
                        uri: getAbsoluteUrl(seller.avatarUrl) as string,
                      }}
                      style={styles.avatarImage}
                      onError={() => setAvatarError(true)}
                    />
                  ) : (
                    <Text style={styles.avatarInitial}>
                      {seller?.name?.[0]?.toUpperCase() || "S"}
                    </Text>
                  )}
                </View>
                <View style={styles.sellerText}>
                  <Text style={styles.sellerName}>
                    {seller
                      ? `${seller.name} ${seller.lastname || ""}`.trim()
                      : "Usuario verificado"}
                  </Text>
                  <View style={styles.sellerRating}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={styles.ratingText}>4.8 (12 ventas)</Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={palette.textMuted}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.safetyCard}>
            <View style={styles.safetyHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#15803D"
              />
              <Text style={styles.safetyTitle}>Compra segura</Text>
            </View>
            <Text style={styles.safetyText}>
              Reúnete siempre en lugares públicos y verifica el producto antes
              de realizar el pago.
            </Text>
          </View>
        </View>

        {/* Bottom Padding for ScrollView */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom ? insets.bottom : spacing.md },
        ]}
      >
        {isSelfProduct ? (
          <View style={styles.disabledAction}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={palette.textMuted}
            />
            <Text style={styles.disabledText}>Es tu producto</Text>
          </View>
        ) : (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleShare}
            >
              <Ionicons
                name="share-social-outline"
                size={24}
                color={palette.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                contacting && styles.disabledButton,
              ]}
              onPress={handleContact}
              disabled={contacting}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={20}
                color={palette.surface}
              />
              <Text style={styles.primaryButtonText}>
                {contacting ? "Iniciando..." : "Contactar Vendedor"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  scrollView: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.background,
    padding: spacing.lg,
  },
  centeredText: {
    marginTop: spacing.sm,
    color: palette.textMuted,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  backButtonText: {
    color: palette.surface,
    fontWeight: "600",
  },
  galleryWrapper: {
    width: "100%",
    height: IMG_HEIGHT,
    position: "relative",
    backgroundColor: "#F0F0F0",
  },
  gallerySlide: {
    width,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  galleryPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  galleryIndicator: {
    position: "absolute",
    bottom: spacing.xl + 20, // Adjusted for content overlap
    right: spacing.md,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  galleryIndicatorText: {
    color: palette.surface,
    fontWeight: "600",
    fontSize: 12,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: palette.background,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: spacing.lg,
  },
  mainInfo: {
    marginBottom: spacing.lg,
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusText: {
    color: palette.surface,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: palette.text,
    marginBottom: spacing.xs,
    lineHeight: 32,
  },
  price: {
    fontSize: 28,
    fontWeight: "900",
    color: palette.primary,
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationText: {
    color: palette.textMuted,
    fontSize: typography.body,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.body,
    color: "#4B5563",
    lineHeight: 24,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: palette.surface,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.primary,
  },
  sellerText: {
    gap: 2,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
  },
  sellerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: palette.textMuted,
    fontWeight: "500",
  },
  safetyCard: {
    backgroundColor: "#F0FDF4", // Green-50
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#DCFCE7",
  },
  safetyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D", // Green-700
  },
  safetyText: {
    fontSize: 12,
    color: "#166534", // Green-800
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    ...shadows.soft,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  secondaryButton: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: "#FFF5F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    height: 50,
    ...shadows.md,
  },
  primaryButtonText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  disabledAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "#F3F4F6",
  },
  disabledText: {
    color: palette.textMuted,
    fontWeight: "600",
  },
});
