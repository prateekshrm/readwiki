import { useHeaderProgress } from "@/components/HeaderScroll";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ReactNode, useState } from "react";
import { Pressable, StatusBar, StyleSheet, View } from "react-native";
import Animated, {
    interpolateColor,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
} from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderProps {
    title: string;
    canGoBack?: boolean;
    rightComponent?: ReactNode;
}

const Header = ({ title, canGoBack = false, rightComponent }: HeaderProps) => {
    const insets = useSafeAreaInsets();
    const progress = useHeaderProgress();
    const { colors, isDark } = useTheme();

    // Dark status bar icons while the header is light (top); light once scrolled over dark gradient.
    const [scrolled, setScrolled] = useState(false);
    useAnimatedReaction(
        () => progress.value > 0.5,
        (isScrolled, previous) => {
            if (isScrolled !== previous) {
                runOnJS(setScrolled)(isScrolled);
            }
        },
    );

    // Gradient fades in as you scroll.
    const gradientStyle = useAnimatedStyle(() => ({
        opacity: progress.value,
    }));

    // Title crossfades to white on scroll.
    const titleStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            progress.value,
            [0, 1],
            [colors.text, isDark ? "#FFFFFF" : colors.textInverse],
        ),
    }));

    return (
        <View
            style={{
                paddingTop: insets.top + 8,
            }}
        >
            <StatusBar
                barStyle={
                    isDark
                        ? "light-content"
                        : scrolled
                          ? "light-content"
                          : "dark-content"
                }
            />

            <Animated.View
                style={[
                    styles.gradient,
                    { height: insets.top + 84 },
                    gradientStyle,
                ]}
            >
                <LinearGradient
                    colors={["rgba(0,0,0,0.5)", "transparent"]}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>

            <View style={styles.headerContent}>
                <View style={styles.leftContainer}>
                    {canGoBack && (
                        <Pressable
                            style={({ pressed }) => [
                                styles.pill,
                                { backgroundColor: colors.backgroundMuted },
                                pressed && styles.pillPressed,
                            ]}
                            onPress={() => router.back()}
                        >
                            <RemixIcon
                                name="arrow-left-s-line"
                                size={20}
                                color={colors.text}
                                fallback={null}
                            />
                        </Pressable>
                    )}

                    <Animated.Text style={[styles.logo, titleStyle]}>
                        {title}
                    </Animated.Text>
                </View>

                <View style={styles.rightContainer}>{rightComponent}</View>
            </View>
        </View>
    );
};

export default Header;

const styles = StyleSheet.create({
    gradient: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },

    headerContent: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        zIndex: 1001,
    },

    leftContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        flex: 1,
    },

    pill: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 100,
    },

    pillPressed: { filter: "brightness(0.9)", transform: [{ scale: 0.98 }] },

    logo: {
        fontSize: 28,
        fontFamily: "Fraunces-Medium",
    },

    rightContainer: {
        minWidth: 40,
        alignItems: "flex-end",
        justifyContent: "center",
    },
});
