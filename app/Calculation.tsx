import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getFirestore, onSnapshot } from "firebase/firestore";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { app } from "../firebase/firebaseConfig";

const db = getFirestore(app);

interface DailyDistances {
  Monday: number;
  Tuesday: number;
  Wednesday: number;
  Thursday: number;
  Friday: number;
  Saturday: number;
  Sunday: number;
}

interface CalculationData {
  dailyDistances: DailyDistances;
  kmPerLiter: string;
}

const EMPTY_DISTANCES: DailyDistances = {
  Monday: 0,
  Tuesday: 0,
  Wednesday: 0,
  Thursday: 0,
  Friday: 0,
  Saturday: 0,
  Sunday: 0,
};

const DAYS_SHORT: { key: keyof DailyDistances; label: string }[] = [
  { key: "Monday", label: "Mon" },
  { key: "Tuesday", label: "Tue" },
  { key: "Wednesday", label: "Wed" },
  { key: "Thursday", label: "Thu" },
  { key: "Friday", label: "Fri" },
  { key: "Saturday", label: "Sat" },
  { key: "Sunday", label: "Sun" },
];

const RADIUS = 90;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = Math.PI * RADIUS;

export default function FuelQuotaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const nicParam = Array.isArray(params.nic) ? params.nic[0] : params.nic;

  const storageKey =
    typeof nicParam === "string" && nicParam.trim() !== ""
      ? `fuel_calculation_${nicParam.trim()}`
      : null;

  const [loading, setLoading] = useState(true);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [quotaError, setQuotaError] = useState("");

  const [dailyDistances, setDailyDistances] =
    useState<DailyDistances>(EMPTY_DISTANCES);

  const [quotaLiters, setQuotaLiters] = useState(0);
  const [kmPerLiter, setKmPerLiter] = useState("12");
  const [dataLoaded, setDataLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Saved");

  // LOAD EXISTING CALCULATION DATA FROM THIS DEVICE
  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      setDataLoaded(false);

      if (!storageKey) {
        setDailyDistances(EMPTY_DISTANCES);
        setKmPerLiter("12");
        setSaveStatus("NIC not available");
        setLoading(false);
        return;
      }

      try {
        const savedData = await AsyncStorage.getItem(storageKey);

        if (!active) return;

        if (savedData) {
          const parsed: CalculationData = JSON.parse(savedData);
          const savedDistances = parsed.dailyDistances || {};

          setDailyDistances({
            Monday: Math.max(0, Number(savedDistances.Monday) || 0),
            Tuesday: Math.max(0, Number(savedDistances.Tuesday) || 0),
            Wednesday: Math.max(0, Number(savedDistances.Wednesday) || 0),
            Thursday: Math.max(0, Number(savedDistances.Thursday) || 0),
            Friday: Math.max(0, Number(savedDistances.Friday) || 0),
            Saturday: Math.max(0, Number(savedDistances.Saturday) || 0),
            Sunday: Math.max(0, Number(savedDistances.Sunday) || 0),
          });

          setKmPerLiter(String(parsed.kmPerLiter ?? "12"));
        } else {
          setDailyDistances(EMPTY_DISTANCES);
          setKmPerLiter("12");
        }

        setSaveStatus("Saved");
        setDataLoaded(true);
      } catch (error) {
        console.log("Calculation data load failed:", error);

        if (active) {
          setSaveStatus("Load failed");
          setDataLoaded(false);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [storageKey]);

  // LIVE FIRESTORE QUOTA LISTENER
  useEffect(() => {
    if (typeof nicParam !== "string" || !nicParam.trim()) {
      setQuotaError("User NIC is not available.");
      setQuotaLoading(false);
      return;
    }

    setQuotaLoading(true);
    setQuotaError("");

    let stopQuotaListener: (() => void) | undefined;

    const stopUserListener = onSnapshot(
      doc(db, "users", nicParam.trim()),
      (userSnapshot) => {
        stopQuotaListener?.();
        stopQuotaListener = undefined;

        if (!userSnapshot.exists()) {
          setQuotaError("User profile not found.");
          setQuotaLoading(false);
          return;
        }

        const vehicleType = userSnapshot.data().vehicleType;

        if (typeof vehicleType !== "string" || !vehicleType.trim()) {
          setQuotaError("Vehicle type is missing from your profile.");
          setQuotaLoading(false);
          return;
        }

        stopQuotaListener = onSnapshot(
          doc(db, "fuelQuotaSettings", vehicleType.trim()),
          (quotaSnapshot) => {
            if (!quotaSnapshot.exists()) {
              setQuotaError(
                `Fuel quota has not been configured for ${vehicleType}.`,
              );
              setQuotaLoading(false);
              return;
            }

            const quota = Number(quotaSnapshot.data().quotaLiters);

            if (!Number.isFinite(quota) || quota < 0) {
              setQuotaError("The configured fuel quota is invalid.");
              setQuotaLoading(false);
              return;
            }

            setQuotaLiters(quota);
            setQuotaError("");
            setQuotaLoading(false);
          },
          (error) => {
            console.log("Fuel quota listener failed:", error);
            setQuotaError("Unable to load your fuel quota.");
            setQuotaLoading(false);
          },
        );
      },
      (error) => {
        console.log("User profile listener failed:", error);
        setQuotaError("Unable to load your user profile.");
        setQuotaLoading(false);
      },
    );

    return () => {
      stopUserListener();
      stopQuotaListener?.();
    };
  }, [nicParam]);

  // SAVE CALCULATION DATA TO THIS DEVICE
  const saveCalculationData = useCallback(async () => {
    if (!storageKey || !dataLoaded) return;

    const rate = Number(kmPerLiter);

    if (kmPerLiter.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
      setSaveStatus("Enter a valid Km/L value");
      return;
    }

    const dataToSave: CalculationData = {
      dailyDistances,
      kmPerLiter,
    };

    try {
      setSaveStatus("Saving...");
      await AsyncStorage.setItem(storageKey, JSON.stringify(dataToSave));
      setSaveStatus("Saved");
    } catch (error) {
      console.log("Calculation data save failed:", error);
      setSaveStatus("Save failed");
    }
  }, [storageKey, dataLoaded, dailyDistances, kmPerLiter]);

  // AUTO-SAVE AFTER USER STOPS TYPING
  useEffect(() => {
    if (!dataLoaded || loading || !storageKey) return;

    const rate = Number(kmPerLiter);

    if (kmPerLiter.trim() === "" || !Number.isFinite(rate) || rate <= 0) {
      setSaveStatus("Enter a valid Km/L value");
      return;
    }

    setSaveStatus("Unsaved changes");

    const timer = setTimeout(() => {
      saveCalculationData();
    }, 700);

    return () => clearTimeout(timer);
  }, [
    dailyDistances,
    kmPerLiter,
    dataLoaded,
    loading,
    storageKey,
    saveCalculationData,
  ]);

  // CHANGE DAILY DISTANCE
  const changeDistance = (day: keyof DailyDistances, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");
    const numValue = cleaned === "" ? 0 : Number(cleaned);

    setDailyDistances((previous) => ({
      ...previous,
      [day]: numValue,
    }));
  };

  // CHANGE FUEL CONSUMPTION
  const changeKmPerLiter = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");

    const formatted =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

    setKmPerLiter(formatted);
  };

  // WEEKLY DISTANCE
  const weeklyDistance = useMemo(
    () =>
      Object.values(dailyDistances).reduce(
        (total, distance) => total + distance,
        0,
      ),
    [dailyDistances],
  );

  // FUEL USED
  const fuelUsed = useMemo(() => {
    const rate = Number(kmPerLiter);

    if (!Number.isFinite(rate) || rate <= 0) return 0;

    return weeklyDistance / rate;
  }, [weeklyDistance, kmPerLiter]);

  // REMAINING QUOTA — KEEP EXISTING 2 LITRE DEDUCTION
  const remainingFuel = Math.max(0, quotaLiters - fuelUsed - 2);

  const daysLeft = 4;
  const approxDailyUse = (remainingFuel / daysLeft).toFixed(2);

  const progressPercentage =
    quotaLiters > 0 ? Math.max(0, Math.min(1, remainingFuel / quotaLiters)) : 0;

  const strokeDashoffset = CIRCUMFERENCE - CIRCUMFERENCE * progressPercentage;

  // LOADING
  if (loading || quotaLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading calculation data...</Text>
      </SafeAreaView>
    );
  }

  // QUOTA ERROR
  if (quotaError) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <Text style={styles.loadingText}>{quotaError}</Text>

        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 20 }}
        >
          <Text style={styles.loadingText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#D30000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Fuel Quota</Text>

        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* DYNAMIC GAUGE */}
        <View style={styles.gaugeWrapper}>
          <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS + STROKE_WIDTH}>
            <Path
              d={`M ${STROKE_WIDTH / 2} ${
                RADIUS + STROKE_WIDTH / 2
              } A ${RADIUS} ${RADIUS} 0 0 1 ${
                RADIUS * 2 + STROKE_WIDTH / 2
              } ${RADIUS + STROKE_WIDTH / 2}`}
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
            />

            <Path
              d={`M ${STROKE_WIDTH / 2} ${
                RADIUS + STROKE_WIDTH / 2
              } A ${RADIUS} ${RADIUS} 0 0 1 ${
                RADIUS * 2 + STROKE_WIDTH / 2
              } ${RADIUS + STROKE_WIDTH / 2}`}
              stroke="#FFFFFF"
              strokeWidth={STROKE_WIDTH}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>

          <View style={styles.gaugeTextContainer}>
            <Text style={styles.gaugeLabel}>Remaining</Text>
            <Text style={styles.gaugeValue}>{remainingFuel.toFixed(2)} L</Text>
            <Text style={styles.gaugeSub}>of {quotaLiters.toFixed(2)} L</Text>
          </View>
        </View>

        {/* WEEKLY DISTANCE HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Distance</Text>

          <View style={styles.kmPill}>
            <TextInput
              style={styles.kmPillInput}
              value={kmPerLiter}
              onChangeText={changeKmPerLiter}
              keyboardType="decimal-pad"
              maxLength={6}
              selectTextOnFocus
              onBlur={saveCalculationData}
            />
            <Text style={styles.kmPillText}>Km/L</Text>
          </View>
        </View>

        {/* SAVE STATUS */}
        <Text style={styles.saveStatus}>
          {saveStatus === "Saved"
            ? "✓ All changes saved on this device"
            : saveStatus}
        </Text>

        {/* DAYS LIST */}
        <View style={styles.daysList}>
          {DAYS_SHORT.map((day) => (
            <View key={day.key} style={styles.dayRow}>
              <Text style={styles.dayName}>{day.label}</Text>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.dayInput}
                  value={String(dailyDistances[day.key])}
                  onChangeText={(value) => changeDistance(day.key, value)}
                  keyboardType="number-pad"
                  maxLength={3}
                  selectTextOnFocus
                  onBlur={saveCalculationData}
                />
              </View>

              <Text style={styles.kmLabel}>KM</Text>
            </View>
          ))}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsContainer}>
          <Text style={styles.totalText}>
            Total Distance :{" "}
            <Text style={styles.totalBold}>{weeklyDistance} Km</Text>
          </Text>

          <Text style={styles.totalText}>
            Fuel Used :{" "}
            <Text style={styles.totalBold}>{fuelUsed.toFixed(2)} L</Text>
          </Text>
        </View>

        <View style={{ flex: 1, minHeight: 40 }} />

        {/* BOTTOM BANNER */}
        <View style={styles.bottomBanner}>
          <Ionicons
            name="alert-circle-outline"
            size={26}
            color="#D30000"
            style={{ marginTop: 2 }}
          />

          <Text style={styles.bannerText}>
            You can use approximately{" "}
            <Text style={styles.bannerBold}>{approxDailyUse} L</Text> and you
            got <Text style={styles.bannerBold}>{daysLeft} Days</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D30000",
  },

  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: "#FFFFFF",
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 20,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },

  backButton: {
    padding: 5,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  gaugeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    height: 160,
    marginTop: 10,
    marginBottom: 10,
  },

  gaugeTextContainer: {
    position: "absolute",
    top: 55,
    alignItems: "center",
  },

  gaugeLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },

  gaugeValue: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "800",
  },

  gaugeSub: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },

  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
  },

  kmPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  kmPillText: {
    color: "#D30000",
    fontWeight: "700",
    fontSize: 14,
  },

  kmPillInput: {
    color: "#D30000",
    fontWeight: "700",
    fontSize: 14,
    minWidth: 35,
    maxWidth: 55,
    textAlign: "center",
    padding: 0,
    marginRight: 3,
  },

  saveStatus: {
    color: "#FFFFFF",
    fontSize: 12,
    textAlign: "right",
    marginTop: -12,
    marginBottom: 12,
  },

  daysList: {
    marginBottom: 20,
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  dayName: {
    color: "#FFFFFF",
    width: 50,
    fontSize: 15,
    fontWeight: "500",
  },

  inputWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    width: 60,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 15,
  },

  dayInput: {
    color: "#D30000",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
    height: "100%",
    padding: 0,
  },

  kmLabel: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },

  totalsContainer: {
    marginTop: 10,
    marginBottom: 10,
  },

  totalText: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 8,
  },

  totalBold: {
    fontWeight: "800",
  },

  bottomBanner: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 20,
  },

  bannerText: {
    color: "#D30000",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    marginLeft: 10,
    lineHeight: 22,
  },

  bannerBold: {
    fontWeight: "800",
  },
});
