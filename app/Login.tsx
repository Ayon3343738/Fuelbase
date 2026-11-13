import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";

import { signInWithPhoneNumber } from "firebase/auth";
import { app, auth } from "../firebase/firebaseConfig";

import {
  collection,
  getDocs,
  getFirestore,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();

  const [seconds, setSeconds] = useState(60);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<any>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const db = getFirestore(app);
  const recaptchaVerifier = useRef<any>(null);

  // OTP countdown
  useEffect(() => {
    if (!otpSent || seconds <= 0) return;

    const timer = setTimeout(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [seconds, otpSent]);

  // Convert Sri Lankan local number to international format
  const toE164 = (localNumber: string) => {
    const digits = localNumber.replace(/[^0-9]/g, "");

    if (digits.startsWith("0")) {
      return "+94" + digits.slice(1);
    }

    return "+94" + digits;
  };

  // Send OTP
  const sendOtp = async () => {
    const phoneRegex = /^07\d{8}$/;

    if (!phoneRegex.test(phone)) {
      Alert.alert("Invalid phone number", "Enter a valid 10-digit number.");
      return;
    }

    try {
      setLoading(true);

      // Do not query Firestore before authentication.
      const formattedPhone = toE164(phone);

      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        recaptchaVerifier.current,
      );

      setConfirmation(confirmationResult);
      setOtpSent(true);
      setSeconds(60);
      setOtp("");

      Alert.alert("OTP Sent", "Please enter your OTP.");
    } catch (error: any) {
      console.log("OTP sending error:", error);

      Alert.alert(
        "Failed to send OTP",
        error.message || "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and find Firestore profile
  const verifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert("Invalid OTP", "Enter the 6-digit OTP.");
      return;
    }

    if (!confirmation) {
      Alert.alert("Error", "Please request an OTP first.");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Verify OTP and authenticate with Firebase
      const userCredential = await confirmation.confirm(otp);
      const firebaseUser = userCredential.user;

      if (!firebaseUser || !firebaseUser.phoneNumber) {
        Alert.alert("Login failed", "Authentication user not found.");
        return;
      }

      // Step 2: Get the verified international phone number
      const verifiedPhone = firebaseUser.phoneNumber;

      // Step 3: Find the matching Firestore profile
      // Your users collection must contain phoneE164.
      const q = query(
        collection(db, "users"),
        where("phoneE164", "==", verifiedPhone),
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        Alert.alert(
          "User not registered",
          "Your phone number is authenticated, but no matching profile was found.",
        );
        return;
      }

      if (querySnapshot.size > 1) {
        Alert.alert(
          "Login failed",
          "Multiple profiles have the same phone number. Please contact the administrator.",
        );
        return;
      }

      // Step 4: Get the profile
      const userDoc = querySnapshot.docs[0];
      const user = userDoc.data();

      // Step 5: Save Firebase Authentication UID
      await updateDoc(userDoc.ref, {
        authUid: firebaseUser.uid,
      });

      console.log("Authentication UID saved:", firebaseUser.uid);

      // Step 6: Navigate to main screen
      router.replace({
        pathname: "/main",
        params: {
          nic: userDoc.id,
          ownerName: user.ownerName || "",
          phone: user.phone || phone,
          vehicleNumber: user.vehicleNumber || "",
          vehicleType: user.vehicleType || "",
          fuelType: user.fuelType || "",
          NIC: user.nic || "",
          qrImage: user.qrImageUrl || "",
        },
      });
    } catch (error: any) {
      console.log("OTP verification/login error:", error);

      Alert.alert(
        "Verification failed",
        error.message || "Please check your OTP and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOtp = async () => {
    setOtp("");
    setOtpSent(false);
    setConfirmation(null);

    await sendOtp();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.innerContainer}
        showsVerticalScrollIndicator={false}
      >
        <FirebaseRecaptchaVerifierModal
          ref={recaptchaVerifier}
          firebaseConfig={app.options}
          attemptInvisibleVerification={true}
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push("/")}
        >
          <Ionicons name="arrow-back" size={30} color="white" />
        </TouchableOpacity>

        <Image
          source={require("../assets/images/LOGO.png")}
          style={styles.logo}
        />

        <Text style={styles.subtitle}>
          Smart Fuel Management application for everyone
        </Text>

        <TextInput
          placeholder="Phone number"
          keyboardType="phone-pad"
          style={styles.input}
          placeholderTextColor="#808080"
          value={phone}
          editable={!otpSent}
          maxLength={10}
          onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, ""))}
        />

        {!otpSent ? (
          <TouchableOpacity
            style={styles.button2}
            onPress={sendOtp}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Sending..." : "Send OTP"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.timerText}>
              {seconds > 0
                ? `OTP expires in ${seconds} seconds`
                : "OTP expired"}
            </Text>

            <TextInput
              placeholder="OTP Pin"
              keyboardType="number-pad"
              style={styles.input}
              placeholderTextColor="#808080"
              value={otp}
              maxLength={6}
              onChangeText={(text) => setOtp(text.replace(/[^0-9]/g, ""))}
            />

            <TouchableOpacity
              style={styles.button2}
              onPress={verifyOtp}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Verifying..." : "Login"}
              </Text>
            </TouchableOpacity>

            {seconds <= 0 && (
              <TouchableOpacity
                onPress={resendOtp}
                style={{ marginTop: 15 }}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.timerText,
                    { textDecorationLine: "underline" },
                  ]}
                >
                  Resend OTP
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#8B0000",
  },

  innerContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 50,
  },

  logo: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 20,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 35,
    lineHeight: 22,
    fontWeight: "bold",
    color: "#fff",
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
    zIndex: 100,
  },

  input: {
    fontSize: 15,
    height: 50,
    width: "85%",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 15,
    fontStyle: "italic",
  },

  timerText: {
    color: "#fff",
    marginTop: 20,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    fontWeight: "bold",
  },

  button2: {
    backgroundColor: "#FFA500",
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    elevation: 3,
    marginTop: 20,
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8B0000",
    textAlign: "center",
  },
});
