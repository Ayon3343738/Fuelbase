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

// Home has no route: it is just an icon for the current screen
const NAV_ITEMS = [
  { label: "Home", icon: "home", route: null },
  { label: "Stations", icon: "location", route: "/Stations" },
  { label: "History", icon: "time", route: "/History" },
  { label: "Profile", icon: "person", route: "/ProfileScreen" },
];

export default function MainScreen() {
  const router = useRouter();

  const username = "name";
  const remainingQuata = 20.0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#E00000" />
      <View style={styles.contain}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {username}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.quotacard}>
            <Text style={styles.quatatitle}>Remaining Quota</Text>
            <Text>{remainingQuata.toFixed(2)}L</Text>
          </View>

          <TouchableOpacity
            style={styles.trancard}
            activeOpacity={0.8}
            onPress={() => router.push("/Login")}
          >
            <Text style={styles.tranText}>Add Transaction</Text>
            <View style={styles.tranIcon}>
              <Ionicons name="swap-horizontal" size={40} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottnav}>
          {NAV_ITEMS.map((item) => {
            // Home (no route): icon only, no navigation, always highlighted
            if (!item.route) {
              return (
                <View
                  key={item.label}
                  style={[styles.navItem, styles.navItemActive]}
                >
                  <Ionicons name="home" size={36} color="#E00000" />
                  <Text style={[styles.navText, styles.navTextActive]}>
                    {item.label}
                  </Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={item.label}
                style={styles.navItem}
                activeOpacity={0.7}
                onPress={() => router.push(item.route as any)}
              >
                <Ionicons
                  name={`${item.icon}-outline` as any}
                  size={36}
                  color="#FFFFFF"
                />
                <Text style={styles.navText}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#E00000",
  },
  contain: {
    flex: 1,
    backgroundColor: "#E00000",
    paddingHorizontal: 20,
  },
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
  content: {
    flex: 1,
    paddingTop: 65,
  },
  quotacard: {
    backgroundColor: "#FFFFFF",
    height: 145,
    borderRadius: 25,
    paddingHorizontal: 30,
    justifyContent: "center",
    marginBottom: 25,
  },
  quatatitle: {
    color: "#C90000",
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 7,
  },
  trancard: {
    backgroundColor: "#FFFFFF",
    height: 145,
    borderRadius: 25,
    paddingHorizontal: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tranText: {
    color: "#C90000",
    fontSize: 26,
    fontWeight: "700",
    flexShrink: 1,
  },
  tranIcon: {
    width: 65,
    height: 65,
    borderRadius: 33,
    backgroundColor: "#E00000",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  bottnav: {
    height: 95,
    backgroundColor: "#E00000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    paddingBottom: 5,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 18,
  },
  navItemActive: {
    backgroundColor: "#FFFFFF",
  },
  navText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  navTextActive: {
    color: "#E00000",
    fontWeight: "700",
  },
});
