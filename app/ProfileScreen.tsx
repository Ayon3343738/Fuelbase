import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../firebase/firebaseConfig";

const RED = "#CC0A0A";
const WHITE = "#FFFFFF";

type RegisteredUser = {
  ownerName?: string;
  nic?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  fuelType?: string;
  qrImage?: string;
  remainingQuota?: number;
  validUntil?: string;
  accountStatus?: string;
};

const formatDate = (value?: string) => {
  if (!value) return "Not set";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "Not available"}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ nic?: string }>();

  const { nic } = useLocalSearchParams<{ nic?: string }>();

  const [user, setUser] = useState<RegisteredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!nic) {
      setLoading(false);
      Alert.alert("Missing NIC", "No registered user was selected.");
      return;
    }
    const cleanNic = nic.trim().toUpperCase();
    const userRef = doc(db, "users", nic.trim());

    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setUser(snapshot.data() as RegisteredUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Profile fetch error:", error);
        setLoading(false);
        Alert.alert("Error", "Could not load the registered user.");
      },
    );

    return unsubscribe;
  }, [nic]);

  useEffect(() => {
    setImageError(false);
  }, [user?.qrImage]);

  const vehicleNumber = user?.vehicleNumber || "";
  const quota = Number(user?.remainingQuota ?? 0);

  const qrValue = JSON.stringify({
    nic: user?.nic || nic,
    vehicleNumber,
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={27} color={WHITE} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={WHITE} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <Ionicons name="person-circle-outline" size={70} color={WHITE} />
          <Text style={styles.message}>Registered user not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.qrCard}>
            {user.qrImage ? (
              <Image
                source={{ uri: user.qrImage }}
                style={styles.qrImage}
                resizeMode="contain"
                onError={() =>
                  console.warn("Could not load uploaded QR image.")
                }
              />
            ) : (
              <QRCode
                value={qrValue}
                size={180}
                color="#000000"
                backgroundColor={WHITE}
              />
            )}

            <Text style={styles.qrCaption}>
              {user.qrImage ? "Uploaded QR Image" : "Generated QR Code"}
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <Text style={styles.ownerName}>
              {user.ownerName || "Registered User"}
            </Text>

            <Text style={styles.vehicleLabel}>Vehicle Number</Text>
            <Text style={styles.vehicleNumber}>
              {vehicleNumber || "Not available"}
            </Text>

            <View style={styles.divider} />

            <InfoRow label="NIC Number" value={user.nic || nic || ""} />

            <View style={styles.divider} />

            <InfoRow label="Phone Number" value={user.phone || ""} />

            <View style={styles.divider} />

            <InfoRow label="Vehicle Type" value={user.vehicleType || ""} />

            <View style={styles.divider} />

            <InfoRow label="Fuel Type" value={user.fuelType || ""} />

            <View style={styles.divider} />

            <InfoRow
              label="Available Quota"
              value={`${Number.isFinite(quota) ? quota.toFixed(2) : "0.00"} L`}
            />

            <View style={styles.divider} />

            <InfoRow label="Valid Until" value={formatDate(user.validUntil)} />

            <View style={styles.divider} />

            <InfoRow
              label="Account Status"
              value={user.accountStatus || "active"}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
  },
  header: {
    height: 58,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  backButton: {
    position: "absolute",
    left: 20,
    padding: 4,
  },
  headerTitle: {
    color: WHITE,
    fontSize: 27,
    fontWeight: "800",
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 35,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    color: WHITE,
    marginTop: 12,
    fontSize: 16,
  },
  message: {
    color: WHITE,
    fontSize: 17,
    marginTop: 12,
    textAlign: "center",
  },
  qrCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    alignSelf: "center",
    width: 230,
  },
  qrImage: {
    width: 180,
    height: 180,
  },
  qrCaption: {
    color: "#555",
    fontSize: 13,
    marginTop: 10,
    textAlign: "center",
  },
  detailsCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    padding: 20,
    marginTop: 28,
  },
  ownerName: {
    color: "#222",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 18,
  },
  vehicleLabel: {
    color: "#666",
    fontSize: 15,
  },
  vehicleNumber: {
    color: RED,
    fontSize: 25,
    fontWeight: "800",
    marginTop: 5,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#DDD",
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLabel: {
    color: "#555",
    fontSize: 14,
    flex: 1,
  },
  rowValue: {
    color: "#222",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
});
