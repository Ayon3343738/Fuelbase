import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase/firebaseConfig";

export default function AddTransaction() {
  const router = useRouter();

  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [litres, setLitres] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const addTransaction = async () => {
    if (!date || !location || !litres || !amount) {
      Alert.alert("Missing information", "Please fill all fields.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Not logged in", "Please login before adding a transaction.");
      return;
    }

    try {
      setLoading(true);

      await addDoc(collection(db, "transactions"), {
        userId: user.uid,
        date,
        location,
        litres: Number(litres),
        amount: Number(amount),
        createdAt: serverTimestamp(),
      });

      Alert.alert("Success", "Transaction added successfully.", [
        {
          text: "OK",
          onPress: () => {
            router.replace("/transaction-history");
          },
        },
      ]);
    } catch (error) {
      console.log("Error adding transaction:", error);

      Alert.alert("Error", "Failed to add transaction.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={38} color="white" />
          </TouchableOpacity>

          <Text style={styles.title}>Add Transaction</Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={addTransaction}
            disabled={loading}
          >
            <Text style={styles.saveText}>{loading ? "..." : "Save"}</Text>
          </TouchableOpacity>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Date */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Date"
              placeholderTextColor="white"
              value={date}
              onChangeText={setDate}
            />

            <Ionicons name="calendar-outline" size={30} color="white" />
          </View>

          {/* Location */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="white"
              value={location}
              onChangeText={setLocation}
            />

            <Ionicons name="location" size={30} color="white" />
          </View>

          {/* Litres + Amount */}
          <View style={styles.row}>
            <View style={[styles.smallInputContainer, { marginRight: 15 }]}>
              <TextInput
                style={styles.smallInput}
                placeholder="Quota"
                placeholderTextColor="white"
                keyboardType="decimal-pad"
                value={litres}
                onChangeText={setLitres}
              />

              <Text style={styles.unit}>L</Text>
            </View>

            <View style={styles.smallInputContainer}>
              <Text style={styles.rupee}>Rs.</Text>

              <TextInput
                style={styles.amountInput}
                placeholder=""
                placeholderTextColor="white"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          {/* Add button */}
          <TouchableOpacity style={styles.addButton} onPress={addTransaction}>
            <Ionicons name="add" size={30} color="white" />

            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Example / Existing Transaction */}
        {/* <View style={styles.preview}>
          <Text style={styles.previewDate}>20 Aug 2026</Text>

          <Text style={styles.previewLocation}>Lanka Filling Station</Text>

          <Text style={styles.previewText}>3.00 L</Text>

          <Text style={styles.previewText}>Rs. 1200.00</Text>
        </View> */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#df0000",
    borderRadius: 28,
  },

  scroll: {
    paddingTop: 25,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },

  title: {
    color: "white",
    fontSize: 25,
    fontWeight: "800",
  },

  saveButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
  },

  saveText: {
    color: "#a80000",
    fontSize: 20,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 70,
    borderRadius: 15,
    padding: 15,
    paddingBottom: 15,
  },

  inputContainer: {
    height: 45,
    backgroundColor: "#d90000",
    borderRadius: 25,
    marginBottom: 15,

    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  input: {
    flex: 1,
    color: "white",
    fontSize: 24,
  },

  row: {
    flexDirection: "row",
  },

  smallInputContainer: {
    flex: 1,
    height: 55,
    backgroundColor: "#d90000",
    borderRadius: 25,

    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  smallInput: {
    flex: 1,
    color: "white",
    fontSize: 26,
  },

  unit: {
    color: "white",
    fontSize: 22,
  },

  rupee: {
    color: "white",
    fontSize: 22,
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    color: "white",
    fontSize: 22,
  },

  addButton: {
    backgroundColor: "#d90000",
    alignSelf: "flex-end",
    marginTop: 20,

    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 25,

    flexDirection: "row",
    alignItems: "center",
  },

  addText: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },

  preview: {
    marginHorizontal: 65,
    marginTop: 45,
    paddingTop: 10,
    paddingBottom: 20,

    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "white",
  },

  previewDate: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 5,
  },

  previewLocation: {
    color: "white",
    fontSize: 18,
    marginBottom: 5,
  },

  previewText: {
    color: "white",
    fontSize: 18,
    marginTop: 3,
  },
});
