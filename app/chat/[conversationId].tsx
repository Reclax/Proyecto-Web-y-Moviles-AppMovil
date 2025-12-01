import {
  authAPI,
  conversationAPI,
  messageAPI,
  productAPI,
  userAPI,
} from "@/services/api";
import websocketService from "@/services/websocket";
import { useActiveChatStore } from "@/store/activeChatStore";
import { palette, radius, shadows, spacing, typography } from "@/theme";
import { getAbsoluteUrl } from "@/utils/productUtils";
import { Ionicons } from "@expo/vector-icons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RatingSellerModal from "@/components/RatingSellerModal";

interface Message {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  read: boolean;
  pending?: boolean;
}

interface ChatDetails {
  vendorId: number;
  vendorName: string;
  vendorAvatar: string;
  vendorImage: string | null;
  isSeller: boolean;
  product: {
    id: number;
    title: string;
    price: number;
    image: string | null;
  };
}

export default function ChatConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setActiveConversation = useActiveChatStore((state) => state.setActiveConversation);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [chatDetails, setChatDetails] = useState<ChatDetails | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const convId = parseInt(conversationId);

  useEffect(() => {
    // Set active conversation for push notification filtering
    setActiveConversation(convId);
    initializeChat();

    return () => {
      setActiveConversation(null);
      cleanupWebSocket();
    };
  }, [conversationId]);

  const initializeChat = async () => {
    // First load chat data (which verifies user is authenticated)
    await loadChatData();
    // Then setup WebSocket listeners (connection is managed globally in _layout)
    await setupWebSocket();
  };

  const setupWebSocket = async () => {
    try {
      // Verify authentication before setting up listeners
      const token = await authAPI.getAuthToken();
      if (!token) {
        console.log('[Chat] No auth token, skipping WebSocket setup');
        return;
      }

      // WebSocket connection is managed globally in _layout.tsx
      // Here we just ensure it's connected and join the conversation
      if (!websocketService.isConnectedStatus()) {
        console.log('[Chat] WebSocket not connected, attempting to connect...');
        await websocketService.connect();
      }
      
      // Join the conversation room
      console.log('[Chat] Joining conversation:', convId);
      websocketService.joinConversation(convId);
      
      // Setup event listeners for this chat screen
      websocketService.on("newMessage", handleNewMessage);
      websocketService.on("messageSent", handleMessageSent);
      websocketService.on("typingStart", handleTypingStart);
      websocketService.on("typingStop", handleTypingStop);
      websocketService.on("messageReadUpdate", handleMessageRead);
      
      console.log('[Chat] WebSocket setup complete for conversation:', convId);
    } catch (error) {
      console.error('[Chat] WebSocket setup error:', error);
    }
  };

  const cleanupWebSocket = () => {
    console.log('[Chat] Cleaning up WebSocket listeners');
    websocketService.off("newMessage", handleNewMessage);
    websocketService.off("messageSent", handleMessageSent);
    websocketService.off("typingStart", handleTypingStart);
    websocketService.off("typingStop", handleTypingStop);
    websocketService.off("messageReadUpdate", handleMessageRead);
    websocketService.leaveConversation(convId);
  };

  const handleNewMessage = useCallback(
    (message: any) => {
      console.log("[Chat] New message received:", message);
      if (message.conversationId === convId || message.conversationId?.toString() === conversationId) {
        setMessages((prev: Message[]) => {
          const exists = prev.some((m) => m.id === message.id);
          if (exists) return prev;

          const newMessage: Message = {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            createdAt: message.createdAt || message.sentAt || new Date().toISOString(),
            read: message.read || false,
            pending: false,
          };

          return [newMessage, ...prev];
        });

        // Mark as read if from other user
        if (message.senderId !== currentUserId) {
          websocketService.markMessageAsRead(message.id);
        }
      }
    },
    [convId, conversationId, currentUserId]
  );

  const handleMessageSent = useCallback(
    (message: any) => {
      console.log("[Chat] Message sent confirmation:", message);
      if (message.conversationId === convId || message.conversationId?.toString() === conversationId) {
        setMessages((prev: Message[]) =>
          prev.map((m) => {
            if (m.pending && m.content === message.content) {
              return {
                id: message.id,
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt || message.sentAt || m.createdAt,
                read: message.read || false,
                pending: false,
              };
            }
            return m;
          })
        );
      }
    },
    [convId, conversationId]
  );

  const handleTypingStart = useCallback(
    (data: any) => {
      if (
        (data.conversationId === convId || data.conversationId?.toString() === conversationId) &&
        data.userId !== currentUserId
      ) {
        setIsTyping(true);
      }
    },
    [convId, conversationId, currentUserId]
  );

  const handleTypingStop = useCallback(
    (data: any) => {
      if (data.conversationId === convId || data.conversationId?.toString() === conversationId) {
        setIsTyping(false);
      }
    },
    [convId, conversationId]
  );

  const handleMessageRead = useCallback(
    (data: any) => {
      if (data.conversationId === convId || data.conversationId?.toString() === conversationId) {
        setMessages((prev: Message[]) =>
          prev.map((m) =>
            m.id === data.messageId ? { ...m, read: true } : m
          )
        );
      }
    },
    [convId, conversationId]
  );

  const loadChatData = async () => {
    try {
      setLoading(true);
      let userData = await authAPI.getUserData();
      
      if (!userData) {
        // Try to fetch from server
        const fetchedUser = await userAPI.whoAmI();
        if (fetchedUser) {
          userData = fetchedUser;
          setCurrentUserId(fetchedUser.id);
        } else {
          Alert.alert("Error", "No se pudo obtener la información del usuario");
          return;
        }
      } else {
        setCurrentUserId(userData.id);
      }

      const userId = userData.id;

      // Load conversation details (User & Product)
      // Since we don't have getById, we find it in the list
      const conversations = await conversationAPI.getMyConversations();
      const conversation = conversations.find(
        (c: any) => c.id.toString() === conversationId
      );

      if (conversation) {
        const isCurrentUserBuyer = conversation.buyerId === userId;
        const otherUserId = isCurrentUserBuyer
          ? conversation.sellerId
          : conversation.buyerId;

        let otherUser = null;
        try {
          otherUser = await userAPI.getUserById(otherUserId);
        } catch {
          /* Error */
        }

        let product = null;
        try {
          product = await productAPI.getById(conversation.productId);
        } catch {
          /* Error */
        }

        let displayName = "Usuario";
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

        setChatDetails({
          vendorId: otherUserId,
          vendorName: displayName,
          vendorAvatar: avatarLetter,
          vendorImage: avatarImage,
          isSeller: isCurrentUserBuyer, // Show rate button if current user is buyer
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
                id: 0,
                title: "Producto no disponible",
                price: 0,
                image: null,
              },
        });
      }

      // Load Messages
      const msgs = await conversationAPI.getConversationMessages(
        parseInt(conversationId)
      );
      // Sort by date descending for inverted list
      msgs.sort(
        (a: any, b: any) =>
          new Date(b.createdAt || b.sentAt).getTime() -
          new Date(a.createdAt || a.sentAt).getTime()
      );
      setMessages(msgs);
    } catch (error) {
      console.error("Error loading chat:", error);
      Alert.alert("Error", "No se pudo cargar la conversación");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Send typing indicator
    if (text.length > 0) {
      websocketService.startTyping(convId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        websocketService.stopTyping(convId);
      }, 2000);
    } else {
      websocketService.stopTyping(convId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const tempId = Date.now();
    const content = inputText.trim();

    // Stop typing indicator
    websocketService.stopTyping(convId);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Optimistic update
    const tempMessage: Message = {
      id: tempId,
      content: content,
      senderId: currentUserId!,
      createdAt: new Date().toISOString(),
      read: false,
      pending: true,
    };

    setMessages((prev: Message[]) => [tempMessage, ...prev]);
    setInputText("");
    setSending(true);

    try {
      // Try WebSocket first
      if (websocketService.isConnectedStatus()) {
        websocketService.sendMessage(parseInt(conversationId), content);
        // WebSocket will send back the real message via 'newMessage' event or 'messageSent'
        // For now we assume success and remove pending flag when real message arrives
      } else {
        // Fallback to HTTP
        await messageAPI.sendMessage(parseInt(conversationId), content);
        // Reload messages to get the real one with ID
        const msgs = await conversationAPI.getConversationMessages(
          parseInt(conversationId)
        );
        msgs.sort(
          (a: any, b: any) =>
            new Date(b.createdAt || b.sentAt).getTime() -
            new Date(a.createdAt || a.sentAt).getTime()
        );
        setMessages(msgs);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "No se pudo enviar el mensaje");
      // Remove optimistic message on error
      setMessages((prev: Message[]) => prev.filter((m: Message) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleRateSeller = async (data: {
    sellerId: number;
    productId: number;
    score: number;
  }) => {
    await userAPI.rateSeller(data.sellerId, data.score, data.productId);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.senderId === currentUserId;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwn ? styles.messageOwn : styles.messageOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwn ? styles.bubbleOwn : styles.bubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isOwn ? styles.textOwn : styles.textOther,
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwn ? styles.timeOwn : styles.timeOther,
              ]}
            >
              {new Date(item.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
            {isOwn && (
              <Ionicons
                name={
                  item.pending
                    ? "time-outline"
                    : item.read
                    ? "checkmark-done"
                    : "checkmark"
                }
                size={12}
                color={item.read ? "#60A5FA" : "rgba(255, 255, 255, 0.7)"}
                style={styles.statusIcon}
              />
            )}
          </View>
        </View>
      </View>
    );
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
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            {chatDetails?.vendorImage ? (
              <Image
                source={{ uri: chatDetails.vendorImage }}
                style={styles.avatar}
                onError={() => {
                  setChatDetails((prev: ChatDetails | null) =>
                    prev ? { ...prev, vendorImage: null } : null
                  );
                }}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {chatDetails?.vendorAvatar}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.userName}>{chatDetails?.vendorName}</Text>
              {isTyping && (
                <Text style={styles.typingIndicator}>escribiendo...</Text>
              )}
            </View>
          </View>
        </View>

        {/* Rate seller button - only show if other user is the seller */}
        {chatDetails?.isSeller && (
          <TouchableOpacity
            style={styles.rateButton}
            onPress={() => setShowRatingModal(true)}
          >
            <Ionicons name="star" size={20} color="#FBBF24" />
          </TouchableOpacity>
        )}
      </View>

      {/* Product Context */}
      {chatDetails?.product && chatDetails.product.id !== 0 && (
        <TouchableOpacity
          style={styles.productContext}
          onPress={() => router.push(`/producto/${chatDetails.product.id}`)}
          activeOpacity={0.8}
        >
          <View style={styles.productImageContainer}>
            {chatDetails.product.image ? (
              <Image
                source={{ uri: chatDetails.product.image }}
                style={styles.productImage}
                onError={() => {
                  setChatDetails((prev: ChatDetails | null) =>
                    prev
                      ? {
                          ...prev,
                          product: { ...prev.product, image: null },
                        }
                      : null
                  );
                }}
              />
            ) : (
              <View style={styles.productPlaceholder}>
                <Ionicons
                  name="cube-outline"
                  size={20}
                  color={palette.textMuted}
                />
              </View>
            )}
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={1}>
              {chatDetails.product.title}
            </Text>
            <Text style={styles.productPrice}>
              ${chatDetails.product.price}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />
        </TouchableOpacity>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        style={styles.flex}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id.toString()}
          inverted
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Platform.OS === "ios" ? insets.bottom || spacing.md : spacing.md },
          ]}
        >
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={palette.textMuted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={palette.surface} />
            ) : (
              <Ionicons name="send" size={20} color={palette.surface} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Rating Modal */}
      {chatDetails && (
        <RatingSellerModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          sellerId={chatDetails.vendorId}
          sellerName={chatDetails.vendorName}
          productId={chatDetails.product.id}
          onSubmit={handleRateSeller}
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
  flex: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.muted,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.xs,
  },
  headerContent: {
    flex: 1,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  avatarText: {
    color: palette.surface,
    fontSize: 14,
    fontWeight: "700",
  },
  userName: {
    fontSize: typography.body,
    fontWeight: "700",
    color: palette.text,
  },
  productContext: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    backgroundColor: "#FFF5F2", // Light orange
    borderBottomWidth: 1,
    borderBottomColor: "#FED7AA", // Orange-200
  },
  productImageContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    overflow: "hidden",
    marginRight: spacing.sm,
    backgroundColor: palette.surface,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  productInfo: {
    flex: 1,
  },
  productTitle: {
    fontSize: typography.caption,
    color: palette.text,
    fontWeight: "500",
  },
  productPrice: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: palette.primary,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    flexDirection: "row",
  },
  messageOwn: {
    justifyContent: "flex-end",
  },
  messageOther: {
    justifyContent: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: spacing.md,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  bubbleOwn: {
    backgroundColor: palette.primary,
    borderBottomRightRadius: 2,
  },
  bubbleOther: {
    backgroundColor: palette.surface,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: typography.body,
    marginBottom: 4,
  },
  textOwn: {
    color: palette.surface,
  },
  textOther: {
    color: palette.text,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  timeOwn: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  timeOther: {
    color: palette.textMuted,
  },
  statusIcon: {
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.muted,
  },
  input: {
    flex: 1,
    backgroundColor: palette.background,
    borderRadius: radius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: typography.body,
    color: palette.text,
    borderWidth: 1,
    borderColor: palette.muted,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    justifyContent: "center",
    alignItems: "center",
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: palette.muted,
    opacity: 0.7,
  },
  typingIndicator: {
    fontSize: 12,
    color: palette.textMuted,
    fontStyle: "italic" as const,
  },
  rateButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
});
