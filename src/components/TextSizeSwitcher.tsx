import { useTheme } from "@/hooks/useTheme";
import {
    FONT_SCALES,
    setPreference,
    usePreferencesStore,
} from "@/stores/preferences.store";
import { useEffect, useRef, useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

const PADDING = 3;
const SWITCHER_HEIGHT = 38;

const TIMING_CONFIG = {
    duration: 250,
    easing: Easing.bezier(0.25, 1, 0.5, 1),
};

type SegmentLayout = {
    x: number;
    width: number;
};

export function TextSizeSwitcher() {
    const { colors } = useTheme();
    const fontScale = usePreferencesStore((state) => state.fontScale);

    const activeIndex = FONT_SCALES.findIndex((opt) => opt.value === fontScale);
    const safeActiveIndex = activeIndex >= 0 ? activeIndex : 1;

    const [segmentLayouts, setSegmentLayouts] = useState<
        Record<number, SegmentLayout>
    >({});
    const hasInitialized = useRef(false);

    const translateX = useSharedValue(PADDING);
    const indicatorWidth = useSharedValue(0);

    useEffect(() => {
        const activeLayout = segmentLayouts[safeActiveIndex];
        if (!activeLayout) {
            return;
        }

        if (!hasInitialized.current) {
            hasInitialized.current = true;
            translateX.value = activeLayout.x;
            indicatorWidth.value = activeLayout.width;
            return;
        }

        translateX.value = withTiming(activeLayout.x, TIMING_CONFIG);
        indicatorWidth.value = withTiming(activeLayout.width, TIMING_CONFIG);
    }, [safeActiveIndex, segmentLayouts, translateX, indicatorWidth]);

    const handleSegmentLayout = (index: number, event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setSegmentLayouts((prev) => {
            const existing = prev[index];
            if (existing && existing.x === x && existing.width === width) {
                return prev;
            }
            return { ...prev, [index]: { x, width } };
        });
    };

    const indicatorStyle = useAnimatedStyle(() => ({
        width: indicatorWidth.value,
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
                        backgroundColor: colors.primary,
                    },
                    indicatorStyle,
                ]}
            />

            {FONT_SCALES.map((option, index) => {
                const isActive = index === safeActiveIndex;

                return (
                    <Pressable
                        key={option.label}
                        style={styles.segment}
                        onLayout={(event) => handleSegmentLayout(index, event)}
                        onPress={() => setPreference("fontScale", option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isActive }}
                        accessibilityLabel={`${option.label} text size`}
                    >
                        <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.8}
                            style={[
                                styles.label,
                                {
                                    color: isActive
                                        ? colors.textInverse
                                        : colors.textSecondary,
                                },
                            ]}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

export default TextSizeSwitcher;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        height: SWITCHER_HEIGHT,
        borderRadius: 999,
        padding: PADDING,
        position: "relative",
    },
    indicator: {
        position: "absolute",
        top: PADDING,
        bottom: PADDING,
        left: 0,
        borderRadius: 999,
    },
    segment: {
        flex: 1,
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 6,
        zIndex: 1,
    },
    label: {
        fontSize: 13,
        fontFamily: "DMSans-Medium",
    },
});
