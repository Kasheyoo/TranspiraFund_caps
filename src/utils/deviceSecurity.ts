import { NativeModules } from "react-native";

const { DeviceSecurity } = NativeModules;

// Returns true if the device has a PIN, pattern, password, or biometric set
// up. Fail-open on a missing/broken native module so a build issue cannot
// permanently lock all users out of the app.
export async function isDeviceSecure(): Promise<boolean> {
  try {
    return await DeviceSecurity.isDeviceSecure();
  } catch {
    return true;
  }
}
