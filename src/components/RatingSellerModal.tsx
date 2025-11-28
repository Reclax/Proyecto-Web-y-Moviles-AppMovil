import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface RatingSellerModalProps {
  visible: boolean;
  onClose: () => void;
  sellerId: number;
  sellerName: string;
  productId: number;
  onSubmit: (data: {
    sellerId: number;
    productId: number;
    score: number;
  }) => Promise<void>;
}

const RATING_FEEDBACK = {
  1: { text: "Necesita mejorar", emoji: "😞" },
  2: { text: "Aceptable", emoji: "🤔" },
  3: { text: "Bueno", emoji: "👍" },
  4: { text: "Muy bueno", emoji: "😊" },
  5: { text: "¡Excelente!", emoji: "👏" },
};

export default function RatingSellerModal({
  visible,
  onClose,
  sellerId,
  sellerName,
  productId,
  onSubmit,
}: RatingSellerModalProps) {
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setErrorMessage("Por favor selecciona una puntuación");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await onSubmit({
        sellerId,
        productId,
        score: rating,
      });

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 1800);
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        "Error al guardar la calificación. Intenta de nuevo.";
      setErrorMessage(msg);
      console.error("Error en calificación:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setErrorMessage("");
    onClose();
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= rating;
          return (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              disabled={isSubmitting}
              style={styles.starButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFilled ? "star" : "star-outline"}
                size={48}
                color={isFilled ? "#FBBF24" : palette.muted}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {showSuccess ? (
          // Success Modal
          <View style={styles.successModal}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={64} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>¡Calificación enviada!</Text>
            <Text style={styles.successText}>
              Gracias por tu calificación al vendedor.
            </Text>
            <View style={styles.successBadge}>
              <Ionicons name="checkmark" size={14} color="#fff" />
              <Text style={styles.successBadgeText}>Completado</Text>
            </View>
          </View>
        ) : (
          // Rating Modal
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Ionicons name="star" size={28} color="#10B981" />
                <View style={styles.headerText}>
                  <Text style={styles.title}>Calificar vendedor</Text>
                  <Text style={styles.subtitle}>{sellerName}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
              <Text style={styles.question}>
                ¿Cómo fue tu experiencia con este vendedor?
              </Text>

              {renderStars()}

              {/* Feedback */}
              {rating > 0 && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackText}>
                    {RATING_FEEDBACK[rating as keyof typeof RATING_FEEDBACK].text}{" "}
                    {RATING_FEEDBACK[rating as keyof typeof RATING_FEEDBACK].emoji}
                  </Text>
                </View>
              )}

              {/* Error */}
              {errorMessage ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isSubmitting || rating === 0) && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || rating === 0}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.submitText}>Enviar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    width: "100%",
    maxWidth: 400,
    overflow: "hidden",
    ...shadows.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerText: {
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: typography.h3,
    fontWeight: "800",
    color: palette.text,
  },
  subtitle: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.xs,
    borderRadius: radius.full,
  },
  content: {
    padding: spacing.lg,
    alignItems: "center",
  },
  question: {
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.text,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  starsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  starButton: {
    padding: spacing.xs,
  },
  feedbackContainer: {
    backgroundColor: "#ECFDF5",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: "#A7F3D0",
    width: "100%",
  },
  feedbackText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "#065F46",
    textAlign: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: "#FECACA",
    gap: spacing.sm,
    marginTop: spacing.md,
    width: "100%",
  },
  errorText: {
    fontSize: typography.caption,
    color: "#991B1B",
    fontWeight: "600",
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.muted,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.muted,
    alignItems: "center",
  },
  cancelText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: palette.textMuted,
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    ...shadows.md,
  },
  submitButtonDisabled: {
    backgroundColor: "#6EE7B7",
    opacity: 0.7,
  },
  submitText: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "#fff",
  },
  // Success Modal
  successModal: {
    backgroundColor: palette.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 350,
    ...shadows.lg,
  },
  successIcon: {
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: typography.h2,
    fontWeight: "800",
    color: palette.text,
    marginBottom: spacing.sm,
  },
  successText: {
    fontSize: typography.body,
    color: palette.textMuted,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10B981",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  successBadgeText: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: "#fff",
  },
});
