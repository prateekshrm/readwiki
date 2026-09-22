import { ThemeMode } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import RemixIcon, { IconName } from "react-native-remix-icon";

interface ThemeOption {
    mode: ThemeMode;
    icon: IconName;
    accessibilityLabel: string;
}

const OPTIONS: ThemeOption[] = [
    { mode: "system", icon: "mac-line", accessibilityLabel: "System theme" },
    { mode: "light", icon: "sun-line", accessibilityLabel: "Light theme" },
    { mode: "dark", icon: "moon-line", accessibilityLabel: "Dark theme" },
];

const SEGMENT_WIDTH = 34;
const INDICATOR_SIZE = 30;
const SWITCHER_HEIGHT = 34;
const PADDING = 2;
const SWITCHER_WIDTH = SEGMENT_WIDTH * 3 + PADDING * 2; // 106
const INDICATOR_OFFSET = PADDING + (SEGMENT_WIDTH - INDICATOR_SIZE) / 2; // 4

export function ThemeSwitcher() {
    const { theme, setTheme, colors, isDark } = useTheme();

    const activeIndex = OPTIONS.findIndex((opt) => opt.mode === theme);
    const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

    const translateX = useSharedValue(
        INDICATOR_OFFSET + safeActiveIndex * SEGMENT_WIDTH,
    );

    useEffect(() => {
        translateX.value = withTiming(
            INDICATOR_OFFSET + safeActiveIndex * SEGMENT_WIDTH,
            {
                duration: 250,
                easing: Easing.bezier(0.25, 1, 0.5, 1),
            },
        );
    }, [safeActiveIndex, translateX]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: colors.backgroundMuted,
                },
            ]}
            accessibilityRole="radiogroup"
        >
            <Animated.View
                style={[
                    styles.indicator,
                    {
                        width: INDICATOR_SIZE,
                        height: INDICATOR_SIZE,
                        borderRadius: INDICATOR_SIZE / 2,
                        backgroundColor: isDark ? "#FFFFFF" : "#000000",
                    },
                    indicatorStyle,
                ]}
            />

            {OPTIONS.map((option, index) => {
                const isActive = index === safeActiveIndex;
                const activeColor = isDark ? "#000000" : "#FFFFFF";
                const iconColor = isActive ? activeColor : colors.textMuted;

                return (
                    <Pressable
                        key={option.mode}
                        style={styles.segment}
                        onPress={() => setTheme(option.mode)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={option.accessibilityLabel}
                    >
                        <RemixIcon
                            name={option.icon}
                            size={16}
                            color={iconColor}
                            fallback={null}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
}

export default ThemeSwitcher;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        height: SWITCHER_HEIGHT,
        width: SWITCHER_WIDTH,
        borderRadius: 999,
        paddingLeft: PADDING,
        paddingRight: PADDING,
        position: "relative",
    },
    indicator: {
        position: "absolute",
        top: PADDING,
        left: 0,
    },
    segment: {
        width: SEGMENT_WIDTH,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
});
