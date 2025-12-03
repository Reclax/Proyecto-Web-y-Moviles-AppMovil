import { userAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { getAbsoluteUrl } from "@/utils/productUtils";
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

export default function ConfiguracionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    phone: "",
    address: "",
  });

  // Password State
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await userAPI.whoAmI();
      setUserData(data);
      setFormData({
        name: data?.name || "",
        lastname: data?.lastname || "",
        phone: data?.phone || "",
        address: data?.address || "",
      });
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvatar = async () => {
    Alert.alert("Actualizar foto", "Selecciona una opción", [
      {
        text: "Cámara",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            Alert.alert("Permiso denegado", "Necesitamos acceso a tu cámara.");
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

          if (!result.canceled) {
            await uploadAvatar(result.assets[0].uri);
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
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });

          if (!result.canceled) {
            await uploadAvatar(result.assets[0].uri);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const uploadAvatar = async (uri: string) => {
    try {
      setUpdating(true);
      await userAPI.updateAvatar(userData.id, {
        uri: uri,
        type: "image/jpeg",
        name: `avatar_${Date.now()}.jpg`,
      });
      await loadUserData();
      Alert.alert("Éxito", "Avatar actualizado");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar el avatar");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (showPasswordFields) {
      if (!passwordData.currentPassword) {
        Alert.alert("Error", "Ingresa tu contraseña actual");
        return;
      }
      if (passwordData.newPassword.length < 6) {
        Alert.alert(
          "Error",
          "La nueva contraseña debe tener al menos 6 caracteres"
        );
        return;
      }
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        Alert.alert("Error", "Las contraseñas nuevas no coinciden");
        return;
      }
    }

    try {
      setUpdating(true);

      // Update Profile Info
      await userAPI.updateProfile(userData.id, {
        name: formData.name,
        lastname: formData.lastname,
        phone: formData.phone,
        address: formData.address,
      });

      // Update Password if requested
      if (showPasswordFields) {
        await userAPI.changePassword({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        });
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setShowPasswordFields(false);
      }

      await loadUserData();
      setIsEditing(false);
      Alert.alert("Éxito", "Perfil actualizado correctamente");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "No se pudo actualizar el perfil"
      );
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setFormData({
      name: userData?.name || "",
      lastname: userData?.lastname || "",
      phone: userData?.phone || "",
      address: userData?.address || "",
    });
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setShowPasswordFields(false);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Configuración</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración</Text>
        <View style={{ width: 40 }} />
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
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleUpdateAvatar}
              disabled={updating}
            >
              {userData?.avatarUrl ? (
                <Image
                  source={{ uri: getAbsoluteUrl(userData.avatarUrl) as string }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={40} color={palette.surface} />
                </View>
              )}
              <View style={styles.editBadge}>
                <Ionicons name="camera" size={14} color={palette.surface} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
          </View>

          {/* Personal Info Form */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Información Personal</Text>
              {!isEditing && (
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.editLink}>Editar</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
                editable={isEditing}
                placeholder="Tu nombre"
                placeholderTextColor={palette.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.lastname}
                onChangeText={(text) =>
                  setFormData({ ...formData, lastname: text })
                }
                editable={isEditing}
                placeholder="Tu apellido"
                placeholderTextColor={palette.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={userData?.email}
                editable={false}
              />
              <Text style={styles.inputHint}>El email no se puede cambiar</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Teléfono</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.phone}
                onChangeText={(text) =>
                  setFormData({ ...formData, phone: text })
                }
                editable={isEditing}
                keyboardType="phone-pad"
                placeholder="0987654321"
                placeholderTextColor={palette.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Dirección</Text>
              <TextInput
                style={[styles.input, !isEditing && styles.inputDisabled]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                editable={isEditing}
                placeholder="Ej. Av. Principal 123, Quito"
                placeholderTextColor={palette.textMuted}
              />
            </View>
          </View>

          {/* Password Change Section */}
          {isEditing && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPasswordFields(!showPasswordFields)}
              >
                <Text style={styles.sectionTitle}>Cambiar Contraseña</Text>
                <Ionicons
                  name={showPasswordFields ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={palette.textMuted}
                />
              </TouchableOpacity>

              {showPasswordFields && (
                <View style={styles.passwordFields}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Contraseña actual</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.currentPassword}
                      onChangeText={(text) =>
                        setPasswordData({
                          ...passwordData,
                          currentPassword: text,
                        })
                      }
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor={palette.textMuted}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nueva contraseña</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.newPassword}
                      onChangeText={(text) =>
                        setPasswordData({ ...passwordData, newPassword: text })
                      }
                      secureTextEntry
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor={palette.textMuted}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirmar nueva contraseña</Text>
                    <TextInput
                      style={styles.input}
                      value={passwordData.confirmPassword}
                      onChangeText={(text) =>
                        setPasswordData({
                          ...passwordData,
                          confirmPassword: text,
                        })
                      }
                      secureTextEntry
                      placeholder="Repite la contraseña"
                      placeholderTextColor={palette.textMuted}
                    />
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelEdit}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSaveChanges}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color={palette.surface} />
                ) : (
                  <Text style={styles.saveButtonText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.background,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
    marginTop: spacing.md,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: palette.surface,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: palette.surface,
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: palette.surface,
  },
  avatarHint: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  section: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
  },
  editLink: {
    color: palette.primary,
    fontWeight: "600",
    fontSize: typography.body,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.muted,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: typography.body,
    color: palette.text,
  },
  inputDisabled: {
    backgroundColor: "#F3F4F6",
    color: palette.textMuted,
    borderColor: "transparent",
  },
  inputHint: {
    fontSize: typography.caption - 1,
    color: palette.textMuted,
    marginTop: 4,
    fontStyle: "italic",
  },
  passwordToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passwordFields: {
    marginTop: spacing.md,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: palette.primary,
    ...shadows.md,
  },
  saveButtonText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: typography.body,
  },
  cancelButton: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.muted,
  },
  cancelButtonText: {
    color: palette.text,
    fontWeight: "600",
    fontSize: typography.body,
  },
});
