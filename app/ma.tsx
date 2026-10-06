
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

        <TouchableOpacity
          activeOpacity={0.8}
          style={[styles.card, styles.cardquata]}
          onPress={() => router.push("/Login")}
        >
          <Text style={styles.tranlab}>Add transaction</Text>
        </TouchableOpacity>

        <View style={styles.space} />

        <View style={styles.botnav}>
          <NavButton
            icon="home"
            label="Home"
            active
            onPress={() => router.push("/Login")}
          />

          <NavButton
            icon="location"
            label="Maps"
            active
            onPress={() => router.push("/Login")}
          />

          <NavButton
            icon="pie-chart"
            label="Transactions"
            active
            onPress={() => router.push("/Login")}
          />

          <NavButton
            icon="person"
            label="Profile"
            active
            onPress={() => router.push("/ProfileScreen")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
function NavButton({
  icon,
  label,
  active = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: String;
  active?: boolean;
  onPress: () => void;
}) {
  const color = active ? COLOURS.red : COLOURS.yellowDark;

  return (
    <TouchableOpacity
      style={styles.navButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={22} color={color} />

      <Text
        style={[styles.navLabel, { color: color }]}
        numberOfLines={1}
      ></Text>
    </TouchableOpacity>
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
    padding: 38,
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
    fontSize: 25,
    color: COLOURS.yellowDark,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 30,
    color: COLOURS.yellowDark,
    marginBottom: 35,
    marginTop: 10,
  },
  quatawrap: {
    flexShrink: 1,
  },
  quataValue: {
    fontSize: 25,
    fontWeight: "800",
    color: COLOURS.yellowDark,
  },
  tranlab: {
    fontSize: 25,
    fontWeight: "600",
    color: COLOURS.redDark,
  },
  space: {
    flex: 1,
  },
  botnav: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLOURS.yellowLight,
  },
  navLabel: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  navButton: {
    flex: 1,
    alignItems: "center",
  },
});
