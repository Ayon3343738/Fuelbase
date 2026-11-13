import { Modal, Text, TouchableOpacity, View } from "react-native";

import MapView, { Marker } from "react-native-maps";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  coordinates: Coordinates | null;
  onSelect: (coordinates: Coordinates) => void;
  onClose: () => void;
};

export default function TransactionMap({
  visible,
  coordinates,
  onSelect,
  onClose,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: "white" }}>
        <View
          style={{
            padding: 18,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            Select Fuel Station Location
          </Text>

          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: "red", fontSize: 18 }}>Close</Text>
          </TouchableOpacity>
        </View>

        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: coordinates?.latitude ?? 7.8731,
            longitude: coordinates?.longitude ?? 80.7718,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={(event) => {
            onSelect(event.nativeEvent.coordinate);
          }}
        >
          {coordinates && (
            <Marker coordinate={coordinates} title="Selected Location" />
          )}
        </MapView>

        <Text style={{ textAlign: "center", padding: 12 }}>
          Tap the map to select the fuel station.
        </Text>

        <TouchableOpacity
          onPress={onClose}
          style={{
            backgroundColor: "#CC0A0A",
            margin: 15,
            padding: 15,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              color: "white",
              textAlign: "center",
              fontWeight: "bold",
            }}
          >
            Confirm Location
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}
