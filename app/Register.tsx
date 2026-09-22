import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

import { app } from "../firebase/firebaseConfig";

const db = getFirestore(app);

export default function Register() {
  const router = useRouter();

  const [nic, setNic] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [phone, setPhone] = useState("");
  const [fuelType, setFuelType] = useState("");
  const [qrImage, setQrImge] = useState("");

  const pickImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission good");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) {
      setQrImge(result.assets[0].uri);
    }
  };

  const registerUser = async () => {
    if (
      !ownerName ||
      !nic ||
      !phone ||
      !vehicleNumber ||
      !vehicleType ||
      !fuelType ||
      !qrImage
    ) {
      Alert.alert("Please fill the fields");
      return;
    }

    const nicRegex = /^(\d{9}[VvXx]|\d{12})$/;

    if (!nicRegex.test(nic.trim())) {
      Alert.alert("Invalid NIC");
      return;
    }

    const phoneRegex = /07\d{8}$/;

    if (!phoneRegex.test(phone)) {
      Alert.alert("Invalid Phone number");
      return;
    }

    // Phone number - exactly 10 digits
    const vehicleRegex = /^[A-Z0-9 -]{4,9}$/;

    if (!vehicleRegex.test(vehicleNumber.trim())) {
      Alert.alert(
        "Invalid Vehicle Number",
        "Vehicle number must be 4 to 9 characters and can contain letters, numbers, spaces, and hyphens (-).",
      );
      return;
    }

    // Vehicle number - 5 to 7 characters

    try {
      if ((await getDoc(doc(db, "nicIndex", nic))).exists()) {
        return Alert.alert("Error", "Nic issue");
      }

      if ((await getDoc(doc(db, "phoneIndex", phone))).exists()) {
        return Alert.alert("Error", "phone number issue");
      }

      if ((await getDoc(doc(db, "vehicleIndex", vehicleNumber))).exists()) {
        return Alert.alert("Error", "Vehicel number issue");
      }

      await setDoc(doc(db, "users", nic), {
        ownerName,
        nic,
        phone,
        vehicleNumber,
        vehicleType: vehicleType,
        fuelType,
        qrImage,
        createdAt: new Date(),
      });

      await setDoc(doc(db, "nicIndex", nic), { exist: true });
      await setDoc(doc(db, "phoneIndex", phone), { exist: true });
      await setDoc(doc(db, "vehicleIndex", vehicleNumber), { exist: true });

      Alert.alert("Registration okay");
      router.push("/Login");
    } catch (error) {
      console.log(error);
      Alert.alert("something wrong");
      Alert.alert("Firestore Error", JSON.stringify(error));
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

        <TextInput
          placeholder="Owners name"
          style={styles.input}
          placeholderTextColor={"#808080"}
          value={ownerName}
          onChangeText={(text) => setOwnerName(text.replace(/[^A-Za-z ]/g, ""))}
        />

        <TextInput
          placeholder="NIC number"
          style={styles.input}
          placeholderTextColor="#808080"
          value={nic}
          autoCapitalize="characters"
          onChangeText={(text) =>
            setNic(text.toUpperCase().replace(/[^A-Z0-9]/g, ""))
          }
        />
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
        />

        <TextInput
          placeholder="Phone number"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor={"#808080"}
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
        />

        {/* vehicel category*/}
        <View style={styles.fuelRowT}>
          <Text style={styles.fueltypeT}>Vehicel category</Text>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Motor Cars")}
          >
            <View style={styles.outerT}>
              {vehicleType === "Motor Cars" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motor cars</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Three-Wheelers")}
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
          >
            <View style={styles.outerT}>
              {vehicleType === "Motorcycles" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motorcycles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Buses")}
          >
            <View style={styles.outerT}>
              {vehicleType === "Buses" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Buses</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Vans")}
          >
            <View style={styles.outerT}>
              {vehicleType === "Vans" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Vans</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Land Vehicles")}
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
          >
            <View style={styles.outerT}>
              {vehicleType === "Motor Lorry" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Motor Lorry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setVehicleType("Special Purpose Vehicles")}
          >
            <View style={styles.outerT}>
              {vehicleType === "Special Purpose Vehicles" && (
                <View style={styles.innerT} />
              )}
            </View>
            <Text style={styles.textRT}>Special Purpose Vehicles</Text>
          </TouchableOpacity>
        </View>

        {/* Fuel Type */}
        <View style={styles.fuelRowT}>
          <Text style={styles.fueltypeT}>Fuel Type</Text>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setFuelType("Petrol")}
          >
            <View style={styles.outerT}>
              {fuelType === "Petrol" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Petrol</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.rowT}
            onPress={() => setFuelType("Diesel")}
          >
            <View style={styles.outerT}>
              {fuelType === "Diesel" && <View style={styles.innerT} />}
            </View>
            <Text style={styles.textRT}>Diesel</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
          {qrImage ? (
            <Image source={{ uri: qrImage }} style={styles.carImage} />
          ) : (
            <>
              <Ionicons name="image-outline" size={40} color="#666" />
              <Text>Select The QR </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.button2} onPress={registerUser}>
          <Text style={styles.buttonText}>Register</Text>
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
  },
  imagePreivie: {
    width: "100%",
    height: "100%",
    borderRadius: 10,
  },
});
