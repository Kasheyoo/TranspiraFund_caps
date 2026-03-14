import { FontAwesome5 } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

interface BottomNavBarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
}

export const BottomNavBar = ({ currentScreen, onNavigate }: BottomNavBarProps) => {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: "Dashboard", icon: "home" },
    { name: "Projects", icon: "folder" },
    { name: "Notifications", icon: "bell" },
    { name: "Settings", icon: "cog" },
  ];

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) }]}
    >
      <View style={styles.floatingBar}>
        {tabs.map((tab) => {
          const active = currentScreen === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, active && styles.activeTab]}
              onPress={() => onNavigate(tab.name)}
            >
              <FontAwesome5
                name={tab.icon}
                size={20}
                color={active ? COLORS.primary : COLORS.textTertiary}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  floatingBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    padding: 8,
    width: "90%",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  tab: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
  },
  activeTab: { backgroundColor: COLORS.primarySoft },
});
