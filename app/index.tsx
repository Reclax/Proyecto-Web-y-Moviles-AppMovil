import { useAuthStore } from "@/store/authStore";
import { palette } from "@/theme";
import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    console.log('[Index] Current state - isLoading:', isLoading, 'isAuthenticated:', isAuthenticated);
  }, [isLoading, isAuthenticated]);

  if (isLoading) {
    console.log('[Index] Showing loading indicator...');
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={palette.primary} />
      </View>
    );
  }

  console.log('[Index] Redirecting to:', isAuthenticated ? "/(tabs)" : "/auth/login");
  return <Redirect href={isAuthenticated ? "/(tabs)" : "/auth/login"} />;
}
