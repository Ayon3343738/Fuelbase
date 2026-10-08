import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { auth, db } from "../firebase/firebaseConfig";

type Transaction = {
  id: string;
  date: string;
  location: string;
  litres: number;
  amount: number;
};

export default function TransactionHistory() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [showFilter, setShowFilter] = useState(false);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      const user = auth.currentUser;

      if (!user) {
        console.log("No logged in user");
        return;
      }

      const q = query(
        collection(db, "transactions"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      const data: Transaction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Transaction, "id">),
      }));

      setTransactions(data);
    } catch (error) {
      console.log("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTransactions();
    }, []),
  );

  const filteredTransactions =
    filter === "All"
      ? transactions
      : transactions.filter((item) => item.location === filter);

  const formatAmount = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={38} color="white" />
        </TouchableOpacity>

        <Text style={styles.title}>Transaction History</Text>

        <View style={{ width: 38 }} />
      </View>

      {/* Filter */}
      <TouchableOpacity
        style={styles.filter}
        onPress={() => setShowFilter(!showFilter)}
      >
        <Text style={styles.filterText}>{filter}</Text>

        <Ionicons
          name={showFilter ? "chevron-up" : "chevron-down"}
          size={30}
          color="#e84372"
        />
      </TouchableOpacity>

      {showFilter && (
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setFilter("All");
              setShowFilter(false);
            }}
          >
            <Text style={styles.dropdownText}>All</Text>
          </TouchableOpacity>

          {[...new Set(transactions.map((item) => item.location))].map(
            (location) => (
              <TouchableOpacity
                key={location}
                style={styles.dropdownItem}
                onPress={() => {
                  setFilter(location);
                  setShowFilter(false);
                }}
              >
                <Text style={styles.dropdownText}>{location}</Text>
              </TouchableOpacity>
            ),
          )}
        </View>
      )}

      {/* Transactions */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="white"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No transactions found</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.transaction}>
              {/* Fuel icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="car-outline" size={45} color="black" />
              </View>

              {/* Details */}
              <View style={styles.details}>
                <Text style={styles.date}>{item.date}</Text>

                <Text style={styles.location}>{item.location}</Text>
              </View>

              {/* Amount */}
              <View style={styles.amountContainer}>
                <Text style={styles.litres}>
                  {Number(item.litres).toFixed(2)} L
                </Text>

                <Text style={styles.amount}>
                  {formatAmount(Number(item.amount))}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#df0000",
    borderRadius: 28,
    paddingTop: 40,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  title: {
    color: "white",
    fontSize: 25,
    fontWeight: "800",
  },

  filter: {
    height: 52,
    backgroundColor: "white",
    borderRadius: 30,
    marginHorizontal: 50,
    marginTop: 35,
    paddingHorizontal: 25,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  filterText: {
    color: "#b40000",
    fontSize: 28,
    fontWeight: "700",
  },

  dropdown: {
    backgroundColor: "white",
    marginHorizontal: 50,
    borderRadius: 15,
    marginTop: 5,
    overflow: "hidden",
  },

  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },

  dropdownText: {
    color: "#b40000",
    fontSize: 18,
    fontWeight: "600",
  },

  list: {
    paddingHorizontal: 50,
    paddingTop: 55,
    paddingBottom: 30,
  },

  transaction: {
    minHeight: 100,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "white",

    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 65,
    alignItems: "flex-start",
  },

  details: {
    flex: 1,
  },

  date: {
    color: "white",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },

  location: {
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },

  amountContainer: {
    alignItems: "flex-end",
  },

  litres: {
    color: "white",
    fontSize: 16,
    marginBottom: 4,
  },

  amount: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },

  emptyText: {
    color: "white",
    textAlign: "center",
    fontSize: 18,
    marginTop: 40,
  },
});
