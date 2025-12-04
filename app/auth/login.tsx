import { useAuthStore } from "@/store/authStore";
import { palette, radius, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [validationError, setValidationError] = useState("");

  const validateForm = useCallback(() => {
    if (!email || !password) {
      setValidationError("Por favor completa todos los campos");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError("Email inválido");
      return false;
    }

    if (password.length < 6) {
      setValidationError("La contraseña debe tener al menos 6 caracteres");
      return false;
    }

    return true;
  }, [email, password]);

  const handleLogin = useCallback(async () => {
    setValidationError("");

    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Login error:", err);
      setValidationError("Email o contraseña incorrectos");
    }
  }, [email, password, validateForm, login, router]);

  return (
    <View style={styles.container}>
      {/* Background Elements */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />
      <View style={[styles.bgCircle, styles.bgCircle3]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🛍️</Text>
              </View>
              <Text style={styles.title}>¡Bienvenido de vuelta!</Text>
              <Text style={styles.subtitle}>Entra a tu cuenta de Shop&Buy</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Error Message */}
              {(validationError || error) && (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={palette.danger}
                  />
                  <Text style={styles.errorText}>
                    {validationError || error}
                  </Text>
                </View>
              )}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo electrónico</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={palette.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="tu@email.com"
                    placeholderTextColor={palette.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    editable={!isLoading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contraseña</Text>
                <View style={styles.inputContainer}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={palette.textMuted}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu contraseña"
                    placeholderTextColor={palette.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color={palette.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}
                  >
                    {rememberMe && (
                      <Ionicons
                        name="checkmark"
                        size={14}
                        color={palette.surface}
                      />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>Recordarme</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={palette.surface} />
                ) : (
                  <>
                    <Text style={styles.loginButtonText}>
                      🚀 Entrar a Shop&Buy
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerSection}>
                <Text style={styles.registerText}>¿No tienes cuenta?</Text>
                <TouchableOpacity onPress={() => router.push("/auth/register")}>
                  <Text style={styles.registerLink}>Regístrate aquí</Text>
                </TouchableOpacity>
              </View>

              {/* Back to Home */}
              <TouchableOpacity
                style={styles.backLink}
                onPress={() => router.replace("/")}
              >
                <Text style={styles.backLinkText}>← Volver al inicio</Text>
              </TouchableOpacity>

              {/* Security Badge */}
              <View style={styles.securityBadge}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={palette.success}
                />
                <Text style={styles.securityText}>Conexión 100% segura</Text>
              </View>
            </View>
          </View>
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
  bgCircle: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.1,
  },
  bgCircle1: {
    width: 200,
    height: 200,
    backgroundColor: palette.primary,
    top: -50,
    left: -50,
  },
  bgCircle2: {
    width: 150,
    height: 150,
    backgroundColor: palette.secondary,
    bottom: 50,
    right: -30,
  },
  bgCircle3: {
    width: 100,
    height: 100,
    backgroundColor: palette.accent,
    top: "40%",
    left: -20,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: radius.xl,
    padding: spacing.xl,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: typography.body,
    color: palette.textMuted,
    textAlign: "center",
  },
  form: {
    gap: spacing.lg,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: palette.danger,
    padding: spacing.md,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.caption,
    color: palette.danger,
    fontWeight: "500",
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.text,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body,
    color: palette.text,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.textMuted,
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxLabel: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  forgotPassword: {
    fontSize: typography.caption,
    color: palette.primary,
    fontWeight: "600",
  },
  loginButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.surface,
  },
  registerSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
  },
  registerText: {
    fontSize: typography.body,
    color: palette.textMuted,
  },
  registerLink: {
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.primary,
  },
  backLink: {
    alignItems: "center",
  },
  backLinkText: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    alignSelf: "center",
  },
  securityText: {
    fontSize: 10,
    fontWeight: "600",
    color: palette.textMuted,
  },
});
