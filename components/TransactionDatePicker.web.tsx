import { Modal, Text, TouchableOpacity, View } from "react-native";

type Props = {
  visible: boolean;
  value: Date;
  onChange: (date: Date) => void;
  onClose: () => void;
};

export default function TransactionDatePicker({
  visible,
  value,
  onChange,
  onClose,
}: Props) {
  if (!visible) return null;

  const dateValue = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");

  const today = [
    new Date().getFullYear(),
    String(new Date().getMonth() + 1).padStart(2, "0"),
    String(new Date().getDate()).padStart(2, "0"),
  ].join("-");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.5)",
        }}
      >
        <View
          style={{
            backgroundColor: "white",
            padding: 25,
            borderRadius: 12,
            width: "85%",
          }}
        >
          <Text style={{ fontSize: 18, marginBottom: 15 }}>Select Date</Text>

          <input
            type="date"
            value={dateValue}
            max={today}
            onChange={(event) => {
              if (event.target.value) {
                onChange(new Date(`${event.target.value}T00:00:00`));
                onClose();
              }
            }}
            style={{
              width: "100%",
              padding: 12,
              fontSize: 16,
              boxSizing: "border-box",
            }}
          />

          <TouchableOpacity onPress={onClose} style={{ marginTop: 20 }}>
            <Text style={{ color: "#CC0A0A", textAlign: "right" }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
