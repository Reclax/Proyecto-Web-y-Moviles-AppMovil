import { userAPI } from "@/services/api";
import { useAuthStore } from "@/store/authStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { getAbsoluteUrl } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function PerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuthStore();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await userAPI.whoAmI();
      setUserData(data);
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Cerrar sesión", "¿Estás seguro?", [
      {
        text: "Cancelar",
        style: "cancel",
      },
      {
        text: "Sí, cerrar sesión",
        onPress: async () => {
          await logout();
          router.replace("/auth/login");
        },
      },
    ]);
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
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section - Solo foto y nombre */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            {userData?.avatarUrl ? (
              <Image
                source={{ uri: getAbsoluteUrl(userData.avatarUrl) as string }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={50} color={palette.surface} />
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {userData?.name} {userData?.lastname}
          </Text>
          <Text style={styles.userEmail}>{userData?.email}</Text>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Cuenta</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/configuracion")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name="settings-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Configuración</Text>
              <Text style={styles.menuSubtext}>Editar perfil y contraseña</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/mis-productos")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons name="cube-outline" size={20} color={palette.primary} />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Mis Productos</Text>
              <Text style={styles.menuSubtext}>Gestiona tus publicaciones</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/favoritos")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name="heart-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Mis Favoritos</Text>
              <Text style={styles.menuSubtext}>Productos guardados</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/notificaciones")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Notificaciones</Text>
              <Text style={styles.menuSubtext}>Alertas y mensajes</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Support Section */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Soporte</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/help")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name="help-circle-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Ayuda y Soporte</Text>
              <Text style={styles.menuSubtext}>Preguntas frecuentes</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/terms")}
          >
            <View style={styles.menuIconContainer}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={palette.primary}
              />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuText}>Términos y Privacidad</Text>
              <Text style={styles.menuSubtext}>Condiciones de uso</Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={palette.textMuted}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={palette.danger} />
          <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
        </TouchableOpacity>

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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
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
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
    ...shadows.md,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: palette.surface,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: palette.surface,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: typography.body,
    color: palette.textMuted,
  },
  menuSection: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  menuSectionTitle: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: "#FFF5F2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.text,
  },
  menuSubtext: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    ...shadows.sm,
  },
  logoutButtonText: {
    color: palette.danger,
    fontWeight: "700",
    fontSize: typography.body,
    marginLeft: spacing.sm,
  },
});
