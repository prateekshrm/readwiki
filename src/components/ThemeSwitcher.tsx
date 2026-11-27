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

const SEGMENT_SIZE = 32;
const INDICATOR_SIZE = SEGMENT_SIZE;
const PADDING = 2;
const GAP = PADDING;
const SWITCHER_HEIGHT = SEGMENT_SIZE + PADDING * 2; // 36
const SWITCHER_WIDTH =
    SEGMENT_SIZE * OPTIONS.length + PADDING * 2 + GAP * (OPTIONS.length - 1); // 104
const SEGMENT_STEP = SEGMENT_SIZE + GAP; // 34

export function ThemeSwitcher() {
    const { theme, setTheme, colors, isDark } = useTheme();

    const activeIndex = OPTIONS.findIndex((opt) => opt.mode === theme);
    const safeActiveIndex = activeIndex >= 0 ? activeIndex : 0;

    const translateX = useSharedValue(PADDING + safeActiveIndex * SEGMENT_STEP);

    useEffect(() => {
        translateX.value = withTiming(
            PADDING + safeActiveIndex * SEGMENT_STEP,
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
                        backgroundColor: colors.primary,
                    },
                    indicatorStyle,
                ]}
            />

            {OPTIONS.map((option, index) => {
                const isActive = index === safeActiveIndex;
                const activeColor = isDark ? "#000000" : "#FFFFFF";
                const iconColor = isActive ? activeColor : colors.textSecondary;

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
        padding: PADDING,
        gap: GAP,
        position: "relative",
    },
    indicator: {
        position: "absolute",
        top: PADDING,
        left: 0,
    },
    segment: {
        width: SEGMENT_SIZE,
        height: SEGMENT_SIZE,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
});
