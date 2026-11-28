import Colors from "@/constants/Colors";
import { useLayoutStore } from "@/stores/layout.store";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const { height } = Dimensions.get("screen");
const darkColors = Colors.dark;

const FlowSkeleton = () => {
    const tabBarHeight = useLayoutStore((state) => state.tabBarHeight);
    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 750 }), -1, true);
    }, [shimmer]);

    const shimmerStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            shimmer.value,
            [0, 1],
            [darkColors.backgroundSecondary, darkColors.backgroundMuted],
        ),
    }));

    const heroShimmerStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            shimmer.value,
            [0, 1],
            [darkColors.background, darkColors.backgroundSecondary],
        ),
    }));

    return (
        <View style={styles.page}>
            <Animated.View style={[styles.heroPlaceholder, heroShimmerStyle]}>
                <LinearGradient
                    colors={["transparent", darkColors.background]}
                    locations={[0.45, 1]}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <View
                style={[
                    styles.bottomContainer,
                    { paddingBottom: (tabBarHeight || 88) + 20 },
                ]}
            >
                <Animated.View
                    style={[styles.titleLine, { width: "85%" }, shimmerStyle]}
                />
                <Animated.View
                    style={[
                        styles.titleLine,
                        { width: "55%", marginBottom: 4 },
                        shimmerStyle,
                    ]}
                />

                <Animated.View
                    style={[
                        styles.extractLine,
                        { width: "100%" },
                        shimmerStyle,
                    ]}
                />
                <Animated.View
                    style={[styles.extractLine, { width: "92%" }, shimmerStyle]}
                />
                <Animated.View
                    style={[styles.extractLine, { width: "68%" }, shimmerStyle]}
                />

                <View style={styles.actionsRow}>
                    <Animated.View style={[styles.readButton, shimmerStyle]} />
                    <Animated.View style={[styles.circle, shimmerStyle]} />
                    <Animated.View style={[styles.circle, shimmerStyle]} />
                </View>
            </View>
        </View>
    );
};

export default FlowSkeleton;

const styles = StyleSheet.create({
    page: {
        height,
        backgroundColor: darkColors.background,
    },

    heroPlaceholder: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.5,
    },

    bottomContainer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        gap: 10,
    },

    titleLine: {
        height: 28,
        borderRadius: 999,
    },

    extractLine: {
        height: 14,
        borderRadius: 999,
    },

    actionsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 6,
    },

    readButton: {
        flex: 1,
        height: 48,
        borderRadius: 999,
    },

    circle: {
        width: 52,
        height: 52,
        borderRadius: 999,
    },
});
