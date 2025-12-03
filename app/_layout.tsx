import pushNotificationService from "@/services/pushNotifications";
import websocketService from "@/services/websocket";
import { useActiveChatStore } from "@/store/activeChatStore";
import { useAuthStore } from "@/store/authStore";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { checkAuth, isAuthenticated } = useAuthStore();
  const activeConversationId = useActiveChatStore(
    (state) => state.activeConversationId
  );
  const appState = useRef(AppState.currentState);
  const wsConnected = useRef(false);

  // Initialize push notifications
  useEffect(() => {
    const initPushNotifications = async () => {
      console.log("[RootLayout] Initializing push notifications...");
      await pushNotificationService.initialize();
    };

    initPushNotifications();

    return () => {
      pushNotificationService.cleanup();
    };
  }, []);

  // Connect WebSocket when authenticated
  useEffect(() => {
    const connectWebSocket = async () => {
      if (isAuthenticated && !wsConnected.current) {
        console.log("[RootLayout] User authenticated, connecting WebSocket...");
        try {
          await websocketService.connect();
          wsConnected.current = true;
          console.log("[RootLayout] WebSocket connected successfully");
        } catch (error) {
          console.error("[RootLayout] WebSocket connection error:", error);
          wsConnected.current = false;
        }
      } else if (!isAuthenticated && wsConnected.current) {
        console.log("[RootLayout] User logged out, disconnecting WebSocket...");
        websocketService.disconnect();
        wsConnected.current = false;
      }
    };

    connectWebSocket();
  }, [isAuthenticated]);

  // Setup WebSocket notification listeners when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleNewMessage = (payload: any) => {
      console.log("[RootLayout] New message received:", payload);
      // Don't show notification if user is viewing this conversation
      const isInActiveConversation =
        activeConversationId === payload.conversationId;

      // Don't show if user is actively viewing this conversation
      if (isInActiveConversation && appState.current === "active") {
        console.log(
          "[RootLayout] User is in this conversation, not showing notification"
        );
        return;
      }

      const senderName =
        payload.senderName || payload.sender?.name || "Nuevo mensaje";
      const content = payload.content || "Tienes un nuevo mensaje";
      console.log("[RootLayout] Showing push notification for message");
      pushNotificationService.showMessageNotification(
        senderName,
        content,
        payload.conversationId,
        payload.senderId
      );
    };

    const handleNewNotification = (payload: any) => {
      console.log("[RootLayout] New notification received:", payload);
      // Show push notification for all notification types
      const title = payload.title || "Nueva notificación";
      const message = payload.message || payload.content || "";

      if (payload.typeId === 1) {
        // Message notification - already handled by handleNewMessage
        return;
      } else if (payload.typeId === 2) {
        // Product notification
        pushNotificationService.showProductNotification(
          title,
          message,
          payload.productId
        );
      } else {
        // General notification
        pushNotificationService.showGeneralNotification(
          title,
          message,
          payload.id
        );
      }
    };

    // Listen to WebSocket events
    websocketService.on("newMessage", handleNewMessage);
    websocketService.on("newNotification", handleNewNotification);

    return () => {
      websocketService.off("newMessage", handleNewMessage);
      websocketService.off("newNotification", handleNewNotification);
    };
  }, [isAuthenticated, activeConversationId]);

  // Track app state for notification handling
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      console.log("[RootLayout] Starting auth initialization...");
      try {
        // Add timeout to prevent infinite loading
        const authPromise = checkAuth();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Auth check timeout")), 10000)
        );

        await Promise.race([authPromise, timeoutPromise]);
        console.log("[RootLayout] Auth check completed");
      } catch (error) {
        console.error("[RootLayout] Auth initialization error:", error);
      } finally {
        await SplashScreen.hideAsync();
        console.log("[RootLayout] Splash hidden");
      }
    };

    initAuth();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="producto/[id]" />
      <Stack.Screen name="categorias" />
      <Stack.Screen name="favoritos" />
      <Stack.Screen name="mis-productos" />
      <Stack.Screen name="notificaciones" />
      <Stack.Screen name="configuracion" />
      <Stack.Screen name="chat/[conversationId]" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
    </Stack>
  );
}
