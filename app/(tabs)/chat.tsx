import { authAPI, conversationAPI, productAPI, userAPI } from "@/services/api";
import websocketService from "@/services/websocket";
import { palette, radius, spacing, typography } from "@/theme";
import { getAbsoluteUrl } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ConversationUI {
  id: number;
  vendorName: string;
  vendorAvatar: string;
  vendorImage: string | null;
  verified: boolean;
  online: boolean;
  lastSeen: string | null;
  otherUserId: number;
  product: {
    id: number;
    title: string;
    price: number;
    image: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  originalData: any;
}

const formatMessageTime = (dateString: string) => {
  if (!dateString) return "";
  const now = new Date();
  const messageDate = new Date(dateString);
  const diffInMinutes = Math.floor(
    (now.getTime() - messageDate.getTime()) / (1000 * 60)
  );

  if (diffInMinutes < 1) return "Ahora";
  if (diffInMinutes < 60) return `${diffInMinutes}m`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Ayer";
  if (diffInDays < 7) return `${diffInDays}d`;

  return messageDate.toLocaleDateString("es-EC", {
    month: "short",
    day: "numeric",
  });
};

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState<ConversationUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    initializeChat();

    return () => {
      cleanupWebSocket();
    };
  }, []);

  const initializeChat = async () => {
    // First load conversations (which will also verify auth)
    await loadConversations();
    // Then setup WebSocket after we know user is authenticated
    await setupWebSocket();
  };

  const setupWebSocket = async () => {
    try {
      // Check if user is authenticated first
      const token = await authAPI.getAuthToken();
      const userData = await authAPI.getUserData();
      
      if (!token || !userData) {
        console.log('[ChatList] No authenticated user, skipping WebSocket connection');
        return;
      }
      
      setCurrentUserId(userData.id);

      if (!websocketService.isConnectedStatus()) {
        console.log('[ChatList] Connecting WebSocket...');
        await websocketService.connect();
      }
      setIsConnected(true);

      // Setup event listeners
      websocketService.on("newMessage", handleNewMessage);
      websocketService.on("connected", handleConnected);
      websocketService.on("disconnected", handleDisconnected);
      websocketService.on("userOnline", handleUserOnline);
      websocketService.on("userOffline", handleUserOffline);
      
      console.log('[ChatList] WebSocket setup complete');
    } catch (error) {
      console.error('[ChatList] Error connecting WebSocket:', error);
      setIsConnected(false);
    }
  };

  const cleanupWebSocket = () => {
    console.log('[ChatList] Cleaning up WebSocket listeners');
    websocketService.off("newMessage", handleNewMessage);
    websocketService.off("connected", handleConnected);
    websocketService.off("disconnected", handleDisconnected);
    websocketService.off("userOnline", handleUserOnline);
    websocketService.off("userOffline", handleUserOffline);
  };

  const handleConnected = () => {
    console.log('[ChatList] WebSocket connected');
    setIsConnected(true);
  };

  const handleDisconnected = () => {
    console.log('[ChatList] WebSocket disconnected');
    setIsConnected(false);
  };

  const handleUserOnline = (data: any) => {
    console.log('[ChatList] User online:', data);
    // Update conversation list to show user online status
    setConversations((prev: ConversationUI[]) => 
      prev.map((conv: ConversationUI) => 
        conv.otherUserId === data.userId 
          ? { ...conv, online: true }
          : conv
      )
    );
  };

  const handleUserOffline = (data: any) => {
    console.log('[ChatList] User offline:', data);
    // Update conversation list to show user offline status
    setConversations((prev: ConversationUI[]) => 
      prev.map((conv: ConversationUI) => 
        conv.otherUserId === data.userId 
          ? { ...conv, online: false }
          : conv
      )
    );
  };

  const handleNewMessage = (message: any) => {
    console.log('[ChatList] New message received, reloading conversations');
    loadConversations(); // Reload to update order and preview
  };

  const loadConversations = async () => {
    try {
      const userData = await authAPI.getUserData();
      if (!userData) return;
      setCurrentUserId(userData.id);

      const backendConversations = await conversationAPI.getMyConversations();

      const mappedConversations = await Promise.all(
        backendConversations.map(async (conversation: any) => {
          const isCurrentUserBuyer = conversation.buyerId === userData.id;
          const otherUserId = isCurrentUserBuyer
            ? conversation.sellerId
            : conversation.buyerId;

          let otherUser = null;
          if (otherUserId) {
            try {
              otherUser = await userAPI.getUserById(otherUserId);
            } catch {
              /* Error fetching user */
            }
          }

          let product = null;
          try {
            product = await productAPI.getById(conversation.productId);
          } catch {
            /* Error fetching product */
          }

          let lastMessage = null;
          let lastMessageText = "Sin mensajes";
          let unreadCount = 0;

          if (conversation.Messages && conversation.Messages.length > 0) {
            lastMessage =
              conversation.Messages[conversation.Messages.length - 1];
            lastMessageText = lastMessage.content;
            unreadCount = conversation.Messages.filter(
              (m: any) => m.senderId !== userData.id && !m.read
            ).length;
          } else {
            try {
              const messages = await conversationAPI.getConversationMessages(
                conversation.id
              );
              if (messages && messages.length > 0) {
                lastMessage = messages[messages.length - 1];
                lastMessageText = lastMessage.content;
                unreadCount = messages.filter(
                  (m: any) => m.senderId !== userData.id && !m.read
                ).length;
              }
            } catch {
              /* Error fetching messages */
            }
          }

          let displayName = "Usuario Desconocido";
          let avatarLetter = "U";
          let avatarImage = null;

          if (otherUser) {
            const firstName = otherUser.name || "";
            const lastName = otherUser.lastname || "";
            if (firstName || lastName) {
              displayName = `${firstName} ${lastName}`.trim();
              avatarLetter = (firstName[0] || lastName[0] || "U").toUpperCase();
            } else if (otherUser.email) {
              displayName = otherUser.email;
              avatarLetter = otherUser.email[0].toUpperCase();
            }
            if (otherUser.avatarUrl) {
              avatarImage = getAbsoluteUrl(otherUser.avatarUrl);
            }
          }

          return {
            id: conversation.id,
            vendorName: displayName,
            vendorAvatar: avatarLetter,
            vendorImage: avatarImage,
            verified: otherUser?.isVerified || false,
            online: false, // TODO: Implement online status check
            lastSeen: null,
            otherUserId: otherUserId,
            product: product
              ? {
                  id: product.id,
                  title: product.title,
                  price: product.price,
                  image: product.ProductPhotos?.[0]?.url
                    ? getAbsoluteUrl(product.ProductPhotos[0].url)
                    : null,
                }
              : {
                  id: conversation.productId,
                  title: "Producto no disponible",
                  price: 0,
                  image: null,
                },
            lastMessage: lastMessageText,
            lastMessageTime: lastMessage
              ? formatMessageTime(lastMessage.createdAt || lastMessage.sentAt)
              : "",
            unread: unreadCount,
            originalData: conversation,
          };
        })
      );

      // Sort by last message time (descending)
      mappedConversations.sort((a: ConversationUI, b: ConversationUI) => {
        // Simple sort, ideally parse dates
        return 0;
      });

      setConversations(mappedConversations);
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadConversations();
  }, []);

  const filteredConversations = conversations.filter(
    (conv: ConversationUI) =>
      conv.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.product.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderConversationItem = ({ item }: { item: ConversationUI }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <View style={styles.avatarContainer}>
        {item.vendorImage ? (
          <Image source={{ uri: item.vendorImage }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{item.vendorAvatar}</Text>
          </View>
        )}
        {item.online && <View style={styles.onlineIndicator} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.vendorName} numberOfLines={1}>
              {item.vendorName}
            </Text>
            {item.verified && (
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={palette.primary}
                style={styles.verifiedIcon}
              />
            )}
          </View>
          <Text style={styles.timestamp}>{item.lastMessageTime}</Text>
        </View>

        <Text style={styles.productTitle} numberOfLines={1}>
          {item.product.title}
        </Text>

        <View style={styles.messagePreviewContainer}>
          <Text
            style={[
              styles.messagePreview,
              item.unread > 0 && styles.messagePreviewUnread,
            ]}
            numberOfLines={1}
          >
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Mensajes</Text>
        <Text style={styles.headerSubtitle}>
          Chatea con vendedores y compradores
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={palette.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar conversaciones..."
            placeholderTextColor={palette.textMuted}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        renderItem={renderConversationItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[palette.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons
              name="chatbubbles-outline"
              size={64}
              color={palette.muted}
            />
            <Text style={styles.emptyText}>No tienes conversaciones</Text>
            <Text style={styles.emptySubtext}>
              Los mensajes de tus compras y ventas aparecerán aquí
            </Text>
          </View>
        }
      />
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
    paddingBottom: spacing.sm,
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
  searchContainer: {
    padding: spacing.sm,
    backgroundColor: palette.surface,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.background,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: palette.muted,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body,
    color: palette.text,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  conversationItem: {
    flexDirection: "row",
    padding: spacing.sm,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  avatarContainer: {
    position: "relative",
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: palette.surface,
    fontSize: 24,
    fontWeight: "700",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: palette.surface,
  },
  conversationContent: {
    flex: 1,
    justifyContent: "center",
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  vendorName: {
    fontSize: typography.subtitle,
    fontWeight: "700",
    color: palette.text,
    marginRight: 4,
  },
  verifiedIcon: {
    marginLeft: 2,
  },
  timestamp: {
    fontSize: typography.caption,
    color: palette.textMuted,
  },
  productTitle: {
    fontSize: typography.caption,
    color: palette.textMuted,
    marginBottom: 4,
  },
  messagePreviewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  messagePreview: {
    flex: 1,
    fontSize: typography.body,
    color: palette.textMuted,
    marginRight: spacing.sm,
  },
  messagePreviewUnread: {
    color: palette.text,
    fontWeight: "600",
  },
  unreadBadge: {
    backgroundColor: palette.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadText: {
    color: palette.surface,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: typography.title,
    fontWeight: "700",
    color: palette.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: typography.body,
    color: palette.textMuted,
    textAlign: "center",
  },
});
