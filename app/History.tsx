import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../firebase/firebaseConfig";

type Transaction = {
  id: string;
  date: string;
  location: string;
  litres: number;
  amount: number;
  latitude?: number;
  longitude?: number;
  createdAt?: Timestamp | null;
};

export default function History() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Listen for the logged-in user's transactions.
  useEffect(() => {
    let unsubscribeTransactions: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeTransactions?.();
      unsubscribeTransactions = undefined;

      if (!user) {
        setTransactions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

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
                location: data.location ?? "Unknown location",
                litres: Number(data.litres ?? 0),
                amount: Number(data.amount ?? 0),
                latitude: data.latitude,
                longitude: data.longitude,
                createdAt: data.createdAt ?? null,
              };
            },
          );

          // Newest transaction first.
          savedTransactions.sort((a, b) => {
            const timeA =
              a.createdAt?.toMillis() ?? new Date(a.date).getTime() ?? 0;

            const timeB =
              b.createdAt?.toMillis() ?? new Date(b.date).getTime() ?? 0;

            return timeB - timeA;
          });

          setTransactions(savedTransactions);
          setLoading(false);
        },
        (error) => {
          console.error("History loading error:", error);
          setLoading(false);

          Alert.alert("Error", "Unable to load transaction history.");
        },
      );
    });

    return () => {
      unsubscribeTransactions?.();
      unsubscribeAuth();
    };
  }, []);

  // Calculate total spending.
  const totalAmount = transactions.reduce(
    (total, item) => total + item.amount,
    0,
  );

  // Calculate total litres.
  const totalLitres = transactions.reduce(
    (total, item) => total + item.litres,
    0,
  );

  // Format date for display.
  const formatDate = (value: string) => {
    if (!value) return "Date unavailable";

    const parts = value.split("-");

    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    return value;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#E00000" />

      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={27} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Transaction History</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Ionicons name="wallet-outline" size={30} color="#E00000" />

              <Text style={styles.summaryLabel}>Total Spent</Text>

              <Text style={styles.summaryValue}>
                Rs. {totalAmount.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Ionicons name="water-outline" size={30} color="#E00000" />

              <Text style={styles.summaryLabel}>Total Litres</Text>

              <Text style={styles.summaryValue}>
                {totalLitres.toFixed(2)} L
              </Text>
            </View>
          </View>

          {/* Transaction Count */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>

            <Text style={styles.transactionCount}>
              {transactions.length} transactions
            </Text>
          </View>

          {/* Loading */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#E00000" />

              <Text style={styles.loadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            /* Empty State */
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={65} color="#BBBBBB" />

              <Text style={styles.emptyTitle}>No Transactions Yet</Text>

              <Text style={styles.emptyText}>
                Your saved fuel transactions will appear here.
              </Text>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push("/add-transaction")}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />

                <Text style={styles.addButtonText}>Add Transaction</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Transaction List */
            <View style={styles.transactionList}>
              {transactions.map((item) => (
                <View key={item.id} style={styles.transactionCard}>
                  <View style={styles.transactionTop}>
                    <View style={styles.locationRow}>
                      <View style={styles.locationIcon}>
                        <Ionicons name="location" size={23} color="#E00000" />
                      </View>

                      <View style={styles.locationInfo}>
                        <Text style={styles.locationText} numberOfLines={2}>
                          {item.location}
                        </Text>

                        <Text style={styles.dateText}>
                          {formatDate(item.date)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.amountText}>
                      Rs. {item.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.transactionDivider} />

                  <View style={styles.transactionBottom}>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="water-outline"
                        size={19}
                        color="#777777"
                      />

                      <Text style={styles.detailText}>
                        {item.litres.toFixed(2)} L
                      </Text>
                    </View>

                    <View style={styles.detailItem}>
                      <Ionicons
                        name="receipt-outline"
                        size={19}
                        color="#777777"
                      />

                      <Text style={styles.detailText}>Fuel Purchase</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E00000",
  },

  container: {
    flex: 1,
    backgroundColor: "#E00000",
  },

  header: {
    height: 90,
    backgroundColor: "#E00000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  backButton: {
    width: 45,
    height: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "800",
    marginLeft: 12,
  },

  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
  },

  summaryCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    minHeight: 135,
    justifyContent: "center",
    elevation: 3,
  },

  summaryLabel: {
    color: "#777777",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 10,
  },

  summaryValue: {
    color: "#222222",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 5,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },

  sectionTitle: {
    color: "#222222",
    fontSize: 21,
    fontWeight: "800",
  },

  transactionCount: {
    color: "#777777",
    fontSize: 12,
  },

  centerContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },

  loadingText: {
    color: "#777777",
    marginTop: 12,
    fontSize: 15,
  },

  emptyContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    marginTop: 10,
  },

  emptyTitle: {
    color: "#222222",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 15,
  },

  emptyText: {
    color: "#888888",
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },

  addButton: {
    backgroundColor: "#E00000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 22,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 6,
  },

  transactionList: {
    gap: 13,
  },

  transactionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 16,
    elevation: 2,
  },

  transactionTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },

  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 22,
    backgroundColor: "#FFF0F0",
    justifyContent: "center",
    alignItems: "center",
  },

  locationInfo: {
    flex: 1,
    marginLeft: 10,
  },

  locationText: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "700",
  },

  dateText: {
    color: "#888888",
    fontSize: 12,
    marginTop: 5,
  },

  amountText: {
    color: "#D00000",
    fontSize: 15,
    fontWeight: "800",
  },

  transactionDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 14,
  },

  transactionBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  detailText: {
    color: "#666666",
    fontSize: 13,
    fontWeight: "600",
  },
});
