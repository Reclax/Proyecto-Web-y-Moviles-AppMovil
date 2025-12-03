import { useAuthStore } from "@/store/authStore";
import { palette, radius, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading, error } = useAuthStore();

  const [formData, setFormData] = useState({
    name: "",
    lastname: "",
    dni: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [avatar, setAvatar] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  const pickImage = async () => {
    Alert.alert("Foto de perfil", "Selecciona una opción", [
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
            quality: 0.5,
          });
          if (!result.canceled) {
            setAvatar(result.assets[0].uri);
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
            quality: 0.5,
          });
          if (!result.canceled) {
            setAvatar(result.assets[0].uri);
          }
        },
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  const validateForm = useCallback(() => {
    const { name, lastname, dni, phone, email, password, confirmPassword } =
      formData;

    if (
      !name ||
      !lastname ||
      !dni ||
      !phone ||
      !email ||
      !password ||
      !confirmPassword
    ) {
      setValidationError("Por favor completa todos los campos");
      return false;
    }

    if (!/^\d+$/.test(dni) || dni.length !== 10) {
      setValidationError("La cédula debe tener 10 dígitos numéricos");
      return false;
    }

    if (!/^\d+$/.test(phone) || phone.length !== 10) {
      setValidationError("El celular debe tener 10 dígitos numéricos");
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

    if (password !== confirmPassword) {
      setValidationError("Las contraseñas no coinciden");
      return false;
    }

    if (!termsAccepted) {
      setValidationError("Debes aceptar los términos y condiciones");
      return false;
    }

    return true;
  }, [formData, termsAccepted]);

  const handleRegister = useCallback(async () => {
    setValidationError("");

    if (!validateForm()) {
      return;
    }

    try {
      const data = new FormData();
      data.append("name", formData.name);
      data.append("lastname", formData.lastname);
      data.append("dni", formData.dni);
      data.append("phone", formData.phone);
      data.append("email", formData.email);
      data.append("password", formData.password);
      data.append("roleId", "2"); // Usuario role

      if (avatar) {
        const filename = avatar.split("/").pop();
        const match = /\.(\w+)$/.exec(filename || "");
        const type = match ? `image/${match[1]}` : "image/jpeg";

        data.append("avatar", {
          uri: avatar,
          name: filename || "avatar.jpg",
          type,
        } as any);
      }

      await register(data);
      Alert.alert("¡Éxito!", "Cuenta creada correctamente. ¡Bienvenido!", [
        { text: "Comenzar", onPress: () => router.replace("/(tabs)") },
      ]);
    } catch (err) {
      console.error("Register error:", err);
      setValidationError("Error al registrarse. Intenta de nuevo.");
    }
  }, [formData, avatar, validateForm, register, router]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <View style={styles.container}>
      {/* Background Elements */}
      <View style={[styles.bgCircle, styles.bgCircle1]} />
      <View style={[styles.bgCircle, styles.bgCircle2]} />

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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </TouchableOpacity>

              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🛍️</Text>
              </View>
              <Text style={styles.title}>¡Únete a Shop&Buy!</Text>
              <Text style={styles.subtitle}>Crea tu cuenta para empezar</Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Avatar Upload */}
              <View style={styles.avatarSection}>
                <TouchableOpacity
                  onPress={pickImage}
                  style={styles.avatarContainer}
                >
                  {avatar ? (
                    <Image
                      source={{ uri: avatar }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons
                        name="person"
                        size={40}
                        color={palette.textMuted}
                      />
                    </View>
                  )}
                  <View style={styles.cameraIcon}>
                    <Ionicons name="camera" size={16} color={palette.surface} />
                  </View>
                </TouchableOpacity>
                <Text style={styles.avatarLabel}>Foto de perfil</Text>
              </View>

              {/* Error Message */}
              {(validationError || error) && (
                <View style={styles.errorBanner}>
                  <Ionicons
                    name="alert-circle"
                    size={20}
                    color={palette.error}
                  />
                  <Text style={styles.errorText}>
                    {validationError || error}
                  </Text>
                </View>
              )}

              {/* Name & Lastname Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Nombres</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Juan"
                      placeholderTextColor={palette.textMuted}
                      value={formData.name}
                      onChangeText={(text) => updateField("name", text)}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Apellidos</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Pérez"
                      placeholderTextColor={palette.textMuted}
                      value={formData.lastname}
                      onChangeText={(text) => updateField("lastname", text)}
                    />
                  </View>
                </View>
              </View>

              {/* DNI & Phone Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Cédula</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="1234567890"
                      placeholderTextColor={palette.textMuted}
                      value={formData.dni}
                      onChangeText={(text) => updateField("dni", text)}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Celular</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="099..."
                      placeholderTextColor={palette.textMuted}
                      value={formData.phone}
                      onChangeText={(text) => updateField("phone", text)}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
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
                    value={formData.email}
                    onChangeText={(text) => updateField("email", text)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Contraseña</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="******"
                      placeholderTextColor={palette.textMuted}
                      value={formData.password}
                      onChangeText={(text) => updateField("password", text)}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off" : "eye"}
                        size={16}
                        color={palette.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Confirmar</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="******"
                      placeholderTextColor={palette.textMuted}
                      value={formData.confirmPassword}
                      onChangeText={(text) =>
                        updateField("confirmPassword", text)
                      }
                      secureTextEntry={!showConfirmPassword}
                    />
                    <TouchableOpacity
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      <Ionicons
                        name={showConfirmPassword ? "eye-off" : "eye"}
                        size={16}
                        color={palette.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Terms */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons
                      name="checkmark"
                      size={12}
                      color={palette.surface}
                    />
                  )}
                </View>
                <Text style={styles.termsText}>
                  Acepto los <Text style={styles.linkText}>términos</Text> y{" "}
                  <Text style={styles.linkText}>privacidad</Text>
                </Text>
              </TouchableOpacity>

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isLoading && styles.buttonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={palette.surface} />
                ) : (
                  <Text style={styles.registerButtonText}>Crear cuenta</Text>
                )}
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginSection}>
                <Text style={styles.loginText}>¿Ya tienes cuenta?</Text>
                <TouchableOpacity onPress={() => router.push("/auth/login")}>
                  <Text style={styles.loginLink}>Inicia sesión aquí</Text>
                </TouchableOpacity>
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
    right: -50,
  },
  bgCircle2: {
    width: 150,
    height: 150,
    backgroundColor: palette.secondary,
    bottom: 50,
    left: -30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: radius.xl,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 0,
    padding: spacing.xs,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logo: {
    fontSize: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: palette.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  form: {
    gap: spacing.md,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: spacing.xs,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.muted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: palette.surface,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: palette.surface,
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: palette.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: palette.surface,
  },
  avatarLabel: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderLeftWidth: 4,
    borderLeftColor: palette.error,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: typography.caption,
    color: palette.error,
    fontWeight: "500",
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inputGroup: {
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.text,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    height: 40,
  },
  input: {
    flex: 1,
    fontSize: typography.body,
    color: palette.text,
    paddingVertical: 0,
  },
  termsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: palette.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  termsText: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  linkText: {
    color: palette.primary,
    fontWeight: "600",
  },
  registerButton: {
    backgroundColor: palette.primary,
    borderRadius: radius.lg,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.sm,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  registerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.surface,
  },
  loginSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  loginText: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  loginLink: {
    fontSize: typography.caption,
    fontWeight: "600",
    color: palette.primary,
  },
});
