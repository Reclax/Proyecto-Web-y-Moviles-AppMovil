import EmptyState from "@/components/common/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const handleNotificationPress = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on type or content
    // Assuming typeId 1 is message
    if (notification.typeId === 1 || notification.type === "message") {
      // If we have conversationId in the notification payload, use it
      // Otherwise just go to chat list
      if (notification.conversationId) {
        router.push(`/chat/${notification.conversationId}`);
      } else {
        router.push("/chat");
      }
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      "Eliminar notificación",
      "¿Estás seguro de que quieres eliminar esta notificación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => deleteNotification(id),
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Ahora";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: any }) => {
    const isMessage = item.typeId === 1 || item.type === "message";

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            isMessage ? styles.messageIcon : styles.systemIcon,
          ]}
        >
          <Ionicons
            name={isMessage ? "chatbubble-ellipses" : "notifications"}
            size={20}
            color={isMessage ? palette.primary : palette.textMuted}
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text
              style={[styles.title, !item.read && styles.unreadTitle]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
          </View>

          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={16} color={palette.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.headerActions}>
          <Text style={styles.subtitle}>
            {unreadCount > 0
              ? `${unreadCount} nueva${unreadCount !== 1 ? "s" : ""}`
              : "No tienes nuevas notificaciones"}
          </Text>

          {unreadCount > 0 && (
            <TouchableOpacity
              onPress={markAllAsRead}
              style={styles.markReadButton}
            >
              <Ionicons
                name="checkmark-done"
                size={16}
                color={palette.primary}
              />
              <Text style={styles.markReadText}>Marcar leídas</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && notifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={loadNotifications}
              colors={[palette.primary]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="notifications-off-outline"
              title="Sin notificaciones"
              message="Te avisaremos cuando haya novedades importantes."
            />
          }
        />
      )}
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
    backgroundColor: palette.surface,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
    ...shadows.sm,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
  },
  headerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  subtitle: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  markReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF5F2",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  markReadText: {
    fontSize: 11,
    color: palette.primary,
    fontWeight: "600",
  },
  listContent: {
    padding: spacing.sm,
  },
  notificationItem: {
    flexDirection: "row",
    backgroundColor: palette.surface,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: "transparent",
    ...shadows.sm,
  },
  unreadItem: {
    borderColor: palette.primary,
    backgroundColor: "#FFFDFC",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  messageIcon: {
    backgroundColor: "#FFF5F2",
  },
  systemIcon: {
    backgroundColor: palette.muted,
  },
  contentContainer: {
    flex: 1,
    marginRight: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: typography.body,
    fontWeight: "600",
    color: palette.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadTitle: {
    color: palette.primary,
    fontWeight: "700",
  },
  time: {
    fontSize: 10,
    color: palette.textMuted,
  },
  message: {
    fontSize: typography.caption,
    color: palette.textMuted,
    lineHeight: 18,
  },
  deleteButton: {
    padding: spacing.xs,
    alignSelf: "flex-start",
  },
});
