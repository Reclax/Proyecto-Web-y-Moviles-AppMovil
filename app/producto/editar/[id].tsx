import { categoryAPI, productAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { getAbsoluteUrl } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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
  status: string;
}

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    price: "",
    location: "",
    categoryId: "",
    status: "active",
  });

  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [newPhotos, setNewPhotos] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productData, categoriesData] = await Promise.all([
        productAPI.getById(parseInt(id)),
        categoryAPI.getAll(),
      ]);

      setCategories(categoriesData);

      if (productData) {
        // Verify ownership
        if (user && productData.sellerId !== user.id) {
          Alert.alert("Error", "No tienes permiso para editar este producto");
          router.back();
          return;
        }

        setFormData({
          title: productData.title,
          description: productData.description || "",
          price: productData.price.toString(),
          location: productData.location || "",
          categoryId: productData.categoryId?.toString() || "",
          status: productData.status || "active",
        });

        if (productData.ProductPhotos) {
          setExistingPhotos(productData.ProductPhotos);
        }
      }
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Error", "No se pudo cargar la información del producto");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    const totalPhotos = existingPhotos.length + newPhotos.length;
    if (totalPhotos >= 10) {
      Alert.alert("Límite alcanzado", "Solo puedes tener hasta 10 fotos.");
      return;
    }

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
            setNewPhotos([...newPhotos, ...result.assets]);
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
            const availableSlots = 10 - totalPhotos;
            const selected = result.assets.slice(0, availableSlots);
            setNewPhotos([...newPhotos, ...selected]);

            if (result.assets.length > availableSlots) {
              Alert.alert(
                "Aviso",
                `Solo se agregaron ${availableSlots} fotos para no exceder el límite.`
              );
            }
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const removeNewPhoto = (index: number) => {
    setNewPhotos(newPhotos.filter((_, i) => i !== index));
  };

  // Note: Removing existing photos might require a separate API call or logic
  // For now, we'll just hide them from UI but ideally we should track deleted IDs
  const removeExistingPhoto = (photoId: number) => {
    Alert.alert(
      "Info",
      "Por el momento no se pueden eliminar fotos existentes, solo agregar nuevas."
    );
    // setExistingPhotos(existingPhotos.filter(p => p.id !== photoId));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.price || !formData.categoryId) {
      Alert.alert(
        "Campos requeridos",
        "Por favor completa título, precio y categoría."
      );
      return;
    }

    try {
      setSubmitting(true);

      const photoFiles = newPhotos.map((photo, index) => {
        const filename =
          photo.fileName ||
          photo.uri.split("/").pop() ||
          `new_photo_${index}.jpg`;

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
        sellerId: user?.id,
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        location: formData.location,
        categoryId: parseInt(formData.categoryId),
        status: formData.status,
        locationCoords: { lat: 0, lng: 0 }, // Preserve or update if needed
      };

      await productAPI.updateProduct(parseInt(id), productPayload, photoFiles);

      Alert.alert(
        "¡Actualizado!",
        "Tu producto ha sido actualizado exitosamente.",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error updating product:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Error desconocido";
      Alert.alert(
        "Error",
        `No se pudo actualizar el producto: ${errorMessage}`
      );
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
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Producto</Text>
        <View style={{ width: 24 }} />
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
            <Text style={styles.label}>Fotos del producto</Text>
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

              {/* Existing Photos */}
              {existingPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoContainer}>
                  <Image
                    source={{ uri: getAbsoluteUrl(photo.url) }}
                    style={styles.photoThumbnail}
                  />
                  {/* 
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removeExistingPhoto(photo.id)}
                  >
                    <Ionicons name="close" size={12} color={palette.surface} />
                  </TouchableOpacity>
                  */}
                </View>
              ))}

              {/* New Photos */}
              {newPhotos.map((photo, index) => (
                <View key={`new-${index}`} style={styles.photoContainer}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoThumbnail}
                  />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => removeNewPhoto(index)}
                  >
                    <Ionicons name="close" size={12} color={palette.surface} />
                  </TouchableOpacity>
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>Nueva</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>
              Título <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: iPhone 13 Pro Max"
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

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.label}>Estado</Text>
            <View style={styles.statusContainer}>
              {["active", "reserved", "sold"].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusChip,
                    formData.status === status && styles.statusChipSelected,
                    status === "active" &&
                      formData.status === status && {
                        backgroundColor: palette.success,
                      },
                    status === "reserved" &&
                      formData.status === status && {
                        backgroundColor: palette.secondary,
                      },
                    status === "sold" &&
                      formData.status === status && {
                        backgroundColor: palette.textMuted,
                      },
                  ]}
                  onPress={() => setFormData({ ...formData, status })}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      formData.status === status &&
                        styles.statusChipTextSelected,
                    ]}
                  >
                    {status === "active"
                      ? "Activo"
                      : status === "reserved"
                      ? "Reservado"
                      : "Vendido"}
                  </Text>
                </TouchableOpacity>
              ))}
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
              placeholder="Describe los detalles..."
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
              <Text style={styles.submitButtonText}>Guardar Cambios</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
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
    backgroundColor: "#FFF5F2",
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
  newBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: palette.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  newBadgeText: {
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
  statusContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statusChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: palette.muted,
    backgroundColor: palette.surface,
  },
  statusChipSelected: {
    borderColor: "transparent",
  },
  statusChipText: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.text,
  },
  statusChipTextSelected: {
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
