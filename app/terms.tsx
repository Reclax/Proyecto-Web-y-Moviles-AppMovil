import { palette, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TermsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Términos y Privacidad</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>
          Última actualización: 24 de Mayo, 2024
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Introducción</Text>
          <Text style={styles.paragraph}>
            Bienvenido a Shop&Buy. Al acceder y utilizar nuestra aplicación
            móvil, aceptas cumplir con estos Términos y Condiciones. Si no estás
            de acuerdo con alguna parte de estos términos, no podrás acceder al
            servicio.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Uso de la Aplicación</Text>
          <Text style={styles.paragraph}>
            Nuestra plataforma permite a los usuarios comprar y vender
            productos. Te comprometes a utilizar el servicio solo para fines
            legales y de acuerdo con todas las leyes aplicables.
          </Text>
          <Text style={styles.paragraph}>
            Está prohibido publicar contenido ilegal, ofensivo, o que infrinja
            derechos de propiedad intelectual.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Privacidad de Datos</Text>
          <Text style={styles.paragraph}>
            Tu privacidad es importante para nosotros. Recopilamos información
            personal como tu nombre, correo electrónico y ubicación para
            facilitar las transacciones.
          </Text>
          <Text style={styles.paragraph}>
            No compartimos tu información personal con terceros sin tu
            consentimiento, excepto cuando sea necesario para prestar el
            servicio o cumplir con la ley.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Seguridad</Text>
          <Text style={styles.paragraph}>
            Implementamos medidas de seguridad para proteger tu información. Sin
            embargo, ninguna transmisión por internet es 100% segura. Te
            recomendamos mantener tu contraseña segura y no compartirla con
            nadie.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Cambios en los Términos</Text>
          <Text style={styles.paragraph}>
            Nos reservamos el derecho de modificar estos términos en cualquier
            momento. Te notificaremos sobre cualquier cambio importante a través
            de la aplicación.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Si tienes preguntas sobre estos términos, contáctanos en
            soporte@shopandbuy.com
          </Text>
        </View>
      </ScrollView>
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
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  lastUpdated: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.sm,
  },
  paragraph: {
    fontSize: typography.body,
    color: palette.text,
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: palette.muted,
  },
  footerText: {
    fontSize: typography.caption,
    color: palette.textMuted,
    textAlign: "center",
    fontStyle: "italic",
  },
});
