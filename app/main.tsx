
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const COLOURS = {
  yellow: "#FFC107",
  yellowLight: "#FFF3CD",
  yellowDark: "#B8860B",
  red: "#E53935",
  redLight: "#FDE8E7",
  redDark: "#8E1C1C",
  white: "#FFFFFF",
};

export default function HoomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.cardLabel}>Hello name</Text>

        <View style={[styles.card, styles.cardquata]}>
          <View style={styles.quata12}>
            <Text style={styles.cardLabel}>Remaining Quata</Text>

            <Text style={styles.quataValue}>20.00L</Text>
          </View>

          <View style={styles.quatawrap}>
            <Ionicons name="water" size={26} color={COLOURS.yellow} />
          </View>
        </View>

        <View>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.card, styles.cardquata]}
            onPress={() => router.push("/add-transaction")}
          >
            <Text style={styles.tranlab}>Add transaction</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.card, styles.cardquata]}
            onPress={() => router.push("/transaction-history")}
          >
            <Text style={styles.tranlab}>Transaction History</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLOURS.white,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "800",
    color: COLOURS.redDark,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardquata: {
    backgroundColor: COLOURS.yellowLight,
    borderWidth: 1,
    borderColor: COLOURS.yellow,
  },
  quata12: {
    fontSize: 15,
    color: COLOURS.yellowDark,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 15,
    color: COLOURS.yellowDark,
    marginBottom: 6,
  },
  quatawrap: {},
  quataValue: {
    fontSize: 25,
    fontWeight: "800",
    color: COLOURS.yellowDark,
  },
  tranlab: {
    fontSize: 17,
    fontWeight: "600",
    color: COLOURS.redDark,
  },
});
