import { palette, radius, spacing } from "@/theme";
import { formatCurrency, getProductCover } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export interface ProductCardProps {
  product: any;
  isFavorite?: boolean;
  onPress?: () => void;
  onToggleFavorite?: () => void;
  showBadges?: boolean;
}

export function ProductCard({
  product,
  onPress,
  isFavorite,
  onToggleFavorite,
  showBadges = false,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const cover = getProductCover(product);
  const isNew = product?.isNew; // Assuming backend sends this
  const isVerified = product?.User?.isVerified; // Assuming backend sends this

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.92}
    >
      <View style={styles.imageWrapper}>
        {cover && !imageError ? (
          <Image
            source={{ uri: cover }}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <LinearGradient
            colors={[palette.muted, "#e0e0e0"]}
            style={styles.placeholder}
          >
            <Ionicons name="cube-outline" size={32} color={palette.textMuted} />
          </LinearGradient>
        )}

        {/* Badges */}
        {showBadges && (
          <View style={styles.badgesContainer}>
            {isNew && (
              <LinearGradient
                colors={[palette.success, "#43A047"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.badge]}
              >
                <Ionicons name="sparkles" size={10} color={palette.surface} />
                <Text style={styles.badgeText}>NUEVO</Text>
              </LinearGradient>
            )}
            {isVerified && (
              <View style={[styles.badge, styles.badgeVerified]}>
                <Ionicons
                  name="checkmark-circle"
                  size={10}
                  color={palette.surface}
                />
                <Text style={styles.badgeText}>VERIFICADO</Text>
              </View>
            )}
          </View>
        )}

        {typeof isFavorite === "boolean" && onToggleFavorite ? (
          <TouchableOpacity style={styles.favorite} onPress={onToggleFavorite}>
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={18}
              color={isFavorite ? palette.danger : palette.surface}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {product?.title}
        </Text>
        <Text style={styles.price}>{formatCurrency(product?.price)}</Text>
        <View style={styles.metaRow}>
          <Ionicons
            name="location-outline"
            size={12}
            color={palette.textMuted}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {product?.location || "Sin ubicación"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "48%", // 2 columns with gap
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: palette.muted,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  favorite: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badgesContainer: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    gap: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  badgeVerified: {
    backgroundColor: "#3B82F6", // Blue
  },
  badgeText: {
    color: palette.surface,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  info: {
    padding: spacing.sm,
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: palette.text,
    lineHeight: 18,
  },
  price: {
    fontSize: 15,
    fontWeight: "800",
    color: palette.primary,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  metaText: {
    fontSize: 11,
    color: palette.textMuted,
    flex: 1,
  },
});

export default ProductCard;
