import { ThemeColors } from "@/constants/Colors";
import useTheme from "@/hooks/useTheme";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ArticleSkeleton = () => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const insets = useSafeAreaInsets();

    const shimmer = useSharedValue(0);

    useEffect(() => {
        shimmer.value = withRepeat(withTiming(1, { duration: 500 }), -1, true);
    }, [shimmer]);

    const shimmerStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            shimmer.value,
            [0, 1],
            [colors.backgroundMuted, colors.backgroundSecondary],
        ),
    }));

    return (
        <View
            style={[
                styles.articleSkeletonContainter,
                {
                    paddingBottom: insets.bottom + 40,
                },
            ]}
        >
            <View
                style={[
                    styles.articleSkeletonTop,
                    {
                        paddingTop: insets.top + 52,
                    },
                ]}
            >
                <Animated.View
                    style={[
                        styles.articleTitleSkeleton,
                        {
                            width: "70%",
                        },
                        shimmerStyle,
                    ]}
                />

                <Animated.View
                    style={[
                        styles.articleSubtitleSkeleton,
                        { width: "80%" },
                        shimmerStyle,
                    ]}
                />
            </View>
            <View style={styles.articleSkeletonSection}>
                {[...Array(10)].map((_, index) => (
                    <Animated.View
                        key={index}
                        style={[styles.articleSubtitleSkeleton, shimmerStyle]}
                    />
                ))}
                <Animated.View
                    style={[
                        styles.articleSubtitleSkeleton,
                        { width: "80%" },
                        shimmerStyle,
                    ]}
                />
                <Animated.View
                    style={[
                        styles.articleSubtitleSkeleton,
                        { width: "70%" },
                        shimmerStyle,
                    ]}
                />
            </View>
            <View style={styles.articleSkeletonSection}>
                {[...Array(6)].map((_, index) => (
                    <Animated.View
                        key={index}
                        style={[styles.articleSubtitleSkeleton, shimmerStyle]}
                    />
                ))}
                <Animated.View
                    style={[
                        styles.articleSubtitleSkeleton,
                        { width: "80%" },
                        shimmerStyle,
                    ]}
                />
                <Animated.View
                    style={[
                        styles.articleSubtitleSkeleton,
                        { width: "70%" },
                        shimmerStyle,
                    ]}
                />
            </View>
        </View>
    );
};

export default ArticleSkeleton;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        articleSkeletonContainter: {
            flex: 1,
            backgroundColor: colors.background,
            gap: 32,
        },

        articleSkeletonTop: {
            gap: 8,
        },

        articleTitleSkeleton: {
            marginTop: 32,
            marginHorizontal: 16,
            marginBottom: 6,
            borderRadius: 999,
            height: 40,
        },

        articleSubtitleSkeleton: {
            marginHorizontal: 16,
            borderRadius: 999,
            height: 14,
        },

        articleSkeletonSection: {
            flex: 1,
            gap: 6,
        },

        articleSkeletonSectionTitle: {
            marginTop: 32,
            marginHorizontal: 16,
            marginBottom: 6,
            borderRadius: 999,
            height: 32,
        },
    });
