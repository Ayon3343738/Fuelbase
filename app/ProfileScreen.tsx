import React, { useEffect, useState } from "react";
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

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import * as ImagePicker from "expo-image-picker";

import { SafeAreaView } from "react-native-safe-area-context";

import { db, storage } from "../firebase/firebaseConfig";

// --------------------------------------------------
// COLORS
// --------------------------------------------------

const RED = "#E60000";
const WHITE = "#FFFFFF";
const DARK_RED = "#B80000";

// --------------------------------------------------
// USER TYPE
// --------------------------------------------------

type RegisteredUser = {
  ownerName?: string;
  nic?: string;
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  fuelType?: string;
  qrImageUrl?: string;
  qrImage?: string;
  remainingQuota?: number;
  validUntil?: string;
  accountStatus?: string;
};

// --------------------------------------------------
// PROFILE SCREEN
// --------------------------------------------------

export default function ProfileScreen() {
  const router = useRouter();

  const params = useLocalSearchParams<{
    nic?: string | string[];
  }>();

  const nic = Array.isArray(params.nic) ? params.nic[0] : params.nic;

  const userId = nic?.trim() ?? "";

  const [user, setUser] = useState<RegisteredUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingQR, setUploadingQR] = useState(false);

  // --------------------------------------------------
  // LOAD USER FROM FIRESTORE
  // --------------------------------------------------

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      Alert.alert("Error", "User NIC is missing.");
      return;
    }

    const userRef = doc(db, "users", userId);

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
        console.error("Profile loading error:", error);
        setLoading(false);

        Alert.alert("Error", "Unable to load profile information.");
      },
    );

    return () => unsubscribe();
  }, [userId]);

  // --------------------------------------------------
  // UPLOAD QR IMAGE TO FIREBASE
  // --------------------------------------------------

  const uploadQRCode = async () => {
    if (!userId) {
      Alert.alert("Error", "User NIC is missing.");
      return;
    }

    if (uploadingQR) return;

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos to upload your QR code.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setUploadingQR(true);

      const selectedImage = result.assets[0];

      const response = await fetch(selectedImage.uri);
      const blob = await response.blob();

      const fileName = `qr_${Date.now()}.jpg`;

      const storageRef = ref(storage, `qrImages/${userId}/${fileName}`);

      console.log("Step 1: Uploading QR image...");

      await uploadBytes(storageRef, blob, {
        contentType: selectedImage.mimeType || "image/jpeg",
      });

      console.log("Step 1 successful: QR uploaded.");

      const downloadURL = await getDownloadURL(storageRef);

      console.log("Step 2 successful: Download URL received.");

      await updateDoc(doc(db, "users", userId), {
        qrImageUrl: downloadURL,
      });

      console.log("Step 3 successful: Firestore updated.");
      //

      Alert.alert("Success", "Your QR code was uploaded successfully.");
    } catch (error) {
      console.error("QR upload error:", error);

      Alert.alert(
        "Upload failed",
        "Could not upload your QR code. Please try again.",
      );
    } finally {
      setUploadingQR(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={RED} barStyle="light-content" />

        <ActivityIndicator size="large" color={WHITE} />

        <Text style={styles.loadingText}>Loading profile...</Text>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // USER NOT FOUND
  // --------------------------------------------------

  if (!user) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar backgroundColor={RED} barStyle="light-content" />

        <Ionicons name="person-circle-outline" size={65} color={WHITE} />

        <Text style={styles.errorTitle}>Profile not found</Text>

        <Text style={styles.errorSubtitle}>
          We could not find your registered information.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --------------------------------------------------
  // QR IMAGE URL
  // --------------------------------------------------

  const qrImageUri = user.qrImageUrl || user.qrImage || "";

  // --------------------------------------------------
  // PROFILE UI
  // --------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={RED} barStyle="light-content" />

      {/* HEADER */}

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBack}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={25} color={WHITE} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Profile</Text>

        <View style={styles.headerRight} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* QR CODE */}

        <TouchableOpacity
          style={styles.qrContainer}
          onPress={uploadQRCode}
          disabled={uploadingQR}
          activeOpacity={0.85}
        >
          {uploadingQR ? (
            <View style={styles.qrPlaceholder}>
              <ActivityIndicator size="large" color={RED} />

              <Text style={styles.uploadText}>Uploading QR...</Text>
            </View>
          ) : qrImageUri ? (
            <>
              <Image
                source={{ uri: qrImageUri }}
                style={styles.qrImage}
                resizeMode="contain"
              />

              <View style={styles.editQRIcon}>
                <Ionicons name="camera" size={15} color={WHITE} />
              </View>
            </>
          ) : (
            <View style={styles.qrPlaceholder}>
              <Ionicons name="cloud-upload-outline" size={40} color={RED} />

              <Text style={styles.uploadText}>Upload QR Code</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* VEHICLE NUMBER */}

        <View style={styles.vehicleSection}>
          <Text style={styles.label}>Vehicle Number</Text>

          <Text style={styles.vehicleNumber}>{user.vehicleNumber || "-"}</Text>
        </View>

        {/* AVAILABLE QUOTA */}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Available Quota</Text>

          <Text style={styles.infoValue}>
            {Number(user.remainingQuota ?? 0).toFixed(2)} L
          </Text>
        </View>

        {/* VALID UNTIL */}

        <View style={styles.infoRow}>
          <Text style={styles.label}>Valid Until</Text>

          <Text style={styles.infoValue}>{user.validUntil || "-"}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// --------------------------------------------------
// STYLES
// --------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: RED,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    color: WHITE,
    fontSize: 14,
    marginTop: 12,
  },

  errorTitle: {
    color: WHITE,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 15,
  },

  errorSubtitle: {
    color: WHITE,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 30,
  },

  header: {
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },

  headerBack: {
    width: 30,
    height: 35,
    justifyContent: "center",
  },

  headerTitle: {
    color: WHITE,
    fontSize: 21,
    fontWeight: "700",
  },

  headerRight: {
    width: 30,
  },

  content: {
    paddingHorizontal: 20,
    paddingBottom: 25,
  },

  // QR CONTAINER

  qrContainer: {
    width: 250,
    height: 280,
    backgroundColor: WHITE,
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 14,
    marginBottom: 26,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    position: "relative",
  },

  qrImage: {
    width: "100%",
    height: "100%",
  },

  qrPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  uploadText: {
    color: RED,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
  },

  editQRIcon: {
    position: "absolute",
    right: 7,
    bottom: 7,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: DARK_RED,
    justifyContent: "center",
    alignItems: "center",
  },

  // VEHICLE NUMBER

  vehicleSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.55)",
  },

  label: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "400",
  },

  vehicleNumber: {
    color: WHITE,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },

  // QUOTA AND VALID UNTIL

  infoRow: {
    minHeight: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.55)",
  },

  infoValue: {
    color: WHITE,
    fontSize: 14,
    fontWeight: "500",
  },

  // BACK BUTTON

  backButton: {
    backgroundColor: WHITE,
    paddingVertical: 13,
    paddingHorizontal: 35,
    borderRadius: 10,
    marginTop: 25,
  },

  backButtonText: {
    color: RED,
    fontSize: 15,
    fontWeight: "700",
  },
});
