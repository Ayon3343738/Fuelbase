import DateTimePicker from "@react-native-community/datetimepicker";

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

  return (
    <DateTimePicker
      value={value}
      mode="date"
      display="default"
      maximumDate={new Date()}
      onChange={(_, selectedDate) => {
        onClose();

        if (selectedDate) {
          onChange(selectedDate);
        }
      }}
    />
  );
}
