import { useAuthStore } from "@/store/authStore";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { checkAuth, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      await checkAuth();
      await SplashScreen.hideAsync();
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
      <Stack.Screen name="chat/[conversationId]" />
      <Stack.Screen name="auth/login" />
      <Stack.Screen name="auth/register" />
    </Stack>
  );
}
