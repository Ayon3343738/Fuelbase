import { Image, StyleSheet, Text, TouchableOpacity, View,TextInput, Alert,TouchableWithoutFeedback, 
  Keyboard, 
ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter,useLocalSearchParams } from "expo-router"; 
import { useEffect, useRef, useState } from "react";
import { FirebaseRecaptchaVerifierModal } from "expo-firebase-recaptcha";
import { signInWithPhoneNumber,PhoneAuthProvider,signInWithCredential } from "firebase/auth";
import {auth,app} from '../firebase/firebaseConfig';
import { getFirestore,
    collection,
    query,
    where,
    getDocs
 } from "firebase/firestore";
import { SafeAreaProviderCompat } from "@react-navigation/elements";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const router = useRouter();
  const [seconds, setSeconds]=useState(60);
  const [phone,setPhone]=useState("")
  const [otp,setOtp]=useState("");
  const [confirmation,setConfirmation]=useState<any>(null);
  const [otpSent,setOtpSent]=useState(false);
  const [loading,setLoading]=useState(false);
  const db= getFirestore(app);



  const recaptchaVerifier=useRef<any>(null);



useEffect(()=>{
    if(!otpSent||seconds<=0) return;
    const timer=setTimeout(()=>setSeconds((prev)=>prev-1),1000);
    return()=>clearTimeout(timer);
},[seconds,otpSent]
);

const toE164=(localNumber:string)=>{
    const digits=localNumber.replace(/[^0-9]/g,"");
    if(digits.startsWith("0")){
        return "+94"+digits.slice(1);
    }
    return "94"+digits;
};

const sendOtp=async()=>{
    const phoneRegex= /^07\d{8}$/;

    if(!phoneRegex.test(phone)){
        Alert.alert("Invalid phone number");
        return;
    }

try{
    setLoading(true);

    const q=query(
        collection(db,"users"),
        where("phone","==",phone)


    );

    const querySnapshot=await getDocs(q);

    if (querySnapshot.empty){
        Alert.alert(
            "phone number not registered"
        );
        return;
    }

    const formatedPhone=toE164(phone);

    const confirmationResult =await signInWithPhoneNumber(
        auth,
        formatedPhone,
        recaptchaVerifier.current
    );
    setConfirmation(confirmationResult);
    setOtpSent(true);
    setSeconds(60);

    Alert.alert(
        "OTP Sent",
        "okay now"
    );

}catch(error:any){
    console.log(error);
    Alert.alert("failed to sent",error.message);
}finally{
    setLoading(false);
}
};

const verifyOtp =async ()=>{
    if(!otp||otp.length<6){
        Alert.alert(
            "Invalid OTP"
            
        );
     return;
    }

    try{
        setLoading(true);

        await confirmation.confirm(otp);

        const q=query(
            collection(db,"users"),
            where("phone","==",phone)
        );

        const querySnapshot=await getDocs(q);

        if(querySnapshot.empty){
            Alert.alert(
                "user not found"
               
            );
        }
        const user=querySnapshot.docs[0].data();

        router.replace({
            pathname:"/main",
            params:{
               ownerName:user.ownerName,
               phone:user.phone,
               vehicleNumber:user.vehicleNumber,
               vehicleType:user.vehicleType,
               fuelType:user.fuelType,
               nic:user.nic,
               qrImage:user.qrImage
            },
        });

    }catch(error:any){
        console.log(error);
        Alert.alert(
            "Verification failed"
        );
    }finally{
        setLoading(false);
    }
};

const resendOtp=async()=>{
    setOtp("");
    
   try{
    await sendOtp();
   } catch(error){
    console.error(error);
   }
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
  attemptInvisibleVerification={true}/>

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
      placeholderTextColor={"#808080"}
      value={phone}
      editable={!otpSent}
      maxLength={10}
      onChangeText={(Text)=>setPhone(Text.replace(/[^0-9]/g,""))}
        />

    {!otpSent ?(
     <TouchableOpacity style={styles.button2} onPress={sendOtp} disabled={loading}>
      <Text style={styles.buttonText}>{loading ? "Sending" : "send otp"}</Text>
    </TouchableOpacity>
    ) : (
      <>
      <Text>
         {seconds > 0 ? `OTP expires in ${seconds} seconds` : "OTP expired"}
      </Text>

      <TextInput
        placeholder="OTP Pin"
        keyboardType="number-pad"
        style={styles.input}
        placeholderTextColor={"#808080"}
        value={otp}
        maxLength={6}
        onChangeText={(text)=>setOtp(text.replace(/[^0-9]/g,""))}

      />

      <TouchableOpacity style={styles.button2} onPress={verifyOtp} disabled={loading}>
        <Text style={styles.buttonText} > {loading ? "Verifing ": "Login"}
        </Text>
      </TouchableOpacity>

      { seconds <= 0 && (
        <TouchableOpacity onPress={resendOtp} style={{marginTop:15}}>
          <Text style={[styles.timerText,{textDecorationLine:"underline"}]}>
            Resend OTP
          </Text>
        </TouchableOpacity>
      )

      }

      </>
    )
    }  


  


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
    color:"#fff"
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
    width:"85%",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 15,
    fontStyle: "italic",
    
  },
  timerText: {
   color: "#fff",
   marginTop:20,
   fontSize: 14,
   fontStyle: "italic",
   textAlign: "center",
   fontWeight:"bold"
},
  button2: {
    backgroundColor: "#FFA500",
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    elevation: 3,
    marginTop:20
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8B0000",
    textAlign: "center",
  },

});
