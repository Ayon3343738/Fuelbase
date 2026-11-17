import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useState } from "react";

import { doc, getDoc, getFirestore, writeBatch } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { app } from "../firebase/firebaseConfig";

const db = getFirestore(app);
const storage = getStorage(app);

const QUOTA_BY_VEHICLE_TYPE: Record<string, number> = {
  "Motor Cars": 20,
  "Three-Wheelers": 15,
  Motorcycles: 5,
  Buses: 200,
  Vans: 40,
  "Land Vehicles": 40,
  "Motor Lorry": 1,
  "Special Purpose Vehicles": 40,
};

export default function Register() {
  const router = useRouter();

  const [nic, setNic] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [phone, setPhone] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [loading, setLoading] = useState(false);

  // Select the QR image from the device gallery
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photo library to select the QR image.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled && result.assets.length > 0) {
        setQrImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);

      Alert.alert(
        "Image selection failed",
        "Unable to select the QR image. Please try again.",
      );
    }
  };

  // Upload the selected image to Firebase Storage.
  // Return the permanent download URL, not the local image URI.
  const uploadQRImage = async (
    imageUri: string,
    nicValue: string,
  ): Promise<string> => {
    let blob: Blob | undefined;

    try {
      const response = await fetch(imageUri);

      if (!response.ok) {
        throw new Error("Could not read the selected QR image.");
      }

      blob = await response.blob();

      const imageRef = ref(storage, `qrImages/${nicValue}/${Date.now()}.jpg`);

      await uploadBytes(imageRef, blob, {
        contentType: blob.type || "image/jpeg",
      });

      const downloadURL = await getDownloadURL(imageRef);

      return downloadURL;
    } finally {
      // Release the blob when supported by the runtime.
      if (
        blob &&
        "close" in blob &&
        typeof (blob as Blob & { close?: () => void }).close === "function"
      ) {
        (blob as Blob & { close: () => void }).close();
      }
    }
  };

  // Register the user
  const registerUser = async () => {
    if (loading) return;

    const cleanNic = nic.trim().toUpperCase();
    const cleanOwnerName = ownerName.trim();
    const cleanPhone = phone.trim();
    const cleanVehicleNumber = vehicleNumber.trim().toUpperCase();

    if (
      !cleanOwnerName ||
      !cleanNic ||
      !cleanPhone ||
      !cleanVehicleNumber ||
      !vehicleType ||
      !fuelType ||
      !qrImage
    ) {
      Alert.alert(
        "Missing information",
        "Please fill in all fields and select the QR image.",
      );
      return;
    }

    const assignedQuota = QUOTA_BY_VEHICLE_TYPE[vehicleType];

    if (assignedQuota === undefined) {
      Alert.alert(
        "Invalid vehicle category",
        "Please select a valid vehicle category.",
      );
      return;
    }

    // NIC validation
    const nicRegex = /^(\d{9}[VvXx]|\d{12})$/;

    if (!nicRegex.test(cleanNic)) {
      Alert.alert("Invalid NIC", "Please enter a valid NIC number.");
      return;
    }

    // Sri Lankan mobile number validation
    const phoneRegex = /^07\d{8}$/;

    if (!phoneRegex.test(cleanPhone)) {
      Alert.alert(
        "Invalid phone number",
        "Enter a valid 10-digit mobile number starting with 07.",
      );
      return;
    }

    // Vehicle number validation
    const vehicleRegex = /^[A-Z0-9 -]{4,9}$/;

    if (!vehicleRegex.test(cleanVehicleNumber)) {
      Alert.alert(
        "Invalid vehicle number",
        "Vehicle number must be 4 to 9 characters and can contain letters, numbers, spaces, and hyphens (-).",
      );
      return;
    }

    setLoading(true);

    try {
      // Check whether the NIC already exists
      const nicDoc = await getDoc(doc(db, "nicIndex", cleanNic));

      if (nicDoc.exists()) {
        Alert.alert(
          "Registration error",
          "This NIC number is already registered.",
        );
        return;
      }

      // Check whether the phone number already exists
      const phoneDoc = await getDoc(doc(db, "phoneIndex", cleanPhone));

      if (phoneDoc.exists()) {
        Alert.alert(
          "Registration error",
          "This phone number is already registered.",
        );
        return;
      }

      // Check whether the vehicle number already exists
      const vehicleDoc = await getDoc(
        doc(db, "vehicleIndex", cleanVehicleNumber),
      );

      if (vehicleDoc.exists()) {
        Alert.alert(
          "Registration error",
          "This vehicle number is already registered.",
        );
        return;
      }

      // Upload the QR image first and get its permanent URL
      const qrImageUrl = await uploadQRImage(qrImage, cleanNic);

      // Write profile + uniqueness indexes atomically
      const batch = writeBatch(db);

      batch.set(doc(db, "users", cleanNic), {
        ownerName: cleanOwnerName,
        nic: cleanNic,
        phone: cleanPhone,
        // Login + security rules match on this (+94 format)
        phoneE164: "+94" + cleanPhone.slice(1),
        vehicleNumber: cleanVehicleNumber,
        vehicleType,
        fuelType,
        qrImageUrl,
        remainingQuota: assignedQuota,
        createdAt: new Date(),
      });
      batch.set(doc(db, "nicIndex", cleanNic), { exist: true });
      batch.set(doc(db, "phoneIndex", cleanPhone), { exist: true });
      batch.set(doc(db, "vehicleIndex", cleanVehicleNumber), { exist: true });

      await batch.commit();

      Alert.alert("Registration okay");
      router.push("/Login");
    } catch (error) {
      console.log(error);
      Alert.alert(
        "Registration failed",
        (error as any)?.message ?? "Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.contain}>
      <ScrollView
        contentContainerStyle={styles.innerContainer}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={30} color="white" />
        </TouchableOpacity>

        <Text style={styles.head1}>
          Please Register with correct Phone number, NIC, Owner name, Vehicle
          type.
        </Text>

        <Text style={styles.title}>Vehicle Registration....</Text>

        {/* Owner name */}
        <TextInput
          placeholder="Owners name"
          style={styles.input}
          placeholderTextColor="#808080"
          value={ownerName}
          onChangeText={(text) => setOwnerName(text.replace(/[^A-Za-z ]/g, ""))}
          editable={!loading}
        />

        {/* NIC number */}
        <TextInput
          placeholder="NIC number"
          style={styles.input}
          placeholderTextColor="#808080"
          value={nic}
          autoCapitalize="characters"
          onChangeText={(text) =>
            setNic(text.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
          editable={!loading}
        />

        {/* Vehicle number */}
        <TextInput
          placeholder="Vehicle number"
          style={styles.input}
          placeholderTextColor="#808080"
          value={vehicleNumber}
          autoCapitalize="characters"
          maxLength={9}
          onChangeText={(text) =>
            setVehicleNumber(text.toUpperCase().replace(/[^A-Z0-9 -]/g, ""))
          }
          editable={!loading}
        />

        {/* Phone number */}
        <TextInput
          placeholder="Phone number"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#808080"
          value={phone}
          maxLength={10}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
          editable={!loading}
        />

        {/* Vehicle category */}
        <View style={styles.fuelRowT}>
          <Text style={styles.fueltypeT}>Vehicle category</Text>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Motor Cars")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Motor Cars" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motor cars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Three-Wheelers")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Three-Wheelers" && (
                <View style={styles.innerT} />
              )}
            </View>
            <Text style={styles.textRT}>Three-Wheelers</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Motorcycles")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Motorcycles" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motorcycles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Buses")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Buses" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Buses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Vans")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Vans" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Vans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Land Vehicles")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Land Vehicles" && (
                <View style={styles.innerT} />
              )}
            </View>
            <Text style={styles.textRT}>Land Vehicles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Motor Lorry")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Motor Lorry" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motor Lorry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Special Purpose Vehicles")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {vehicleType === "Special Purpose Vehicles" && (
                <View style={styles.innerT} />
              )}
            </View>
            <Text style={styles.textRT}>Special Purpose Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Fuel type */}
        <View style={styles.fuelRowT}>
          <Text style={styles.fueltypeT}>Fuel Type</Text>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setFuelType("Petrol")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {fuelType === "Petrol" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Petrol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setFuelType("Diesel")}
            disabled={loading}
          >
            <View style={styles.outerT}>
              {fuelType === "Diesel" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Diesel</Text>
          </TouchableOpacity>
        </View>

        {/* QR image selection */}
        <TouchableOpacity
          style={styles.imageButton}
          onPress={pickImage}
          disabled={loading}
        >
          {qrImage ? (
            <Image
              source={{ uri: qrImage }}
              style={styles.carImage}
              resizeMode="contain"
            />
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color="#666" />
              <Text>Select The QR</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Register button */}
        <TouchableOpacity
          style={[styles.button2, loading && styles.buttonDisabled]}
          onPress={registerUser}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#8B0000" />
              <Text style={styles.buttonText}> Registering...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  contain: {
    flex: 1,
    backgroundColor: "#8B0000",
  },

  innerContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 50,
  },

  head1: {
    paddingHorizontal: 20,
    fontWeight: "bold",
    fontSize: 15,
    marginTop: 5,
    textAlign: "center",
    fontFamily: "serif",
    color: "#fff",
    lineHeight: 30,
  },

  title: {
    color: "#FFA500",
    fontWeight: "bold",
    fontSize: 25,
    padding: 10,
  },

  input: {
    fontSize: 15,
    height: 50,
    width: "85%",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 15,
    fontStyle: "italic",
  },

  fuelRowT: {
    width: "100%",
    paddingLeft: 40,
    marginTop: 25,
  },

  fueltypeT: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
  },

  rowT: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  outerT: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },

  innerT: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FFA500",
  },

  textRT: {
    color: "#fff",
    fontSize: 18,
    marginLeft: 10,
  },

  button2: {
    backgroundColor: "#FFA500",
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    elevation: 3,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8B0000",
    textAlign: "center",
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 100,
  },

  carImage: {
    width: "100%",
    height: 180,
    borderRadius: 15,
  },

  imageButton: {
    width: "85%",
    height: 180,
    backgroundColor: "#fff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
    overflow: "hidden",
  },
});
