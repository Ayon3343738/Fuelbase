import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { useEffect, useState } from "react";

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

import TransactionDatePicker from "../components/TransactionDatePicker.web";
import TransactionMap from "../components/TransactionMap.web";
import { auth, db } from "../firebase/firebaseConfig";

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Transaction = {
  id: string;
  date: string;
  location: string;
  latitude?: number;
  longitude?: number;
  litres: number;
  amount: number;
  pricePerLitre?: number;
};

export default function AddTransaction() {
  const router = useRouter();

  // Form states
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);

  const [litres, setLitres] = useState("");
  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(false);

  // Picker and map states
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Saved transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Format date as YYYY-MM-DD
  const formatDate = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  // Select date
  const handleDateSelect = (value: Date) => {
    setSelectedDate(value);
    setDate(formatDate(value));
    setShowDatePicker(false);
  };

  // Select map location
  const handleMapSelect = (point: Coordinates, placeName?: string) => {
    setCoordinates(point);

    setLocation(
      placeName ||
        `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`,
    );
  };

  // Clean numeric input
  const cleanNumber = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");

    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("");
    }

    return cleaned;
  };

  // Validate positive numbers with up to two decimal places
  const validateNumber = (value: string) => {
    return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;
  };

  // Load transactions based on authentication state
  useEffect(() => {
    let unsubscribeTransactions: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      // Stop previous listener when authentication changes
      unsubscribeTransactions?.();
      unsubscribeTransactions = undefined;

      if (!user) {
        setTransactions([]);
        return;
      }

      const transactionQuery = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
      );

      unsubscribeTransactions = onSnapshot(
        transactionQuery,
        (snapshot) => {
          const savedTransactions: Transaction[] = snapshot.docs.map(
            (document) => {
              const data = document.data();

              return {
                id: document.id,
                date: data.date ?? "",
                location: data.location ?? "",
                latitude: data.latitude,
                longitude: data.longitude,
                litres: Number(data.litres ?? 0),
                amount: Number(data.amount ?? 0),
                pricePerLitre:
                  data.pricePerLitre != null
                    ? Number(data.pricePerLitre)
                    : undefined,
              };
            },
          );

          savedTransactions.sort((a, b) => b.date.localeCompare(a.date));

          setTransactions(savedTransactions);

          console.log("Transactions loaded:", savedTransactions);
        },
        (error) => {
          console.error("Transaction loading error:", error);

          Alert.alert(
            "Error",
            "Unable to load saved transactions. Please check your connection.",
          );
        },
      );
    });

    // Cleanup listeners
    return () => {
      unsubscribeTransactions?.();
      unsubscribeAuth();
    };
  }, []);

  // Save transaction
  const addTransaction = async () => {
    if (!date || !location || !coordinates || !litres || !amount) {
      Alert.alert("Missing information", "Please complete all fields.");
      return;
    }

    if (!validateNumber(amount)) {
      Alert.alert(
        "Invalid amount",
        "Enter a valid positive amount with up to two decimal places.",
      );
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
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        litres: Number(litres),
        amount: Number(amount),
        createdAt: serverTimestamp(),
      });

      // Clear form after successful save
      setDate("");
      setLocation("");
      setCoordinates(null);
      setLitres("");
      setAmount("");

      setSelectedDate(new Date());

      Alert.alert("Success", "Transaction added successfully.");

      // Firestore listener automatically updates the transaction list.
    } catch (error) {
      console.error("Error adding transaction:", error);

      Alert.alert("Error", "Failed to add transaction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={28} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Add Transaction</Text>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={addTransaction}
            disabled={loading}
          >
            <Text style={styles.saveText}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction form */}
        <View style={styles.card}>
          {/* Date */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowDatePicker(true)}
            disabled={loading}
          >
            <Text style={styles.input}>{date || "Select Date"}</Text>

            <Ionicons name="calendar-outline" size={30} color="white" />
          </TouchableOpacity>

          <TransactionDatePicker
            visible={showDatePicker}
            value={selectedDate}
            onChange={handleDateSelect}
            onClose={() => setShowDatePicker(false)}
          />

          {/* Location */}
          <TouchableOpacity
            style={styles.inputContainer}
            onPress={() => setShowMap(true)}
            disabled={loading}
          >
            <Text style={styles.input} numberOfLines={1}>
              {location || "Select Fuel Station Location"}
            </Text>

            <Ionicons name="location" size={30} color="white" />
          </TouchableOpacity>

          <TransactionMap
            visible={showMap}
            coordinates={coordinates}
            onSelect={handleMapSelect}
            onClose={() => setShowMap(false)}
          />

          {/* Litres and Amount */}
          <View style={styles.row}>
            <View style={[styles.smallInputContainer, { marginRight: 15 }]}>
              <TextInput
                style={styles.smallInput}
                placeholder="Litres"
                placeholderTextColor="white"
                keyboardType="decimal-pad"
                value={litres}
                onChangeText={(value) => setLitres(cleanNumber(value))}
                editable={!loading}
              />

              <Text style={styles.unit}>L</Text>
            </View>

            <View style={styles.smallInputContainer}>
              <Text style={styles.rupee}>Rs.</Text>

              <TextInput
                style={styles.amountInput}
                placeholder="Amount"
                placeholderTextColor="white"
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={(value) => setAmount(cleanNumber(value))}
                editable={!loading}
              />
            </View>
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[styles.addButton, loading && { opacity: 0.6 }]}
            onPress={addTransaction}
            disabled={loading}
          >
            <Ionicons name="add" size={30} color="white" />

            <Text style={styles.addText}>{loading ? "Adding..." : "Add"}</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Transactions */}
        <View style={styles.transactionList}>
          {transactions.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <Text style={styles.transactionDate}>{item.date}</Text>

              <Text style={styles.transactionLocation}>{item.location}</Text>

              <Text style={styles.transactionDetails}>
                {item.litres.toFixed(2)} L
              </Text>

              <Text style={styles.transactionAmount}>
                Rs. {item.amount.toFixed(2)}
              </Text>
            </View>
          ))}

          {transactions.length === 0 && (
            <Text style={styles.emptyTransactions}>
              No transactions added yet.
            </Text>
          )}
        </View>
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
    marginTop: 30,
  },

  saveButton: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 30,
  },

  saveText: {
    color: "#a80000",
    fontSize: 18,
    fontWeight: "800",
  },

  card: {
    backgroundColor: "white",
    marginHorizontal: 20,
    marginTop: 70,
    borderRadius: 15,
    padding: 15,
  },

  inputContainer: {
    height: 50,
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
    fontSize: 19,
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
    paddingHorizontal: 12,
  },

  smallInput: {
    flex: 1,
    color: "white",
    fontSize: 20,
    minWidth: 0,
  },

  unit: {
    color: "white",
    fontSize: 20,
  },

  rupee: {
    color: "white",
    fontSize: 18,
    marginRight: 5,
  },

  amountInput: {
    flex: 1,
    color: "white",
    fontSize: 18,
    minWidth: 0,
  },

  addButton: {
    backgroundColor: "#d90000",
    alignSelf: "flex-end",
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
  },

  addText: {
    color: "white",
    fontSize: 22,
    fontWeight: "800",
  },

  // Transaction list styles
  transactionList: {
    marginHorizontal: 26,
    marginTop: 20,
    paddingBottom: 20,
  },

  transactionItem: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    paddingVertical: 8,
    marginBottom: 5,
  },

  transactionDate: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },

  transactionLocation: {
    color: "white",
    fontSize: 12,
    marginTop: 2,
  },

  transactionDetails: {
    color: "white",
    fontSize: 12,
    marginTop: 2,
  },

  transactionAmount: {
    color: "white",
    fontSize: 13,
    marginTop: 2,
  },

  emptyTransactions: {
    color: "white",
    textAlign: "center",
    marginTop: 15,
  },

  backBtn: {
    position: "absolute",
    left: 20,
  },
});
