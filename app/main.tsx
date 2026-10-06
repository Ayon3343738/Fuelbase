import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function MainScreen() {
  const router = useRouter();

  // Temporary values
  // You can connect these to Firebase later.
  const userName = "Name";
  const remainingQuota = 20.0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#E00000" />

      <View style={styles.container}>
        {/* =========================
            HEADER
        ========================== */}

        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {userName}</Text>
        </View>

        {/* =========================
            MAIN CONTENT
        ========================== */}

        <View style={styles.content}>
          {/* Remaining Quota */}

          <View style={styles.quotaCard}>
            <Text style={styles.quotaTitle}>Remaining Quota</Text>

            <Text style={styles.quotaValue}>{remainingQuota.toFixed(2)} L</Text>
          </View>

          {/* Add Transaction */}

          <TouchableOpacity
            style={styles.transactionCard}
            activeOpacity={0.8}
            onPress={() => router.push("/Login")}
          >
            <Text style={styles.transactionText}>Add Transaction</Text>

            <View style={styles.transactionIcon}>
              <Ionicons name="swap-horizontal" size={40} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* =========================
            BOTTOM NAVIGATION
        ========================== */}

        <View style={styles.bottomNavigation}>
          {/* HOME */}

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.replace("/main")}
          >
            <Ionicons name="home" size={45} color="#FFFFFF" />

            <Text style={styles.navText}>Home</Text>
          </TouchableOpacity>

          {/* MAPS */}

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push("/Login")}
          >
            <Ionicons name="location" size={45} color="#FFFFFF" />

            <Text style={styles.navText}>Maps</Text>
          </TouchableOpacity>

          {/* TRANSACTION HISTORY */}

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push("/ProfileScreen")}
          >
            <Ionicons name="time" size={45} color="#FFFFFF" />

            <Text style={styles.navText}>Transaction{"\n"}History</Text>
          </TouchableOpacity>

          {/* PROFILE */}

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => router.push("/ProfileScreen")}
          >
            <Ionicons name="person" size={45} color="#FFFFFF" />

            <Text style={styles.navText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  // =========================
  // SAFE AREA
  // =========================

  safeArea: {
    flex: 1,
    backgroundColor: "#E00000",
  },

  // =========================
  // MAIN CONTAINER
  // =========================

  container: {
    flex: 1,
    backgroundColor: "#E00000",

    // Small horizontal margin
    // so cards don't touch screen edges
    paddingHorizontal: 20,
  },

  // =========================
  // HEADER
  // =========================

  header: {
    height: 120,

    justifyContent: "center",

    paddingLeft: 25,

    paddingTop: 15,
  },

  greeting: {
    color: "#FFFFFF",

    fontSize: 38,

    fontWeight: "700",
  },

  // =========================
  // CONTENT
  // =========================

  content: {
    flex: 1,

    // Space between header
    // and first card
    paddingTop: 65,
  },

  // =========================
  // REMAINING QUOTA
  // =========================

  quotaCard: {
    backgroundColor: "#FFFFFF",

    height: 145,

    borderRadius: 25,

    paddingHorizontal: 30,

    justifyContent: "center",

    marginBottom: 25,
  },

  quotaTitle: {
    color: "#C90000",

    fontSize: 26,

    fontWeight: "700",

    marginBottom: 7,
  },

  quotaValue: {
    color: "#C90000",

    fontSize: 28,

    fontWeight: "600",
  },

  // =========================
  // ADD TRANSACTION
  // =========================

  transactionCard: {
    backgroundColor: "#FFFFFF",

    height: 145,

    borderRadius: 25,

    paddingHorizontal: 30,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  transactionText: {
    color: "#C90000",

    fontSize: 26,

    fontWeight: "700",

    flexShrink: 1,
  },

  // =========================
  // TRANSACTION ICON
  // =========================

  transactionIcon: {
    width: 65,

    height: 65,

    borderRadius: 33,

    backgroundColor: "#E00000",

    justifyContent: "center",

    alignItems: "center",

    marginLeft: 10,
  },

  // =========================
  // BOTTOM NAVIGATION
  // =========================

  bottomNavigation: {
    height: 105,

    backgroundColor: "#E00000",

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingHorizontal: 5,

    paddingBottom: 5,
  },

  // =========================
  // NAV ITEM
  // =========================

  navItem: {
    flex: 1,

    alignItems: "center",

    justifyContent: "center",
  },

  // =========================
  // NAV TEXT
  // =========================

  navText: {
    color: "#111111",

    fontSize: 14,

    fontWeight: "700",

    textAlign: "center",

    marginTop: 4,

    lineHeight: 17,
  },
});
