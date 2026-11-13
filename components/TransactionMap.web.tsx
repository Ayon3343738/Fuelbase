import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates, placeName?: string) => void;
  onClose: () => void;
};

export default function TransactionMap({
  visible,
  coordinates,
  onSelect,
  onClose,
}: Props) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [selected, setSelected] = useState<Coordinates | null>(coordinates);

  useEffect(() => {
    if (!visible || typeof window === "undefined" || !mapElement.current) {
      return;
    }

    let cancelled = false;
    let map: any = null;
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;

    const initializeMap = async () => {
      try {
        // Load Leaflet only in the browser
        const L = await import("leaflet");
        await import("leaflet/dist/leaflet.css");

        if (cancelled || !mapElement.current) return;

        const initial = coordinates ?? {
          latitude: 7.8731,
          longitude: 80.7718,
        };

        map = L.map(mapElement.current, {
          center: [initial.latitude, initial.longitude],
          zoom: coordinates ? 15 : 8,
        });

        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        const markerIcon = L.divIcon({
          className: "",
          html: `
            <div style="
              width: 20px;
              height: 20px;
              background: #CC0A0A;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            "></div>
          `,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        });

        const marker = L.marker([initial.latitude, initial.longitude], {
          draggable: true,
          icon: markerIcon,
        }).addTo(map);

        markerRef.current = marker;
        setSelected(initial);

        const updateLocation = (lat: number, lng: number) => {
          setSelected({
            latitude: lat,
            longitude: lng,
          });
        };

        map.on("click", (event: any) => {
          marker.setLatLng(event.latlng);
          updateLocation(event.latlng.lat, event.latlng.lng);
        });

        marker.on("dragend", () => {
          const position = marker.getLatLng();
          updateLocation(position.lat, position.lng);
        });

        resizeTimer = setTimeout(() => {
          if (!cancelled && map) {
            map.invalidateSize();
          }
        }, 300);
      } catch (error) {
        console.error("Leaflet map initialization error:", error);
      }
    };

    initializeMap();

    return () => {
      cancelled = true;

      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }

      if (map) {
        map.remove();
      }

      mapRef.current = null;
      markerRef.current = null;
    };
  }, [visible]);

  useEffect(() => {
    if (visible && coordinates) {
      setSelected(coordinates);

      if (mapRef.current && markerRef.current) {
        const position: [number, number] = [
          coordinates.latitude,
          coordinates.longitude,
        ];

        markerRef.current.setLatLng(position);
        mapRef.current.setView(position, 15);
      }
    }
  }, [visible, coordinates]);

  const confirmLocation = () => {
    if (!selected) {
      alert("Please select a location on the map.");
      return;
    }

    onSelect(selected);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
          padding: 15,
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 15,
            height: "85%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Select Fuel Station Location
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: "#CC0A0A", fontSize: 17 }}>Close</Text>
            </TouchableOpacity>
          </View>

          <View
            ref={mapElement as any}
            style={{
              flex: 1,
              width: "100%",
              minHeight: 300,
              overflow: "hidden",
            }}
          />

          <Text style={{ marginVertical: 10, color: "#444" }}>
            {selected
              ? `Latitude: ${selected.latitude.toFixed(6)} | Longitude: ${selected.longitude.toFixed(6)}`
              : "Tap the map or drag the marker to select a location."}
          </Text>

          <TouchableOpacity
            onPress={confirmLocation}
            style={{
              backgroundColor: "#CC0A0A",
              padding: 14,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: "white",
                textAlign: "center",
                fontWeight: "bold",
                fontSize: 17,
              }}
            >
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
