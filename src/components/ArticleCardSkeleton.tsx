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

type ArticleCardSkeletonProps = {
    count?: number;
};

const ArticleCardSkeleton = ({ count = 1 }: ArticleCardSkeletonProps) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

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
        <>
            {[...Array(count)].map((_, index) => (
                <View key={index} style={styles.skeletonCard}>
                    <Animated.View
                        style={[styles.skeletonImage, shimmerStyle]}
                    />

                    <View style={styles.skeletonContent}>
                        <Animated.View
                            style={[
                                styles.skeletonTitle,
                                {
                                    width: "50%",
                                    marginBottom: 6,
                                },
                                shimmerStyle,
                            ]}
                        />

                        <Animated.View
                            style={[styles.skeletonSubtitle, shimmerStyle]}
                        />

                        <Animated.View
                            style={[
                                styles.skeletonSubtitle,
                                { width: "80%" },
                                shimmerStyle,
                            ]}
                        />
                    </View>
                </View>
            ))}
        </>
    );
};

export default ArticleCardSkeleton;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        skeletonCard: {
            position: "relative",
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },

        skeletonImage: {
            width: 72,
            height: 72,
            borderRadius: 12,
        },

        skeletonContent: {
            flex: 1,
            gap: 6,
        },

        skeletonTitle: {
            borderRadius: 999,
            height: 20,
        },

        skeletonSubtitle: {
            borderRadius: 999,
            height: 14,
        },
    });
