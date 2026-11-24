import { ThemeColors } from "@/constants/Colors";
import useTheme from "@/hooks/useTheme";
import { useEffect, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
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
        <ScrollView
            style={styles.articleSkeletonContainter}
            contentContainerStyle={{
                gap: 32,
                paddingBottom: insets.bottom + 40,
            }}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.articleSkeletonTop}>
                <Animated.View
                    style={[styles.articleSkeletonImage, shimmerStyle]}
                />

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
            <View style={styles.articleSkeletonBottom}>
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
        </ScrollView>
    );
};

export default ArticleSkeleton;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        articleSkeletonContainter: {
            position: "relative",
            flex: 1,
            backgroundColor: colors.background,
        },

        articleSkeletonTop: {
            gap: 8,
        },

        articleSkeletonImage: {
            width: "100%",
            height: 450,
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

        articleSkeletonBottom: {
            flex: 1,
            gap: 6,
        },
    });
