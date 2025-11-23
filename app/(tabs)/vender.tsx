import { categoryAPI, productAPI, userAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FormData {
  title: string;
  description: string;
  price: string;
  location: string;
  categoryId: string;
}

export default function VenderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    location: "",
    categoryId: "",
  });
  const [photos, setPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoryAPI.getAll();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    Alert.alert("Fotos del producto", "Selecciona una opción", [
      {
        text: "Cámara",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permiso denegado", "Necesitamos acceso a tu cámara.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: false,
            quality: 0.8,
          });

          if (!result.canceled) {
            if (photos.length + result.assets.length > 10) {
              Alert.alert(
                "Límite alcanzado",
                "Solo puedes subir hasta 10 fotos."
              );
              return;
            }
            setPhotos([...photos, ...result.assets]);
          }
        },
      },
      {
        text: "Galería",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería.");
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsMultipleSelection: true,
            aspect: [4, 3],
            quality: 0.8,
          });

          if (!result.canceled) {
            if (photos.length + result.assets.length > 10) {
              Alert.alert(
                "Límite alcanzado",
                "Solo puedes subir hasta 10 fotos."
              );
              return;
            }
            setPhotos([...photos, ...result.assets]);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.categoryId) {
      Alert.alert(
        "Campos requeridos",
        "Por favor completa título, precio y categoría."
      );
      return;
    }

    if (photos.length === 0) {
      Alert.alert("Faltan fotos", "Añade al menos una foto de tu producto.");
      return;
    }

    let sellerId = user?.id;

    if (!sellerId) {
      try {
        const userData = await userAPI.refreshUserData();
        if (userData?.id) {
          sellerId = userData.id;
          useAuthStore.getState().setUser(userData);
        } else {
          Alert.alert(
            "Error de sesión",
            "No se pudo identificar al usuario. Por favor inicia sesión nuevamente."
          );
          return;
        }
      } catch (error) {
        Alert.alert("Error", "Ocurrió un problema al verificar tu sesión.");
        return;
      }
    }

    try {
      setSubmitting(true);

      const photoFiles = photos.map((photo, index) => {
        // Intentar obtener el nombre y tipo del archivo original
        const filename =
          photo.fileName || photo.uri.split("/").pop() || `photo_${index}.jpg`;

        // Inferir tipo si no existe mimeType
        let type = photo.mimeType;
        if (!type) {
          const match = /\.(\w+)$/.exec(filename);
          type = match ? `image/${match[1]}` : "image/jpeg";
        }

        return {
          uri: photo.uri,
          type: type,
          name: filename,
        };
      });

      const productPayload = {
        sellerId: sellerId,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        location: formData.location,
        categoryId: parseInt(formData.categoryId),
        locationCoords: { lat: 0, lng: 0 },
      };

      console.log(
        "Creating product with payload:",
        JSON.stringify(productPayload)
      );

      await productAPI.createWithPhotos(productPayload, photoFiles);

      Alert.alert(
        "¡Producto publicado!",
        "Tu producto ha sido creado exitosamente.",
        [
          {
            text: "OK",
            onPress: () => {
              setFormData({
                title: "",
                description: "",
                price: "",
                location: "",
                categoryId: "",
              });
              setPhotos([]);
              router.push("/(tabs)/productos");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("Error creating product:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Error desconocido";
      Alert.alert("Error", `No se pudo crear el producto: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vender</Text>
        <Text style={styles.headerSubtitle}>Publica tu producto gratis</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Photos Section */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Fotos del producto <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.photosScroll}
            >
              <TouchableOpacity
                style={styles.addPhotoButton}
                onPress={pickImages}
              >
                <Ionicons
                  name="camera-outline"
                  size={32}
                  color={palette.primary}
                />
                <Text style={styles.addPhotoText}>Agregar</Text>
              </TouchableOpacity>

              {photos.map((photo, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoThumbnail}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Ionicons name="close" size={12} color={palette.surface} />
                  </TouchableOpacity>
                  {index === 0 && (
                    <View style={styles.mainBadge}>
                      <Text style={styles.mainBadgeText}>Principal</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
            <Text style={styles.helperText}>
              Añade hasta 10 fotos. La primera será la portada.
            </Text>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Título <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: iPhone 13 Pro Max 128GB"
              placeholderTextColor={palette.textMuted}
              value={formData.title}
              onChangeText={(text) => setFormData({ ...formData, title: text })}
            />
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Precio (USD) <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.priceInputWrapper}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                placeholder="0.00"
                placeholderTextColor={palette.textMuted}
                keyboardType="decimal-pad"
                value={formData.price}
                onChangeText={(text) =>
                  setFormData({ ...formData, price: text })
                }
              />
            </View>
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Categoría <Text style={styles.required}>*</Text>
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    formData.categoryId === category.id.toString() &&
                      styles.categoryChipSelected,
                  ]}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      categoryId: category.id.toString(),
                    })
                  }
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formData.categoryId === category.id.toString() &&
                        styles.categoryChipTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe los detalles, estado y características..."
              placeholderTextColor={palette.textMuted}
              multiline
              numberOfLines={4}
              value={formData.description}
              onChangeText={(text) =>
                setFormData({ ...formData, description: text })
              }
            />
          </View>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.label}>Ubicación</Text>
            <View style={styles.inputWithIcon}>
              <Ionicons
                name="location-outline"
                size={20}
                color={palette.textMuted}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputPladded]}
                placeholder="Ej: Quito, Norte"
                placeholderTextColor={palette.textMuted}
                value={formData.location}
                onChangeText={(text) =>
                  setFormData({ ...formData, location: text })
                }
              />
            </View>
          </View>

          {/* Tips Section */}
          <View style={styles.tipsContainer}>
            <Text style={styles.tipsTitle}>💡 Tips para vender rápido:</Text>
            <View style={styles.tipItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={palette.success}
              />
              <Text style={styles.tipText}>
                Usa fotos claras y con buena luz
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={palette.success}
              />
              <Text style={styles.tipText}>
                Describe detalladamente el estado
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={palette.success}
              />
              <Text style={styles.tipText}>Pon un precio competitivo</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color={palette.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Publicar Producto</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: palette.text,
  },
  headerSubtitle: {
    fontSize: typography.body,
    color: palette.textMuted,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.subtitle,
    fontWeight: "600",
    color: palette.text,
    marginBottom: spacing.sm,
  },
  required: {
    color: palette.danger,
  },
  helperText: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
  photosScroll: {
    flexDirection: "row",
    marginBottom: spacing.xs,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.primary,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    backgroundColor: "#FFF5F2", // Light orange
  },
  addPhotoText: {
    color: palette.primary,
    fontSize: typography.caption,
    fontWeight: "600",
    marginTop: 4,
  },
  photoContainer: {
    width: 100,
    height: 100,
    marginRight: spacing.md,
    position: "relative",
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
    borderRadius: radius.lg,
  },
  removePhotoButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: palette.danger,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: palette.surface,
  },
  mainBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: palette.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  mainBadgeText: {
    color: palette.surface,
    fontSize: 8,
    fontWeight: "700",
  },
  input: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.muted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: palette.text,
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  priceInputWrapper: {
    position: "relative",
  },
  currencySymbol: {
    position: "absolute",
    left: spacing.md,
    top: 14,
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.textMuted,
    zIndex: 1,
  },
  priceInput: {
    paddingLeft: spacing.xl,
  },
  categoriesContainer: {
    gap: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.muted,
    backgroundColor: palette.surface,
    marginRight: spacing.sm,
  },
  categoryChipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  categoryChipText: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.text,
  },
  categoryChipTextSelected: {
    color: palette.surface,
  },
  inputWithIcon: {
    position: "relative",
  },
  inputIcon: {
    position: "absolute",
    left: spacing.md,
    top: 14,
    zIndex: 1,
  },
  inputPladded: {
    paddingLeft: spacing.xl + 10,
  },
  tipsContainer: {
    backgroundColor: "#EFF6FF", // Blue-50
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
  },
  tipsTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "#1E40AF", // Blue-800
    marginBottom: spacing.sm,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: 4,
  },
  tipText: {
    fontSize: typography.caption,
    color: "#1E3A8A", // Blue-900
  },
  submitButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    ...shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: typography.subtitle,
  },
});
