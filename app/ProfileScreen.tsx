// app/profile.tsx  (Expo Router)
// Install first:
//   npx expo install react-native-svg
//   npm install react-native-qrcode-svg

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

const RED = "#CC0A0A";
const WHITE = "#FFFFFF";
const DIVIDER = "rgba(255,255,255,0.85)";

/* ---------- Helpers ---------- */

const formatDate = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value; // already formatted or invalid
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

/* ---------- Reusable row ---------- */

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

/* ---------- Screen ---------- */

export default function ProfileScreen() {
  const router = useRouter();

  // Pass these via router.push({ pathname: "/profile", params: {...} })
  // or replace with a Firestore lookup (e.g. via your phoneIndex collection).
  const {
    vehicleNumber = "WP CAA - 1534",
    quota = "40",
    validUntil = "2026-08-26",
  } = useLocalSearchParams<{
    vehicleNumber?: string;
    quota?: string;
    validUntil?: string;
  }>();

  // What the pump operator's scanner will read
  const qrValue = JSON.stringify({ vehicleNumber });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={28} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* QR */}
      <View style={styles.qrWrap}>
        <View style={styles.qrCard}>
          <QRCode
            value={qrValue}
            size={180}
            color="#000"
            backgroundColor={WHITE}
          />
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.vehicleLabel}>Vehicle Number</Text>
        <Text style={styles.vehicleNumber}>{vehicleNumber}</Text>

        <View style={styles.divider} />
        <InfoRow
          label="Available Quota"
          value={`${Number(quota).toFixed(2)} L`}
        />

        <View style={styles.divider} />
        <InfoRow label="Valid Until" value={formatDate(validUntil)} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: RED,
  },
  header: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  backBtn: {
    position: "absolute",
    left: 20,
  },
  title: {
    color: WHITE,
    fontSize: 28,
    fontWeight: "700",
  },
  qrWrap: {
    alignItems: "center",
    marginTop: 24,
  },
  qrCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  details: {
    marginTop: 48,
    paddingHorizontal: 28,
  },
  vehicleLabel: {
    color: WHITE,
    fontSize: 17,
  },
  vehicleNumber: {
    color: WHITE,
    fontSize: 26,
    fontWeight: "700",
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth * 2,
    backgroundColor: DIVIDER,
    marginVertical: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    color: WHITE,
    fontSize: 20,
  },
  rowValue: {
    color: WHITE,
    fontSize: 20,
  },
});
