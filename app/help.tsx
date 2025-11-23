import { palette, radius, spacing, typography } from "@/theme";
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

const FAQS = [
  {
    question: "¿Cómo vendo un producto?",
    answer:
      "Ve a la pestaña 'Vender', toma fotos de tu producto, añade una descripción y precio, y publícalo. ¡Es gratis!",
  },
  {
    question: "¿Es seguro comprar?",
    answer:
      "Recomendamos reunirse en lugares públicos y verificar el producto antes de pagar. Contamos con un sistema de verificación de usuarios.",
  },
  {
    question: "¿Cómo contacto al vendedor?",
    answer:
      "En la página del producto, usa el botón 'Contactar' para iniciar un chat directo con el vendedor.",
  },
  {
    question: "¿Puedo editar mi publicación?",
    answer:
      "Sí, ve a 'Mis Productos', selecciona el producto y pulsa en 'Editar'.",
  },
];

export default function HelpScreen() {
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
        <Text style={styles.headerTitle}>Ayuda y Soporte</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons
            name="help-buoy-outline"
            size={64}
            color={palette.primary}
          />
          <Text style={styles.heroTitle}>¿Cómo podemos ayudarte?</Text>
          <Text style={styles.heroSubtitle}>
            Encuentra respuestas a las preguntas más frecuentes
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          <View style={styles.faqList}>
            {FAQS.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <Text style={styles.question}>{faq.question}</Text>
                <Text style={styles.answer}>{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>¿Aún necesitas ayuda?</Text>
          <Text style={styles.contactText}>
            Nuestro equipo de soporte está disponible para ti.
          </Text>
          <TouchableOpacity style={styles.contactButton}>
            <Ionicons name="mail-outline" size={20} color={palette.surface} />
            <Text style={styles.contactButtonText}>Contactar Soporte</Text>
          </TouchableOpacity>
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
  hero: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    marginBottom: spacing.lg,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: palette.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: typography.body,
    color: palette.textMuted,
    textAlign: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.md,
  },
  faqList: {
    gap: spacing.md,
  },
  faqItem: {
    backgroundColor: palette.surface,
    padding: spacing.md,
    borderRadius: radius.lg,
    ...{
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  question: {
    fontSize: typography.body,
    fontWeight: "700",
    color: palette.text,
    marginBottom: spacing.xs,
  },
  answer: {
    fontSize: typography.body,
    color: palette.textMuted,
    lineHeight: 20,
  },
  contactCard: {
    backgroundColor: "#FFF5F2", // Light orange
    padding: spacing.xl,
    borderRadius: radius.xl,
    alignItems: "center",
  },
  contactTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.primary,
    marginBottom: spacing.xs,
  },
  contactText: {
    fontSize: typography.body,
    color: palette.textMuted,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
  },
  contactButtonText: {
    color: palette.surface,
    fontWeight: "700",
    fontSize: typography.body,
  },
});
