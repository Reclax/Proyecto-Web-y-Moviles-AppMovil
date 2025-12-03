import { palette, radius, shadows, spacing, typography } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { WebView } from "react-native-webview";

interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationData) => void;
  initialPosition?: { lat: number; lng: number } | null;
}

// Quito, Ecuador como ubicación por defecto
const DEFAULT_LOCATION = {
  lat: -0.1807,
  lng: -78.4678,
};

export default function LocationPicker({
  visible,
  onClose,
  onLocationSelect,
  initialPosition = null,
}: LocationPickerProps) {
  const webViewRef = useRef<WebView>(null);
  const [position, setPosition] = useState<{ lat: number; lng: number }>(
    initialPosition || DEFAULT_LOCATION
  );
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  // Obtener dirección a partir de coordenadas usando Nominatim
  const getAddressFromCoords = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            "User-Agent": "ShopAndBuy-Mobile-App",
          },
        }
      );
      const data = (await response.json()) as {
        address?: {
          road?: string;
          house_number?: string;
          neighbourhood?: string;
          suburb?: string;
          city?: string;
          town?: string;
          village?: string;
          country?: string;
        };
        display_name?: string;
      };

      if (data.address) {
        const addr = data.address;
        let displayAddress = "";

        if (addr.road) {
          displayAddress = addr.road;
          if (addr.house_number)
            displayAddress = `${addr.road} ${addr.house_number}`;
        } else if (addr.neighbourhood) {
          displayAddress = addr.neighbourhood;
        } else if (addr.suburb) {
          displayAddress = addr.suburb;
        }

        if (addr.city) displayAddress += `, ${addr.city}`;
        else if (addr.town) displayAddress += `, ${addr.town}`;
        else if (addr.village) displayAddress += `, ${addr.village}`;

        if (addr.country) displayAddress += `, ${addr.country}`;

        return displayAddress || data.display_name || "";
      }

      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    } catch (error) {
      console.error("Error getting address:", error);
      return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    }
  }, []);

  // Obtener ubicación actual del dispositivo
  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permiso denegado",
          "Necesitamos acceso a tu ubicación para mostrar tu posición actual."
        );
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newPos = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setPosition(newPos);

      // Update map position via WebView
      if (webViewRef.current && mapReady) {
        webViewRef.current.injectJavaScript(`
          updateMapPosition(${newPos.lat}, ${newPos.lng});
          true;
        `);
      }

      const addr = await getAddressFromCoords(newPos.lat, newPos.lng);
      setAddress(addr);
    } catch (error) {
      console.error("Error getting location:", error);
      Alert.alert(
        "Error",
        "No se pudo obtener tu ubicación. Por favor, selecciona manualmente en el mapa."
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle messages from WebView
  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === "mapClick") {
        const newPos = { lat: data.lat, lng: data.lng };
        setPosition(newPos);
        setLoading(true);
        const addr = await getAddressFromCoords(data.lat, data.lng);
        setAddress(addr);
        setLoading(false);
      } else if (data.type === "mapReady") {
        setMapReady(true);
      }
    } catch (error) {
      console.error("Error parsing WebView message:", error);
    }
  };

  // Confirmar ubicación
  const handleConfirm = () => {
    if (position && address) {
      onLocationSelect({
        lat: position.lat,
        lng: position.lng,
        address: address,
      });
      onClose();
    } else {
      Alert.alert("Error", "Por favor, selecciona una ubicación en el mapa");
    }
  };

  // Reset cuando se cierra
  useEffect(() => {
    if (!visible) {
      setAddress("");
      setMapReady(false);
    } else if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [visible, initialPosition]);

  // HTML para el mapa Leaflet embebido
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; }
        #map { width: 100%; height: 100%; }
        .leaflet-control-attribution { display: none; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', {
          zoomControl: true,
          attributionControl: false
        }).setView([${position.lat}, ${position.lng}], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        var marker = L.marker([${position.lat}, ${position.lng}], { draggable: true }).addTo(map);

        // Click on map
        map.on('click', function(e) {
          marker.setLatLng(e.latlng);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        });

        // Marker drag
        marker.on('dragend', function(e) {
          var latlng = marker.getLatLng();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'mapClick',
            lat: latlng.lat,
            lng: latlng.lng
          }));
        });

        // Update position from React Native
        window.updateMapPosition = function(lat, lng) {
          map.setView([lat, lng], 15);
          marker.setLatLng([lat, lng]);
        };

        // Notify React Native that map is ready
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
      </script>
    </body>
    </html>
  `;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Selecciona tu ubicación</Text>
            <Text style={styles.subtitle}>
              Toca el mapa o usa tu ubicación actual
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={palette.text} />
          </TouchableOpacity>
        </View>

        {/* Selected Address */}
        {address ? (
          <View style={styles.addressContainer}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={20} color={palette.primary} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Ubicación seleccionada:</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Map */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.map}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            renderLoading={() => (
              <View style={styles.mapLoading}>
                <ActivityIndicator size="large" color={palette.primary} />
                <Text style={styles.mapLoadingText}>Cargando mapa...</Text>
              </View>
            )}
          />

          {/* Location Button */}
          <TouchableOpacity
            style={styles.locationButton}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={palette.primary} />
            ) : (
              <Ionicons name="navigate" size={22} color={palette.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!address || loading) && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!address || loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: palette.surface,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: "700",
    color: palette.text,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    color: palette.textMuted,
    marginTop: spacing.xs,
  },
  closeButton: {
    padding: spacing.sm,
    marginLeft: spacing.md,
  },
  addressContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#FDBA74",
  },
  addressIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: palette.text,
  },
  addressText: {
    fontSize: typography.sizes.sm,
    color: palette.textMuted,
    marginTop: 2,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  map: {
    flex: 1,
  },
  mapLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
  },
  mapLoadingText: {
    marginTop: spacing.sm,
    color: palette.textMuted,
    fontSize: typography.sizes.sm,
  },
  locationButton: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    backgroundColor: palette.surface,
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: palette.surface,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: palette.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonDisabled: {
    backgroundColor: palette.muted,
  },
  confirmButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: "600",
    color: "#fff",
  },
});
