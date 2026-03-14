declare module "react-native-vector-icons/FontAwesome5" {
  import { Component } from "react";
  import { TextStyle, ViewStyle } from "react-native";
  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle | ViewStyle;
  }
  export default class FontAwesome5 extends Component<IconProps> {}
}

declare module "react-native-image-picker" {
  export interface ImagePickerResponse {
    didCancel?: boolean;
    errorCode?: string;
    errorMessage?: string;
    assets?: Array<{ uri?: string; fileName?: string; type?: string }>;
  }
  export interface CameraOptions {
    mediaType?: "photo" | "video" | "mixed";
    quality?: number;
    saveToPhotos?: boolean;
  }
  export function launchCamera(
    options: CameraOptions,
  ): Promise<ImagePickerResponse>;
}

declare module "react-native-geolocation-service" {
  export interface GeoPosition {
    coords: {
      latitude: number;
      longitude: number;
      altitude: number | null;
      accuracy: number;
      speed: number | null;
      heading: number | null;
    };
    timestamp: number;
  }
  export interface GeoError {
    code: number;
    message: string;
  }
  const Geolocation: {
    getCurrentPosition(
      success: (position: GeoPosition) => void,
      error?: (error: GeoError) => void,
      options?: { enableHighAccuracy?: boolean; timeout?: number },
    ): void;
    requestAuthorization(authorizationLevel?: "whenInUse" | "always"): Promise<string>;
  };
  export default Geolocation;
}
