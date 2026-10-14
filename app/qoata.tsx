import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";

import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    getFirestore,
    serverTimestamp,
    setDoc,
} from "firebase/firestore";

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

interface UserData {
  ownerName: string;
  nic: string;
  phone: string;
  vehicleNumber: string;
  vehicleType: string;
  fuelType: string;
  qrImage?: string;
  quotaLiters?: number;
  refillDate?: string;
  kmPerLiter?: number;
  dailyDistances?: DailyDistances;
  weekStart?: string;
}

interface WeeklyTemplate {
  id: string;
  templateName: string;
  distances: DailyDistances;
  totalDistance: number;
}

const DEFAULT_QUOTA = 20;
const DEFAULT_KM_PER_LITER = 12;

const VEHICLE_QUOTAS: Record<string, number> = {
  "motor cars": 20,
  "three-wheelers": 8,
  motorcycles: 5,
  buses: 50,
  vans: 25,
  "land vehicles": 20,
  "motor lorry": 40,
  "special purpose vehicles": 30,
};

const getQuotaForVehicle = (vehicleType?: string): number => {
  const type = (vehicleType || "").trim().toLowerCase();

  return VEHICLE_QUOTAS[type] ?? DEFAULT_QUOTA;
};

const EMPTY_DISTANCES: DailyDistances = {
  Monday: 0,
  Tuesday: 0,
  Wednesday: 0,
  Thursday: 0,
  Friday: 0,
  Saturday: 0,
  Sunday: 0,
};

const DAYS: (keyof DailyDistances)[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function MainScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const nicParam = Array.isArray(params.nic) ? params.nic[0] : params.nic;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [dailyDistances, setDailyDistances] =
    useState<DailyDistances>(EMPTY_DISTANCES);

  const [editingDistances, setEditingDistances] =
    useState<DailyDistances>(EMPTY_DISTANCES);

  const [editingWeeklyDistance, setEditingWeeklyDistance] = useState(false);

  const [savingWeeklyDistance, setSavingWeeklyDistance] = useState(false);

  const [kmPerLiter, setKmPerLiter] = useState(DEFAULT_KM_PER_LITER);

  const [quotaLiters, setQuotaLiters] = useState(DEFAULT_QUOTA);

  const [refillDate, setRefillDate] = useState("");

  const [efficiencyModalVisible, setEfficiencyModalVisible] = useState(false);

  const [efficiencyInput, setEfficiencyInput] = useState("");

  const [templateName, setTemplateName] = useState("Work Week");

  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);

  const [templateModalVisible, setTemplateModalVisible] = useState(false);

  const [templateLoading, setTemplateLoading] = useState(false);

  const getWeekStart = () => {
    const date = new Date();
    const day = date.getDay();
    const difference = day === 0 ? -6 : 1 - day;

    date.setDate(date.getDate() + difference);
    date.setHours(0, 0, 0, 0);

    return date.toISOString().split("T")[0];
  };

  useEffect(() => {
    loadUser();
  }, [nicParam]);

  const loadUser = async () => {
    if (!nicParam || typeof nicParam !== "string") {
      Alert.alert("Error", "NIC was not received from Login.");
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const userRef = doc(db, "users", nicParam);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        Alert.alert("Error", "User information was not found.");
        setUser(null);
        return;
      }

      const data = snapshot.data();
      const firebaseDistances = data.dailyDistances || {};

      const loadedDistances: DailyDistances = {
        Monday: Number(firebaseDistances.Monday || 0),
        Tuesday: Number(firebaseDistances.Tuesday || 0),
        Wednesday: Number(firebaseDistances.Wednesday || 0),
        Thursday: Number(firebaseDistances.Thursday || 0),
        Friday: Number(firebaseDistances.Friday || 0),
        Saturday: Number(firebaseDistances.Saturday || 0),
        Sunday: Number(firebaseDistances.Sunday || 0),
      };

      const loadedQuota =
        data.quotaLiters !== undefined && data.quotaLiters !== null
          ? Number(data.quotaLiters)
          : getQuotaForVehicle(data.vehicleType);

      const loadedKmPerLiter = Number(data.kmPerLiter ?? DEFAULT_KM_PER_LITER);

      let loadedRefillDate = data.refillDate || "";

      if (!loadedRefillDate) {
        const date = new Date();
        date.setDate(date.getDate() + 7);

        loadedRefillDate = date.toISOString().split("T")[0];

        await setDoc(
          userRef,
          { refillDate: loadedRefillDate },
          { merge: true },
        );
      }

      const loadedUser: UserData = {
        ownerName: data.ownerName || "",
        nic: data.nic || nicParam,
        phone: data.phone || "",
        vehicleNumber: data.vehicleNumber || "",
        vehicleType: data.vehicleType || "",
        fuelType: data.fuelType || "",
        qrImage: data.qrImage || "",
        quotaLiters: loadedQuota,
        refillDate: loadedRefillDate,
        kmPerLiter: loadedKmPerLiter,
        dailyDistances: loadedDistances,
        weekStart: data.weekStart || getWeekStart(),
      };

      setUser(loadedUser);
      setDailyDistances(loadedDistances);
      setEditingDistances(loadedDistances);
      setQuotaLiters(loadedQuota);
      setKmPerLiter(loadedKmPerLiter);
      setRefillDate(loadedRefillDate);
    } catch (error) {
      console.log("Load user error:", error);
      Alert.alert("Error", "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const weeklyDistance = useMemo(() => {
    return DAYS.reduce(
      (total, day) => total + Number(dailyDistances[day] || 0),
      0,
    );
  }, [dailyDistances]);

  const fuelUsed = useMemo(() => {
    if (kmPerLiter <= 0) {
      return 0;
    }

    return weeklyDistance / kmPerLiter;
  }, [weeklyDistance, kmPerLiter]);

  const remainingFuel = useMemo(() => {
    return Math.max(0, quotaLiters - fuelUsed);
  }, [quotaLiters, fuelUsed]);

  const daysLeft = useMemo(() => {
    if (!refillDate) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const refill = new Date(`${refillDate}T00:00:00`);
    const difference = refill.getTime() - today.getTime();

    return Math.max(0, Math.ceil(difference / (1000 * 60 * 60 * 24)));
  }, [refillDate]);

  const dailyFuelLimit = useMemo(() => {
    if (daysLeft <= 0) {
      return remainingFuel;
    }

    return remainingFuel / daysLeft;
  }, [remainingFuel, daysLeft]);

  const dailyDistanceLimit = useMemo(() => {
    return dailyFuelLimit * kmPerLiter;
  }, [dailyFuelLimit, kmPerLiter]);

  const startWeeklyEdit = () => {
    setEditingDistances({ ...dailyDistances });
    setEditingWeeklyDistance(true);
  };

  const cancelWeeklyEdit = () => {
    setEditingDistances({ ...dailyDistances });
    setEditingWeeklyDistance(false);
  };

  const changeDayDistance = (day: keyof DailyDistances, value: string) => {
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    const parts = cleanedValue.split(".");

    const validValue =
      parts.length > 2
        ? `${parts[0]}.${parts.slice(1).join("")}`
        : cleanedValue;

    const numberValue = validValue === "" ? 0 : Number(validValue);

    setEditingDistances((previous) => ({
      ...previous,
      [day]: numberValue,
    }));
  };

  const saveWeeklyDistances = async () => {
    if (!user) {
      return;
    }

    for (const day of DAYS) {
      if (
        !Number.isFinite(editingDistances[day]) ||
        editingDistances[day] < 0
      ) {
        Alert.alert(
          "Invalid Distance",
          `${day} must have a valid non-negative distance.`,
        );
        return;
      }
    }

    try {
      setSavingWeeklyDistance(true);

      await setDoc(
        doc(db, "users", user.nic),
        {
          dailyDistances: { ...editingDistances },
          weekStart: getWeekStart(),
        },
        { merge: true },
      );

      setDailyDistances({ ...editingDistances });
      setEditingWeeklyDistance(false);

      Alert.alert("Saved", "Weekly distances saved successfully.");
    } catch (error) {
      console.log("Save weekly distance error:", error);
      Alert.alert("Error", "Could not save weekly distances.");
    } finally {
      setSavingWeeklyDistance(false);
    }
  };

  const getWeeklyTemplatesRef = () => {
    if (!user?.nic?.trim()) {
      throw new Error("User NIC is missing. Please log in again.");
    }

    return collection(db, "users", user.nic, "weeklyTemplates");
  };

  const saveWeeklyTemplate = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in again.");
      return;
    }

    if (!templateName.trim()) {
      Alert.alert("Template Name", "Please enter a template name.");
      return;
    }

    const sourceDistances = editingWeeklyDistance
      ? editingDistances
      : dailyDistances;

    for (const day of DAYS) {
      if (!Number.isFinite(sourceDistances[day]) || sourceDistances[day] < 0) {
        Alert.alert(
          "Invalid Distance",
          `Please enter a valid distance for ${day}.`,
        );
        return;
      }
    }

    try {
      setTemplateLoading(true);

      const savedDistances: DailyDistances = {
        ...sourceDistances,
      };

      const totalDistance = DAYS.reduce(
        (total, day) => total + savedDistances[day],
        0,
      );

      await addDoc(getWeeklyTemplatesRef(), {
        templateName: templateName.trim(),
        distances: savedDistances,
        totalDistance,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Template Saved",
        `"${templateName.trim()}" has been saved and is ready to reuse.`,
      );
    } catch (error) {
      console.error("Save weekly template error:", error);

      Alert.alert(
        "Save Failed",
        "Could not save the weekly template. Check your Firebase configuration and internet connection.",
      );
    } finally {
      setTemplateLoading(false);
    }
  };

  const loadWeeklyTemplates = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in again.");
      return;
    }

    try {
      setTemplateLoading(true);

      const snapshot = await getDocs(getWeeklyTemplatesRef());

      const loadedTemplates: WeeklyTemplate[] = snapshot.docs.map((item) => {
        const data = item.data();
        const saved = data.distances ?? {};

        const normalizedDistances: DailyDistances = {
          Monday: Math.max(0, Number(saved.Monday) || 0),
          Tuesday: Math.max(0, Number(saved.Tuesday) || 0),
          Wednesday: Math.max(0, Number(saved.Wednesday) || 0),
          Thursday: Math.max(0, Number(saved.Thursday) || 0),
          Friday: Math.max(0, Number(saved.Friday) || 0),
          Saturday: Math.max(0, Number(saved.Saturday) || 0),
          Sunday: Math.max(0, Number(saved.Sunday) || 0),
        };

        return {
          id: item.id,
          templateName: String(data.templateName || "Saved Week"),
          distances: normalizedDistances,
          totalDistance: DAYS.reduce(
            (total, day) => total + normalizedDistances[day],
            0,
          ),
        };
      });

      setTemplates(loadedTemplates);
      setTemplateModalVisible(true);
    } catch (error) {
      console.error("Load weekly templates error:", error);

      Alert.alert("Load Failed", "Could not load saved templates.");
    } finally {
      setTemplateLoading(false);
    }
  };

  const applyWeeklyTemplate = (template: WeeklyTemplate) => {
    setEditingDistances({ ...template.distances });
    setTemplateName(template.templateName);
    setEditingWeeklyDistance(true);
    setTemplateModalVisible(false);

    Alert.alert(
      "Template Loaded",
      `"${template.templateName}" has been loaded. Review the distances and press Save to update your current week.`,
    );
  };

  const openEfficiencyEdit = () => {
    setEfficiencyInput(String(kmPerLiter));
    setEfficiencyModalVisible(true);
  };

  const saveEfficiency = async () => {
    if (!user) {
      return;
    }

    const value = Number(efficiencyInput);

    if (!efficiencyInput.trim() || !Number.isFinite(value) || value <= 0) {
      Alert.alert("Invalid", "Please enter a valid KM/L value.");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.nic),
        { kmPerLiter: value },
        { merge: true },
      );

      setKmPerLiter(value);
      setEfficiencyModalVisible(false);

      Alert.alert("Saved", "Vehicle efficiency updated.");
    } catch (error) {
      console.log("Save efficiency error:", error);
      Alert.alert("Error", "Could not update KM/L.");
    }
  };

  const logout = () => {
    Alert.alert("Logout", "Do you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        onPress: () => {
          router.replace("/Login");
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFA500" />

        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorText}>User information not found.</Text>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.replace("/Login")}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={38} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/Profile",
                params: { nic: user.nic },
              })
            }
          >
            <Ionicons name="person-circle-outline" size={40} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <Text style={styles.dateText}>{new Date().toDateString()}</Text>

        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleNumber}>{user.vehicleNumber}</Text>
        </View>

        <View style={styles.qrCard}>
          {user.qrImage ? (
            <Image
              source={{ uri: user.qrImage }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <>
              <Ionicons name="image-outline" size={65} color="#777777" />

              <Text style={styles.qrText}>QR image not available</Text>
            </>
          )}
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.bigCardText}>
            ⛽ You have {remainingFuel.toFixed(2)} Liters
          </Text>

          <Text style={styles.quotaSubText}>
            Weekly quota for {user.vehicleType || "your vehicle"}: {quotaLiters}{" "}
            L
          </Text>
        </View>

        <View style={styles.whiteCard}>
          <Text style={styles.normalCardText}>
            ⛽ Days Left to Refill :{" "}
            <Text style={styles.boldText}>{daysLeft} days</Text>
          </Text>
        </View>

        <View style={styles.weeklyCard}>
          <View style={styles.weeklyHeader}>
            <Text style={styles.weeklyTitle}>🚗 Weekly Distance</Text>

            {!editingWeeklyDistance && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={startWeeklyEdit}
              >
                <Text style={styles.editButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.templateControls}>
            <Text style={styles.templateSectionTitle}>
              Save or reuse your weekly routine
            </Text>

            <TextInput
              style={styles.templateNameInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name (e.g. Work Week)"
              placeholderTextColor="#888888"
              maxLength={50}
            />

            <View style={styles.templateButtonRow}>
              <TouchableOpacity
                style={[
                  styles.templateSaveButton,
                  templateLoading && styles.templateDisabledButton,
                ]}
                onPress={saveWeeklyTemplate}
                disabled={templateLoading}
              >
                {templateLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={19} color="#FFFFFF" />

                    <Text style={styles.templateSaveButtonText}>
                      Save Template
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.templateLoadButton,
                  templateLoading && styles.templateDisabledButton,
                ]}
                onPress={loadWeeklyTemplates}
                disabled={templateLoading}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={19}
                  color="#8B0000"
                />

                <Text style={styles.templateLoadButtonText}>Load Template</Text>
              </TouchableOpacity>
            </View>
          </View>

          {editingWeeklyDistance ? (
            <>
              <Text style={styles.editInstruction}>
                Enter the distance for each day.
              </Text>

              {DAYS.map((day) => (
                <View key={day} style={styles.editDayRow}>
                  <Text style={styles.editDayName}>{day}</Text>

                  <TextInput
                    style={styles.distanceInput}
                    value={
                      editingDistances[day] === 0
                        ? ""
                        : String(editingDistances[day])
                    }
                    onChangeText={(value) => changeDayDistance(day, value)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.kmText}>km</Text>
                </View>
              ))}

              <View style={styles.editTotalRow}>
                <Text style={styles.editTotalLabel}>Weekly Total</Text>

                <Text style={styles.editTotalValue}>
                  {DAYS.reduce(
                    (total, day) => total + Number(editingDistances[day] || 0),
                    0,
                  ).toFixed(1)}{" "}
                  km
                </Text>
              </View>

              <View style={styles.weeklyActionRow}>
                <TouchableOpacity
                  style={styles.cancelWeeklyButton}
                  onPress={cancelWeeklyEdit}
                  disabled={savingWeeklyDistance}
                >
                  <Text style={styles.cancelWeeklyText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveWeeklyButton}
                  onPress={saveWeeklyDistances}
                  disabled={savingWeeklyDistance}
                >
                  {savingWeeklyDistance ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveWeeklyText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.weeklyTotal}>
                {weeklyDistance.toFixed(1)} km
              </Text>

              <View style={styles.divider} />

              {DAYS.map((day) => (
                <DayRow key={day} day={day} distance={dailyDistances[day]} />
              ))}
            </>
          )}
        </View>

        {/* VEHICLE EFFICIENCY */}

        <TouchableOpacity style={styles.whiteCard} onPress={openEfficiencyEdit}>
          <Text style={styles.efficiencyValue}>{kmPerLiter} km/L</Text>

          <Text style={styles.editText}>✏️ Tap to edit vehicle efficiency</Text>
        </TouchableOpacity>

        {/* FUEL CALCULATION */}

        <View style={styles.calculationCard}>
          <Text style={styles.calculationTitle}>⛽ Fuel Calculation</Text>

          <CalculationRow
            label="Weekly Quota"
            value={`${quotaLiters.toFixed(2)} L`}
          />

          <CalculationRow
            label="Weekly Distance"
            value={`${weeklyDistance.toFixed(1)} km`}
          />

          <CalculationRow
            label="Vehicle Efficiency"
            value={`${kmPerLiter} km/L`}
          />

          <CalculationRow
            label="Fuel Used"
            value={`${fuelUsed.toFixed(2)} L`}
          />

          <CalculationRow
            label="Remaining Fuel"
            value={`${remainingFuel.toFixed(2)} L`}
          />

          <CalculationRow
            label="Daily Fuel Limit"
            value={`${dailyFuelLimit.toFixed(2)} L/day`}
          />

          <CalculationRow
            label="Recommended Daily Distance"
            value={`${dailyDistanceLimit.toFixed(1)} km/day`}
          />
        </View>

        {/* VEHICLE INFORMATION */}

        <View style={styles.userCard}>
          <Text style={styles.userTitle}>👤 Vehicle Information</Text>

          <InfoRow label="Owner" value={user.ownerName} />

          <InfoRow label="NIC" value={user.nic} />

          <InfoRow label="Phone" value={user.phone} />

          <InfoRow label="Vehicle Type" value={user.vehicleType} />

          <InfoRow label="Fuel Type" value={user.fuelType} />
        </View>

        {/* PROFILE */}

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() =>
            router.push({
              pathname: "/Profile",
              params: { nic: user.nic },
            })
          }
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={efficiencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEfficiencyModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit Vehicle Efficiency</Text>

            <Text style={styles.modalDescription}>
              Enter your vehicle's average kilometres per litre.
            </Text>

            <TextInput
              style={styles.modalInput}
              value={efficiencyInput}
              onChangeText={setEfficiencyInput}
              keyboardType="decimal-pad"
              placeholder="Example: 12"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEfficiencyModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveEfficiency}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={templateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <View style={styles.templateModalBackground}>
          <View style={styles.templateModalCard}>
            <View style={styles.templateModalHeader}>
              <Text style={styles.templateModalTitle}>
                Saved Weekly Templates
              </Text>

              <TouchableOpacity onPress={() => setTemplateModalVisible(false)}>
                <Ionicons name="close" size={27} color="#333333" />
              </TouchableOpacity>
            </View>

            {templates.length === 0 ? (
              <Text style={styles.templateEmptyText}>
                No saved templates yet. Enter your daily distances and save a
                template first.
              </Text>
            ) : (
              <ScrollView
                style={styles.templateList}
                keyboardShouldPersistTaps="handled"
              >
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.templateItem}
                    onPress={() => applyWeeklyTemplate(template)}
                  >
                    <View style={styles.templateItemInfo}>
                      <Text style={styles.templateItemName}>
                        {template.templateName}
                      </Text>

                      <Text style={styles.templateItemTotal}>
                        {template.totalDistance.toFixed(1)} km/week
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={23}
                      color="#8B0000"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.templateCloseButton}
              onPress={() => setTemplateModalVisible(false)}
            >
              <Text style={styles.templateCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DayRow({ day, distance }: { day: string; distance: number }) {
  return (
    <View style={styles.dayRow}>
      <Text style={styles.dayName}>{day}</Text>

      <Text style={styles.dayDistance}>
        {Number(distance || 0).toFixed(1)} km
      </Text>
    </View>
  );
}

function CalculationRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calculationRow}>
      <Text style={styles.calculationLabel}>{label}</Text>

      <Text style={styles.calculationValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>

      <Text style={styles.infoValue}>{value || "-"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#8B0000",
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },

  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#555",
  },

  errorText: {
    fontSize: 18,
    color: "#8B0000",
    marginBottom: 20,
  },

  loginButton: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },

  loginButtonText: {
    color: "#8B0000",
    fontWeight: "bold",
  },

  topHeader: {
    height: 75,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  dateText: {
    color: "#FFA500",
    fontSize: 23,
    fontWeight: "bold",
    marginBottom: 20,
    paddingLeft: 10,
  },

  vehicleCard: {
    backgroundColor: "#FFFFFF",
    minHeight: 120,
    borderRadius: 28,
    justifyContent: "center",
    paddingHorizontal: 45,
    marginBottom: 26,
  },

  vehicleNumber: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111",
  },

  qrCard: {
    height: 320,
    backgroundColor: "#DDDDDD",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 26,
    overflow: "hidden",
  },

  qrImage: {
    width: "90%",
    height: "90%",
  },

  qrText: {
    marginTop: 15,
    fontSize: 21,
    fontWeight: "600",
    color: "#555",
  },

  whiteCard: {
    backgroundColor: "#FFFFFF",
    minHeight: 100,
    borderRadius: 28,
    justifyContent: "center",
    paddingHorizontal: 30,
    paddingVertical: 22,
    marginBottom: 26,
  },

  bigCardText: {
    fontSize: 23,
    fontWeight: "bold",
    color: "#111",
  },

  quotaSubText: {
    marginTop: 8,
    fontSize: 15,
    color: "#666",
  },

  normalCardText: {
    fontSize: 19,
    color: "#555",
  },

  boldText: {
    fontWeight: "bold",
    color: "#333",
  },

  weeklyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    marginBottom: 26,
  },

  weeklyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  weeklyTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111",
    flex: 1,
  },

  editButton: {
    backgroundColor: "#FFF0D0",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 10,
  },

  editButtonText: {
    color: "#8B0000",
    fontWeight: "bold",
  },

  editInstruction: {
    color: "#666",
    marginTop: 15,
    marginBottom: 10,
  },

  weeklyTotal: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8B0000",
    marginTop: 18,
  },

  divider: {
    height: 1,
    backgroundColor: "#DDD",
    marginVertical: 15,
  },

  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  dayName: {
    fontSize: 16,
    color: "#555",
  },

  dayDistance: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },

  editDayRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
  },

  editDayName: {
    flex: 1,
    fontSize: 17,
    color: "#333",
    fontWeight: "500",
  },

  distanceInput: {
    width: 105,
    height: 45,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 17,
    textAlign: "right",
    backgroundColor: "#FAFAFA",
    color: "#111",
  },

  kmText: {
    width: 35,
    marginLeft: 8,
    fontSize: 16,
    color: "#555",
  },

  editTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#DDDDDD",
    marginTop: 15,
    paddingTop: 18,
  },

  editTotalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  editTotalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#8B0000",
  },

  weeklyActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },

  cancelWeeklyButton: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    marginRight: 10,
  },

  cancelWeeklyText: {
    color: "#555",
    fontWeight: "bold",
  },

  saveWeeklyButton: {
    backgroundColor: "#8B0000",
    paddingHorizontal: 25,
    paddingVertical: 13,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },

  saveWeeklyText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  templateControls: {
    marginTop: 18,
    marginBottom: 18,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "#FFF7E8",
  },

  templateSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333333",
    marginBottom: 12,
  },

  templateNameInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#222222",
    fontSize: 15,
    marginBottom: 12,
  },

  templateButtonRow: {
    flexDirection: "row",
    gap: 10,
  },

  templateSaveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#8B0000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
  },

  templateSaveButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },

  templateLoadButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#8B0000",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    gap: 6,
  },

  templateLoadButtonText: {
    color: "#8B0000",
    fontWeight: "700",
    fontSize: 13,
  },

  templateDisabledButton: {
    opacity: 0.6,
  },

  templateModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },

  templateModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },

  templateModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  templateModalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: "#222222",
    marginRight: 10,
  },

  templateEmptyText: {
    color: "#666666",
    lineHeight: 23,
    paddingVertical: 15,
  },

  templateList: {
    flexGrow: 0,
  },

  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    marginBottom: 10,
  },

  templateItemInfo: {
    flex: 1,
  },

  templateItemName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
  },

  templateItemTotal: {
    fontSize: 14,
    color: "#666666",
    marginTop: 5,
  },

  templateCloseButton: {
    backgroundColor: "#8B0000",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 15,
  },

  templateCloseButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  efficiencyValue: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111",
  },

  editText: {
    marginTop: 8,
    color: "#555",
    fontSize: 16,
  },

  calculationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    marginBottom: 26,
  },

  calculationTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
  },

  calculationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  calculationLabel: {
    color: "#666",
    flex: 1,
  },

  calculationValue: {
    fontWeight: "bold",
    color: "#8B0000",
  },

  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    marginBottom: 26,
  },

  userTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#111",
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  infoLabel: {
    color: "#666",
  },

  infoValue: {
    fontWeight: "bold",
    color: "#222",
    maxWidth: "55%",
    textAlign: "right",
  },

  profileButton: {
    backgroundColor: "#FFA500",
    height: 58,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  profileButtonText: {
    color: "#8B0000",
    fontWeight: "bold",
    fontSize: 17,
  },

  logoutButton: {
    backgroundColor: "#600000",
    height: 58,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  logoutText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 17,
  },

  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 25,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 25,
  },

  modalTitle: {
    fontSize: 23,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#222",
  },

  modalDescription: {
    color: "#666",
    marginBottom: 20,
  },

  modalInput: {
    height: 55,
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 12,
    paddingHorizontal: 15,
    fontSize: 18,
    color: "#222222",
  },

  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
  },

  cancelButton: {
    padding: 14,
    marginRight: 10,
  },

  cancelText: {
    color: "#555",
    fontWeight: "bold",
  },

  saveButton: {
    backgroundColor: "#FFA500",
    paddingHorizontal: 25,
    paddingVertical: 14,
    borderRadius: 10,
  },

  saveText: {
    color: "#8B0000",
    fontWeight: "bold",
  },
});
