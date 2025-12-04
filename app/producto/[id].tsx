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
import { palette, radius, shadows, spacing } from "@/theme";
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
      // URL de la web para compartir el producto
      const webUrl = process.env.EXPO_PUBLIC_API_URL;
      const productUrl = `${webUrl}/producto/${product.id}`;

      await Share.share({
        title: product.title,
        message: `¡Mira este producto!\n\n${product.title}\n${formatCurrency(
          product.price
        )}\n\n${productUrl}`,
        url: productUrl, // iOS usa esto para compartir links
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
        {/* Hero Gallery Section */}
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
                  <LinearGradient
                    colors={["#FFF5F0", "#FEECD7"]}
                    style={styles.galleryPlaceholder}
                  >
                    <View style={styles.placeholderIconContainer}>
                      <Ionicons
                        name="cube-outline"
                        size={80}
                        color={palette.primary}
                      />
                    </View>
                  </LinearGradient>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Top Gradient Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.2)", "transparent"]}
            style={[styles.headerGradient, { height: insets.top + 80 }]}
          />

          {/* Bottom Gradient for smooth transition */}
          <LinearGradient
            colors={[
              "transparent",
              "rgba(238,229,233,0.3)",
              palette.background,
            ]}
            style={styles.bottomGradient}
          />

          {/* Header Actions - Floating Pills Style */}
          <View
            style={[
              styles.headerOverlay,
              { paddingTop: insets.top + spacing.sm },
            ]}
          >
            <TouchableOpacity
              style={styles.backButtonPill}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="chevron-back" size={22} color={palette.text} />
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionPill}
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Ionicons name="share-outline" size={20} color={palette.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionPill,
                  isFavorite && styles.actionPillActive,
                ]}
                onPress={handleToggleFavorite}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavorite ? "heart" : "heart-outline"}
                  size={20}
                  color={isFavorite ? palette.surface : palette.text}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modern Dot Indicators */}
          {gallery.length > 1 && (
            <View style={styles.dotsContainer}>
              {gallery.map((_: string | null, idx: number) => (
                <View
                  key={idx}
                  style={[styles.dot, activeImage === idx && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          {/* Category & Status */}
          <View style={styles.tagsRow}>
            <View style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{categoryLabel}</Text>
            </View>
            <View
              style={[
                styles.statusTag,
                { backgroundColor: STATUS_COLORS[product?.status || "active"] },
              ]}
            >
              <Text style={styles.statusTagText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.productTitle}>{product.title}</Text>

          {/* Price */}
          <Text style={styles.productPrice}>
            {formatCurrency(product.price)}
          </Text>

          {/* Location */}
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

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.descriptionText}>
              {product.description ||
                "El vendedor no ha añadido una descripción detallada para este producto."}
            </Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Seller */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vendedor</Text>
            <View style={styles.sellerCard}>
              <View style={styles.sellerAvatarContainer}>
                {seller?.avatarUrl && !avatarError ? (
                  <Image
                    source={{ uri: getAbsoluteUrl(seller.avatarUrl) as string }}
                    style={styles.sellerAvatar}
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <View style={styles.sellerAvatarPlaceholder}>
                    <Text style={styles.sellerInitial}>
                      {seller?.name?.[0]?.toUpperCase() || "V"}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>
                  {seller
                    ? `${seller.name} ${seller.lastname || ""}`.trim()
                    : "Usuario"}
                </Text>
                <View style={styles.sellerRating}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={styles.ratingText}>4.8 (12 ventas)</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Safety Tips */}
          <View style={styles.safetyCard}>
            <View style={styles.safetyIconContainer}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#15803D"
              />
            </View>
            <View style={styles.safetyContent}>
              <Text style={styles.safetyTitle}>Compra segura</Text>
              <Text style={styles.safetyText}>
                Reúnete en lugares públicos y verifica el producto antes de
                pagar.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom || spacing.md },
        ]}
      >
        {isSelfProduct ? (
          <View style={styles.ownProductBanner}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={palette.textMuted}
            />
            <Text style={styles.ownProductText}>Este es tu producto</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShare}
              activeOpacity={0.8}
            >
              <Ionicons
                name="share-social-outline"
                size={22}
                color={palette.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.contactButton,
                contacting && styles.contactButtonDisabled,
              ]}
              onPress={handleContact}
              disabled={contacting}
              activeOpacity={0.9}
            >
              <Ionicons
                name="chatbubbles-outline"
                size={20}
                color={palette.surface}
              />
              <Text style={styles.contactButtonText}>
                {contacting ? "Conectando..." : "Contactar Vendedor"}
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

  // Gallery
  galleryWrapper: {
    width: "100%",
    height: IMG_HEIGHT,
    position: "relative",
    backgroundColor: "#F5F5F5",
  },
  gallerySlide: {
    width,
    height: "100%",
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
    backgroundColor: "#F5F5F5",
  },
  placeholderIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(207, 92, 54, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  headerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  backButtonPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  actionPillActive: {
    backgroundColor: palette.danger,
  },
  dotsContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
  },
  dotActive: {
    width: 24,
    backgroundColor: palette.surface,
  },

  // Content
  contentContainer: {
    flex: 1,
    backgroundColor: palette.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },

  // Tags
  tagsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  categoryTag: {
    backgroundColor: palette.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.textMuted,
  },
  statusTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  statusTagText: {
    color: palette.surface,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },

  // Product Info
  productTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.text,
    lineHeight: 30,
    marginBottom: spacing.xs,
  },
  productPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.primary,
    marginBottom: spacing.md,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: 14,
    color: palette.textMuted,
    fontWeight: "500",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: palette.border,
    marginBottom: spacing.lg,
  },

  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 24,
  },

  // Seller Card
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  sellerAvatarContainer: {
    marginRight: spacing.md,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sellerAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sellerInitial: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.surface,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.text,
    marginBottom: 4,
  },
  sellerRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    color: palette.textMuted,
    fontWeight: "500",
  },

  // Safety Card
  safetyCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  safetyIconContainer: {
    marginTop: 2,
  },
  safetyContent: {
    flex: 1,
  },
  safetyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803D",
    marginBottom: 2,
  },
  safetyText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.surface,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    ...shadows.soft,
  },
  ownProductBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: palette.muted,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  ownProductText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  shareButton: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: "#FFF5F0",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FEECD7",
  },
  contactButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: palette.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    ...shadows.md,
  },
  contactButtonDisabled: {
    opacity: 0.7,
  },
  contactButtonText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: 16,
  },
});
