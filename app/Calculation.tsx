import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

// Gauge configuration
const RADIUS = 90;
const STROKE_WIDTH = 12;
const CIRCUMFERENCE = Math.PI * RADIUS;

export default function FuelQuotaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const nicParam = Array.isArray(params.nic) ? params.nic[0] : params.nic;

  // Separate local storage key for each user.
  const storageKey =
    typeof nicParam === "string" && nicParam.trim() !== ""
      ? `fuel_calculation_${nicParam.trim()}`
      : null;

  const [loading, setLoading] = useState(true);

  const [dailyDistances, setDailyDistances] =
    useState<DailyDistances>(EMPTY_DISTANCES);

  const [quotaLiters] = useState(20);

  // Editable fuel consumption.
  const [kmPerLiter, setKmPerLiter] = useState("12");

  // Prevent saving before previous data has loaded.
  const [dataLoaded, setDataLoaded] = useState(false);

  const [saveStatus, setSaveStatus] = useState("Saved");

  // Load previously saved calculation data from this device.
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
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [storageKey]);

  // Save the latest calculation data to the device.
  const saveCalculationData = useCallback(async () => {
    if (!storageKey || !dataLoaded) {
      return;
    }

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

  // Automatically save after the user stops typing.
  useEffect(() => {
    if (!dataLoaded || loading || !storageKey) {
      return;
    }

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

  // Change daily distance.
  const changeDistance = (day: keyof DailyDistances, value: string) => {
    const cleaned = value.replace(/[^0-9]/g, "");

    const numValue = cleaned === "" ? 0 : Number(cleaned);

    setDailyDistances((previous) => ({
      ...previous,
      [day]: numValue,
    }));
  };

  // Change fuel consumption.
  const changeKmPerLiter = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");

    const parts = cleaned.split(".");

    const formatted =
      parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : cleaned;

    setKmPerLiter(formatted);
  };

  // Weekly distance calculation.
  const weeklyDistance = useMemo(() => {
    return Object.values(dailyDistances).reduce(
      (total, distance) => total + distance,
      0,
    );
  }, [dailyDistances]);

  // Fuel consumption calculation.
  const fuelUsed = useMemo(() => {
    const rate = Number(kmPerLiter);

    if (!Number.isFinite(rate) || rate <= 0) {
      return 0;
    }

    return weeklyDistance / rate;
  }, [weeklyDistance, kmPerLiter]);

  // Existing quota calculation.
  const remainingFuel = Math.max(0, quotaLiters - fuelUsed - 2);

  const daysLeft = 4;

  const approxDailyUse = (remainingFuel / daysLeft).toFixed(2);

  // Gauge progress.
  const progressPercentage = Math.max(
    0,
    Math.min(1, remainingFuel / quotaLiters),
  );

  const strokeDashoffset = CIRCUMFERENCE - CIRCUMFERENCE * progressPercentage;

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.loadingText}>Loading calculation data...</Text>
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
        {/* DYNAMIC SVG GAUGE */}
        <View style={styles.gaugeWrapper}>
          <Svg width={RADIUS * 2 + STROKE_WIDTH} height={RADIUS + STROKE_WIDTH}>
            {/* Background Arc */}
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

            {/* Foreground Arc */}
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

          {/* Gauge Text */}
          <View style={styles.gaugeTextContainer}>
            <Text style={styles.gaugeLabel}>Remaining</Text>

            <Text style={styles.gaugeValue}>{remainingFuel.toFixed(2)} L</Text>

            <Text style={styles.gaugeSub}>of {quotaLiters.toFixed(2)} L</Text>
          </View>
        </View>

        {/* WEEKLY DISTANCE HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Weekly Distance</Text>

          {/* EDITABLE FUEL CONSUMPTION */}
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

  // GAUGE STYLES
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

  // WEEKLY DISTANCE SECTION
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

  // DAYS LIST
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

  // TOTALS
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

  // BOTTOM BANNER
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
