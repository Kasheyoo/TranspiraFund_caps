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
