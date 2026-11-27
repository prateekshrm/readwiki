import { ThemeColors } from "@/constants/Colors";
import useTheme from "@/hooks/useTheme";
import { useScrollToTop } from "expo-router";
import { useEffect, useMemo, useRef } from "react";
import { ScrollView, ScrollViewInstance, StyleSheet, View } from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArticleCardSkeleton from "./ArticleCardSkeleton";

const HomeSkeleton = () => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const insets = useSafeAreaInsets();

    const scrollViewRef = useRef<ScrollViewInstance>(null);
    useScrollToTop(scrollViewRef);

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
            style={styles.homeSkeletonContainter}
            ref={scrollViewRef}
            contentContainerStyle={{
                gap: 32,
                paddingBottom: insets.bottom + 80,
            }}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View
                style={[styles.homeFeaturedSkeletonCard, shimmerStyle]}
            />
            <View style={styles.sectionSkeleton}>
                <Animated.View
                    style={[
                        styles.sectionTitleSkeleton,
                        {
                            width: "50%",
                            marginBottom: 6,
                        },
                        shimmerStyle,
                    ]}
                />

                <ArticleCardSkeleton count={3} />
            </View>
        </ScrollView>
    );
};

export default HomeSkeleton;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        homeSkeletonContainter: {
            position: "relative",
            flex: 1,
            backgroundColor: colors.background,
        },

        homeFeaturedSkeletonCard: {
            width: "100%",
            height: 560,
        },

        sectionSkeleton: {
            flex: 1,
            gap: 6,
        },

        sectionTitleSkeleton: {
            marginTop: 24,
            marginHorizontal: 16,
            borderRadius: 999,
            height: 40,
        },
    });
