import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, usePathname, useRouter } from "expo-router";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { app } from "../firebase/firebaseConfig";

export const db = getFirestore(app);

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const NAV_ITEMS: {
  label: string;
  icon: IconName;
  iconOutline: IconName;
  route: string;
}[] = [
  { label: "Home", icon: "home", iconOutline: "home-outline", route: "/main" },
  {
    label: "Stations",
    icon: "location",
    iconOutline: "location-outline",
    route: "/Stations",
  },
  {
    label: "History",
    icon: "time",
    iconOutline: "time-outline",
    route: "/History",
  },
  {
    label: "Profile",
    icon: "person",
    iconOutline: "person-outline",
    route: "/ProfileScreen",
  },
];

export default function MainScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { nic } = useLocalSearchParams<{ nic?: string }>();

  const [username, setUsername] = useState("");
  const [remainingQuota, setRemainingQuota] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(true);

  useEffect(() => {
    if (!nic || typeof nic !== "string" || !nic.trim()) {
      setLoading(false);
      setQuotaLoading(false);
      Alert.alert("Error", "User NIC is missing.");
      return;
    }

    setLoading(true);
    setQuotaLoading(true);

    let stopQuotaListener: (() => void) | undefined;

    // Listen to the user's profile to get their vehicle type.
    const stopUserListener = onSnapshot(
      doc(db, "users", nic.trim()),
      (userSnapshot) => {
        // Stop the previous quota listener if the vehicle type changes.
        stopQuotaListener?.();
        stopQuotaListener = undefined;

        if (!userSnapshot.exists()) {
          setUsername("");
          setRemainingQuota(null);
          setLoading(false);
          setQuotaLoading(false);
          Alert.alert("User not found");
          return;
        }

        const userData = userSnapshot.data();
        setUsername(userData.ownerName ?? "User");
        setLoading(false);

        const vehicleType = userData.vehicleType;

        if (typeof vehicleType !== "string" || !vehicleType.trim()) {
          setRemainingQuota(null);
          setQuotaLoading(false);
          return;
        }

        setQuotaLoading(true);

        // Listen to the shared quota for this vehicle type.
        stopQuotaListener = onSnapshot(
          doc(db, "fuelQuotaSettings", vehicleType.trim()),
          (quotaSnapshot) => {
            if (!quotaSnapshot.exists()) {
              setRemainingQuota(null);
              setQuotaLoading(false);
              return;
            }

            const quota = Number(quotaSnapshot.data().quotaLiters);

            if (!Number.isFinite(quota) || quota < 0) {
              setRemainingQuota(null);
            } else {
              setRemainingQuota(quota);
            }

            setQuotaLoading(false);
          },
          (error) => {
            console.error("Failed to load fuel quota:", error);
            setRemainingQuota(null);
            setQuotaLoading(false);
          },
        );
      },
      (error) => {
        console.error("Failed to load user:", error);
        setLoading(false);
        setQuotaLoading(false);
        Alert.alert("Error", "Could not load user details.");
      },
    );

    return () => {
      stopUserListener();
      stopQuotaListener?.();
    };
  }, [nic]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#E00000" />

      <View style={styles.contain}>
        <View style={styles.header}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hello, {loading ? "..." : username || "User"}
          </Text>
        </View>

        <View style={styles.content}>
          <TouchableOpacity
            style={styles.quotacard}
            activeOpacity={0.8}
            onPress={() =>
              router.push({
                pathname: "/Calculation",
                params: {
                  nic: nic ?? "",
                },
              })
            }
          >
            <Text style={styles.quatatitle}>Remaining Quota</Text>

            {loading || quotaLoading ? (
              <ActivityIndicator color="#E00000" />
            ) : (
              <Text style={styles.quotaValue}>
                {remainingQuota !== null
                  ? `${remainingQuota.toFixed(2)} L`
                  : "Quota not available"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.trancard}
            activeOpacity={0.8}
            onPress={() => router.push("/add-transaction")}
          >
            <Text style={styles.tranText}>Add Transaction</Text>
            <View style={styles.tranIcon}>
              <Ionicons name="swap-horizontal" size={40} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottnav}>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.route;

            return (
              <TouchableOpacity
                key={item.label}
                style={[styles.navItem, isActive && styles.navItemActive]}
                activeOpacity={0.7}
                onPress={() => {
                  if (isActive) return;

                  if (item.label === "Profile") {
                    router.push({
                      pathname: "/ProfileScreen",
                      params: { nic: nic ?? "" },
                    });
                  } else {
                    router.push(item.route as any);
                  }
                }}
              >
                <Ionicons
                  name={isActive ? item.icon : item.iconOutline}
                  size={36}
                  color={isActive ? "#E00000" : "#FFFFFF"}
                />

                <Text
                  style={[styles.navText, isActive && styles.navTextActive]}
                >
                  {item.label}
                </Text>
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
  quotaValue: {
    color: "#222222",
    fontSize: 23,
    fontWeight: "600",
  },
});
