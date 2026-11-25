import ArticleCard from "@/components/ArticleCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import SectionButton from "@/components/SectionButton";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import {
    formatTimeAgo,
    removeFromHistory,
    useHistory,
} from "@/stores/articleHistory.store";
import { useLayoutStore } from "@/stores/layout.store";
import { router, useScrollToTop } from "expo-router";
import { useMemo, useRef } from "react";
import {
    Pressable,
    ScrollViewInstance,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";

const Library = () => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const history = useHistory();
    const onScroll = useScreenScroll();

    const tabBarHeight = useLayoutStore((state) => state.tabBarHeight);

    const scrollViewRef = useRef<ScrollViewInstance>(null);
    useScrollToTop(scrollViewRef);

    const latestHistory = history.slice(0, 3);

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                ref={scrollViewRef}
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: tabBarHeight + 16 },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                <View style={styles.linkContainer}>
                    <Pressable
                        style={({ pressed }) => [
                            styles.link,
                            pressed && styles.linkPressed,
                        ]}
                        onPress={() => router.navigate("/saved")}
                    >
                        <View style={styles.linkLeft}>
                            <View style={styles.linkIconContainer}>
                                <RemixIcon
                                    name="bookmark-line"
                                    size={20}
                                    color={colors.accent}
                                    fallback={null}
                                />
                            </View>

                            <View style={styles.linkTextWrapper}>
                                <Text style={styles.linkTitle}>
                                    Saved Articles
                                </Text>
                                <Text style={styles.linkSubtitle}>
                                    View all your saved articles
                                </Text>
                            </View>
                        </View>

                        <RemixIcon
                            name="arrow-right-s-line"
                            size={22}
                            color={colors.textSecondary}
                            fallback={null}
                        />
                    </Pressable>
                </View>

                {/* History Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={[fraunces, styles.sectionTitle]}>
                            History
                        </Text>
                    </View>

                    {latestHistory.length > 0 ? (
                        <View style={styles.sectionContent}>
                            {latestHistory.map((item) => (
                                <ArticleCard
                                    key={item.title}
                                    title={item.title}
                                    subtitle={formatTimeAgo(item.readAt)}
                                    image={item.thumbnail}
                                    onPress={() =>
                                        router.navigate({
                                            pathname: "/article/[article]",
                                            params: { article: item.title },
                                        })
                                    }
                                    onRemove={() =>
                                        removeFromHistory(item.title)
                                    }
                                    removeIcon="delete-bin-line"
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.sectionEmpty}>
                            <RemixIcon
                                name="history-line"
                                size={20}
                                color={colors.textMuted}
                                fallback={null}
                            />
                            <Text style={styles.sectionEmptyText}>
                                No Reading History Yet
                            </Text>
                        </View>
                    )}

                    {history.length > 0 && (
                        <SectionButton
                            text="View All History"
                            onPress={() => router.navigate("/history")}
                        />
                    )}
                </View>
            </Animated.ScrollView>
        </View>
    );
};

export default Library;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        content: {
            paddingTop: 100,
        },

        // ── Section layout (mirrors home screen trending section) ──
        section: {
            marginBottom: 32,
        },

        sectionHeader: {
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 16,
            marginTop: 16,
            marginBottom: 8,
        },

        sectionTitle: {
            fontSize: 24,
            color: colors.text,
        },

        sectionContent: {
            // ArticleCard handles its own padding
        },

        sectionEmpty: {
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 16,
            paddingHorizontal: 16,
            gap: 8,
        },

        sectionEmptyText: {
            fontSize: 16,
            fontFamily: "DMSans-Medium",
            color: colors.textMuted,
        },

        linkContainer: {
            padding: 16,
            gap: 12,
        },

        link: {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 12,
            borderRadius: 999,
            backgroundColor: colors.surface,
        },

        linkPressed: {
            backgroundColor: colors.surfaceMuted,
        },

        linkLeft: {
            flexDirection: "row",
            alignItems: "center",
            flex: 1,
        },

        linkIconContainer: {
            width: 48,
            height: 36,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.backgroundMuted,
            marginRight: 12,
        },

        linkTextWrapper: {
            flex: 1,
        },

        linkTitle: {
            fontSize: 16,
            fontFamily: "DMSans-SemiBold",
            color: colors.text,
        },

        linkSubtitle: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: colors.textSecondary,
        },
    });
