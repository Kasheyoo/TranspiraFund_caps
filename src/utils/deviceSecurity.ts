import { NativeModules } from "react-native";

const { DeviceSecurity } = NativeModules;

export async function isDeviceSecure(): Promise<boolean> {
  try {
    return await DeviceSecurity.isDeviceSecure();
  } catch {
    return true;
  }
}
