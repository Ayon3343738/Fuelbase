import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
const RED = "#CC0A0A";
const WHITE = "#FFFFFF";
const DIVIDER = "rgba(255,255,255,0.85)";

const formatData = (value: string): string => {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export default function ProfileScreem() {
  const router = useRouter();
  const {
    vehicleNumber = "WP CA 1324",
    quota = "40",
    validUntill = "2026-08-26",
  } = useLocalSearchParams<{
    vehicleNumber?: string;
    quota?: string;
    validUntill?: string;
  }>();

  const qrValue = JSON.stringify({ vehicleNumber });

  return (
    <SafeAreaView>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={28} color={WHITE} />
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.QrWrap}>
        <View style={styles.qrCard}>
          <QRCode
            value={qrValue}
            size={180}
            color="#000"
            backgroundColor={WHITE}
          />
        </View>
      </View>

      <View style={styles.details}>
        <Text> Vehicle number</Text>
        <Text>{vehicleNumber}</Text>

        <View style={styles.divider} />
        <InfoRow
          label="Availbale fuel"
          value={`${Number(quota).toFixed(2)} L`}
        />
      </View>

      <View style={styles.divider}>
        <InfoRow label="valid till" value={formatData(validUntill)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  QrWrap: {
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
  divider: {
    backgroundColor: DIVIDER,
    marginVertical: 21,
  },
});
