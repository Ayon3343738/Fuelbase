import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    addDoc,
    collection,
    getDocs,
    serverTimestamp,
} from "firebase/firestore";
import { useState } from "react";
import {
    ActivityIndicator,
    Alert,
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

import { app } from "../firebase/firebaseConfig";

const db = getFirestoreSafe();

function getFirestoreSafe() {
  return require("firebase/firestore").getFirestore(app);
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type Day = (typeof DAYS)[number];

type Distances = Record<Day, string>;

type WeeklyTemplate = {
  id: string;
  templateName: string;
  distances: Record<Day, number>;
  totalDistance: number;
};

const emptyDistances = (): Distances => ({
  Monday: "0",
  Tuesday: "0",
  Wednesday: "0",
  Thursday: "0",
  Friday: "0",
  Saturday: "0",
  Sunday: "0",
});

export default function WeeklyDistanceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ nic?: string }>();

  // Pass the registered user's NIC when opening this screen.
  const nic = typeof params.nic === "string" ? params.nic : "";

  const [distances, setDistances] = useState<Distances>(emptyDistances);

  const [templateName, setTemplateName] = useState("Work Week");

  const [templates, setTemplates] = useState<WeeklyTemplate[]>([]);

  const [modalVisible, setModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);

  const numericDistances = DAYS.map((day) => {
    const value = Number(distances[day]);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  });

  const weeklyTotal = numericDistances.reduce(
    (sum, distance) => sum + distance,
    0,
  );

  const updateDistance = (day: Day, value: string) => {
    // Allow only non-negative decimal numbers.
    if (value !== "" && !/^\d*\.?\d*$/.test(value)) {
      return;
    }

    setDistances((previous) => ({
      ...previous,
      [day]: value,
    }));
  };

  const getTemplateCollection = () => {
    if (!nic.trim()) {
      throw new Error(
        "User NIC is missing. Open this screen with the logged-in user's NIC.",
      );
    }

    return collection(db, "users", nic, "weeklyTemplates");
  };

  // Save the current weekly distances as a reusable template.
  const saveTemplate = async () => {
    if (!nic.trim()) {
      Alert.alert("Missing user", "Please log in again.");
      return;
    }

    if (!templateName.trim()) {
      Alert.alert("Template name", "Enter a template name.");
      return;
    }

    const invalidDay = DAYS.find((day) => {
      const value = distances[day].trim();
      return (
        value === "" || !Number.isFinite(Number(value)) || Number(value) < 0
      );
    });

    if (invalidDay) {
      Alert.alert(
        "Invalid distance",
        `Enter a valid distance for ${invalidDay}.`,
      );
      return;
    }

    setLoading(true);

    try {
      const savedDistances = Object.fromEntries(
        DAYS.map((day) => [day, Number(distances[day])]),
      ) as Record<Day, number>;

      const total = DAYS.reduce((sum, day) => sum + savedDistances[day], 0);

      await addDoc(getTemplateCollection(), {
        templateName: templateName.trim(),
        distances: savedDistances,
        totalDistance: total,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Saved successfully",
        `"${templateName.trim()}" is now available to reuse next week.`,
      );
    } catch (error) {
      console.error("Save template error:", error);
      Alert.alert(
        "Save failed",
        "Could not save the template. Check your Firebase configuration and internet connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Retrieve saved templates from Firestore.
  const loadTemplates = async () => {
    if (!nic.trim()) {
      Alert.alert("Missing user", "Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const snapshot = await getDocs(getTemplateCollection());

      const savedTemplates: WeeklyTemplate[] = snapshot.docs.map((document) => {
        const data = document.data();

        const saved = data.distances ?? {};

        const normalizedDistances = Object.fromEntries(
          DAYS.map((day) => [day, Math.max(0, Number(saved[day]) || 0)]),
        ) as Record<Day, number>;

        return {
          id: document.id,
          templateName: String(data.templateName ?? "Saved Week"),
          distances: normalizedDistances,
          totalDistance: DAYS.reduce(
            (sum, day) => sum + normalizedDistances[day],
            0,
          ),
        };
      });

      setTemplates(savedTemplates);
      setModalVisible(true);
    } catch (error) {
      console.error("Load templates error:", error);
      Alert.alert("Load failed", "Could not retrieve saved templates.");
    } finally {
      setLoading(false);
    }
  };

  // Apply a saved template to the seven daily input fields.
  const useTemplate = (template: WeeklyTemplate) => {
    setDistances(
      Object.fromEntries(
        DAYS.map((day) => [day, String(template.distances[day] ?? 0)]),
      ) as Distances,
    );

    setTemplateName(template.templateName);
    setModalVisible(false);

    Alert.alert(
      "Template loaded",
      `Loaded "${template.templateName}". You can edit the distances before saving or using them.`,
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#D90000" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Weekly Distance</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Enter your daily travel distance in kilometres. Save your regular
          routine to reuse it next week.
        </Text>

        {/* Weekly total */}
        <View style={styles.totalCard}>
          <Ionicons name="speedometer-outline" size={34} color="#FFFFFF" />

          <View style={styles.totalTextContainer}>
            <Text style={styles.totalLabel}>Total Weekly Distance</Text>

            <Text style={styles.totalValue}>{weeklyTotal.toFixed(2)} km</Text>
          </View>
        </View>

        {/* Template name */}
        <Text style={styles.sectionTitle}>Weekly Template</Text>

        <TextInput
          style={styles.templateInput}
          value={templateName}
          onChangeText={setTemplateName}
          placeholder="Example: Work Week"
          placeholderTextColor="#888888"
          maxLength={50}
        />

        {/* Daily distances */}
        <Text style={styles.sectionTitle}>Daily Distances</Text>

        <View style={styles.distanceCard}>
          {DAYS.map((day, index) => (
            <View
              key={day}
              style={[
                styles.dayRow,
                index === DAYS.length - 1 && styles.lastDayRow,
              ]}
            >
              <Text style={styles.dayLabel}>{day}</Text>

              <View style={styles.distanceInputContainer}>
                <TextInput
                  style={styles.distanceInput}
                  value={distances[day]}
                  onChangeText={(value) => updateDistance(day, value)}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#999999"
                />

                <Text style={styles.kmLabel}>km</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Save template */}
        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={saveTemplate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save-outline" size={22} color="#FFFFFF" />

              <Text style={styles.primaryButtonText}>Save Weekly Template</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Reuse template */}
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={loadTemplates}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Ionicons name="folder-open-outline" size={22} color="#D90000" />

          <Text style={styles.secondaryButtonText}>Load Saved Template</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => setDistances(emptyDistances())}
        >
          <Text style={styles.resetText}>Clear Daily Distances</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Saved template picker */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Templates</Text>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={27} color="#333333" />
              </TouchableOpacity>
            </View>

            {templates.length === 0 ? (
              <Text style={styles.emptyText}>
                No saved templates yet. Enter your distances and save a template
                first.
              </Text>
            ) : (
              <ScrollView
                style={styles.templateList}
                keyboardShouldPersistTaps="handled"
              >
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={styles.savedTemplate}
                    onPress={() => useTemplate(template)}
                  >
                    <View style={styles.savedTemplateInfo}>
                      <Text style={styles.savedTemplateName}>
                        {template.templateName}
                      </Text>

                      <Text style={styles.savedTemplateTotal}>
                        {template.totalDistance.toFixed(2)} km/week
                      </Text>
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={23}
                      color="#D90000"
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  header: {
    backgroundColor: "#D90000",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },

  backButton: {
    marginRight: 18,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "700",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  description: {
    color: "#555555",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },

  totalCard: {
    backgroundColor: "#D90000",
    borderRadius: 18,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  totalTextContainer: {
    marginLeft: 17,
  },

  totalLabel: {
    color: "#FFFFFF",
    fontSize: 15,
  },

  totalValue: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 5,
  },

  sectionTitle: {
    color: "#222222",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 10,
  },

  templateInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontSize: 16,
    color: "#222222",
    marginBottom: 25,
  },

  distanceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },

  dayRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  lastDayRow: {
    borderBottomWidth: 0,
  },

  dayLabel: {
    fontSize: 16,
    color: "#333333",
    fontWeight: "500",
  },

  distanceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 9,
    paddingHorizontal: 10,
    width: 125,
  },

  distanceInput: {
    flex: 1,
    textAlign: "right",
    paddingVertical: 10,
    fontSize: 16,
    color: "#222222",
  },

  kmLabel: {
    color: "#666666",
    marginLeft: 8,
  },

  primaryButton: {
    backgroundColor: "#D90000",
    borderRadius: 13,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.6,
  },

  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#D90000",
    borderRadius: 13,
    paddingVertical: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 13,
  },

  secondaryButtonText: {
    color: "#D90000",
    fontSize: 16,
    fontWeight: "700",
  },

  resetButton: {
    alignItems: "center",
    paddingVertical: 18,
  },

  resetText: {
    color: "#666666",
    fontSize: 14,
    textDecorationLine: "underline",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    maxHeight: "75%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222222",
  },

  templateList: {
    flexGrow: 0,
  },

  savedTemplate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 15,
    paddingHorizontal: 12,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    marginBottom: 10,
  },

  savedTemplateInfo: {
    flex: 1,
  },

  savedTemplateName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
  },

  savedTemplateTotal: {
    fontSize: 14,
    color: "#666666",
    marginTop: 5,
  },

  emptyText: {
    color: "#666666",
    lineHeight: 23,
    paddingVertical: 15,
  },

  closeButton: {
    backgroundColor: "#D90000",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 15,
  },

  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
