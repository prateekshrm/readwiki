import {
    Colors,
    ColorScheme,
    ThemeColors,
    ThemeMode,
} from "@/constants/Colors";
import { setPreference, usePreferences } from "@/services/preferences";
import { useColorScheme } from "react-native";

export interface UseThemeResult {
    // Current user selected mode: "system" | "light" | "dark"
    theme: ThemeMode;
    // Effective resolved scheme: "light" | "dark"
    colorScheme: ColorScheme;
    // Whether effective scheme is dark
    isDark: boolean;
    // Semantic color palette for the active scheme
    colors: ThemeColors;
    // Switch theme mode
    setTheme: (mode: ThemeMode) => void;
}

export function useTheme(): UseThemeResult {
    const preferences = usePreferences();
    const systemScheme = useColorScheme();

    const colorScheme: ColorScheme =
        preferences.theme === "system"
            ? systemScheme === "dark"
                ? "dark"
                : "light"
            : preferences.theme;

    const colors: ThemeColors = Colors[colorScheme];
    const isDark = colorScheme === "dark";

    const setTheme = (mode: ThemeMode) => {
        setPreference("theme", mode);
    };

    return {
        theme: preferences.theme,
        colorScheme,
        isDark,
        colors,
        setTheme,
    };
}

export function useColors(): ThemeColors {
    return useTheme().colors;
}

export default useTheme;
