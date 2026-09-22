import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
export default function HomeScreen() {

const router = useRouter();
  
return (
  <View style={styles.container}>
      <Image
        source={require("../../assets/images/LOGO.png")}
        style={styles.logo}
      />


      <Text style={styles.subtitle}>
        Smart Fuel Management application for everyone
      </Text>

  <TouchableOpacity 
      style={styles.button1}
      onPress={()=>router.push("/Login")}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

  <Text style={styles.register}>NEW HERE ? create an account ---</Text>
      <TouchableOpacity 
      style={styles.button2}
      onPress={()=>router.push("/Register")}
      >
        <Text style={styles.buttonText}>Register</Text>
      </TouchableOpacity>
  </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#8B0000",
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
  button1: {
    backgroundColor: "white",
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    marginTop: 30,
    elevation: 3,
  },
  button2: {
    backgroundColor: "#FFA500",
    paddingVertical: 20,
    paddingHorizontal: 100,
    borderRadius: 8,
    elevation: 3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8B0000",
    textAlign: "center",
  },
  register: {
    marginTop: 20,
    color:"#fff",
    fontStyle:"italic"
  },
});
