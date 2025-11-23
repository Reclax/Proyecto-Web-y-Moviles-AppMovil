import EmptyState from "@/components/common/EmptyState";
import { productAPI } from "@/services/api";
import { palette, radius, spacing, typography } from "@/theme";
import { formatCurrency, getProductCover } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MisProductosScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productAPI.getMyProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading my products", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleDelete = (productId: number) => {
    Alert.alert("Eliminar producto", "¿Deseas eliminar esta publicación?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await productAPI.deleteProduct(productId);
            await loadProducts();
          } catch (error) {
            Alert.alert("No se pudo eliminar el producto");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis productos</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push("/vender")}
        >
          <Ionicons name="add" size={18} color={palette.surface} />
          <Text style={styles.newButtonText}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const cover = getProductCover(item);
          const statusLabel =
            item.status === "sold"
              ? "Vendido"
              : item.status === "reserved"
              ? "Reservado"
              : "Publicado";
          const hasError = failedImages.has(item.id);
          return (
            <View style={styles.productCard}>
              <View style={styles.productRow}>
                <View style={styles.imageWrapper}>
                  {cover && !hasError ? (
                    <Image
                      source={{ uri: cover }}
                      style={styles.image}
                      onError={() =>
                        setFailedImages((prev) => new Set(prev).add(item.id))
                      }
                    />
                  ) : (
                    <Ionicons
                      name="cube-outline"
                      size={32}
                      color={palette.primary}
                    />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.productPrice}>
                    {formatCurrency(item.price)}
                  </Text>
                  <Text style={styles.productStatus}>{statusLabel}</Text>
                </View>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => router.push(`/producto/${item.id}`)}
                >
                  <Text style={styles.viewButtonText}>Ver</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => router.push(`/producto/editar/${item.id}`)}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color={palette.primary}
                  />
                  <Text style={styles.editButtonText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item.id)}
                >
                  <Ionicons name="trash" size={16} color={palette.surface} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              icon="briefcase-outline"
              title="Aún no publicas"
              message="Crea tu primer anuncio desde el botón Nuevo."
            />
          )
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
    paddingTop: spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
  },
  newButton: {
    backgroundColor: palette.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
  },
  newButtonText: {
    color: palette.surface,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.lg,
  },
  productCard: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...{
      shadowColor: "#00000010",
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
  },
  productRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  imageWrapper: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    backgroundColor: palette.muted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  productTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
  },
  productPrice: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.primary,
  },
  productStatus: {
    marginTop: spacing.xs,
    color: palette.textMuted,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.md,
  },
  viewButton: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginRight: spacing.sm,
  },
  viewButtonText: {
    fontWeight: "600",
    color: palette.text,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    borderRadius: radius.lg,
    backgroundColor: "#FFF5F2",
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  editButtonText: {
    fontWeight: "600",
    color: palette.primary,
  },
  deleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.danger,
    alignItems: "center",
    justifyContent: "center",
  },
});
