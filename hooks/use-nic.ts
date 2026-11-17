import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

export const NIC_STORAGE_KEY = "currentNic";

/**
 * Returns the logged-in user's NIC.
 * Uses the route param when present (and remembers it), otherwise falls back
 * to the last NIC saved on this device. `ready` is false until that lookup ends.
 */
export function useNic() {
  const params = useLocalSearchParams<{ nic?: string | string[] }>();
  const fromParams = (
    Array.isArray(params.nic) ? params.nic[0] : params.nic
  )?.trim();

  const [stored, setStored] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (fromParams) {
      AsyncStorage.setItem(NIC_STORAGE_KEY, fromParams).catch(() => {});
      setReady(true);
      return;
    }

    AsyncStorage.getItem(NIC_STORAGE_KEY)
      .then((value) => active && setStored(value?.trim() || null))
      .catch(() => {})
      .finally(() => active && setReady(true));

    return () => {
      active = false;
    };
  }, [fromParams]);

  return { nic: fromParams || stored || undefined, ready };
}
