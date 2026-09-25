import ArticleCard from "@/components/ArticleCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import SectionButton from "@/components/SectionButton";
import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import {
    formatTimeAgo,
    removeFromHistory,
    useHistory,
} from "@/services/articleHistory";
import { removeArticle, useSavedArticles } from "@/services/savedArticles";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Library = () => {
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const history = useHistory();
    const savedArticles = useSavedArticles();
    const onScroll = useScreenScroll();
    const insets = useSafeAreaInsets();

    const latestHistory = history.slice(0, 3);
    const latestSaved = savedArticles.slice(0, 3);

    const isEmpty = history.length === 0 && savedArticles.length === 0;

    // Full-screen empty state when both sections are empty.
    if (isEmpty) {
        return (
            <View style={styles.empty}>
                <RemixIcon
                    name="book-shelf-line"
                    size={48}
                    color={colors.textMuted}
                    fallback={null}
                />
                <Text style={styles.emptyTitle}>Your library is empty</Text>
                <Text style={styles.emptySubtitle}>
                    Articles you read will appear in History, and articles you
                    bookmark will appear in Saved.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.ScrollView
                contentContainerStyle={[
                    styles.content,
                    { paddingBottom: insets.bottom + 80 },
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {/* ── History Section ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <RemixIcon
                            name="history-line"
                            size={24}
                            color={colors.text}
                            fallback={null}
                        />
                        <Text style={styles.sectionTitle}>History</Text>
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
                                        router.push({
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
                                size={28}
                                color={colors.textMuted}
                                fallback={null}
                            />
                            <Text style={styles.sectionEmptyText}>
                                No reading history yet
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

                {/* ── Saved Section ── */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <RemixIcon
                            name="bookmark-line"
                            size={24}
                            color={colors.text}
                            fallback={null}
                        />
                        <Text style={styles.sectionTitle}>Saved</Text>
                    </View>

                    {latestSaved.length > 0 ? (
                        <View style={styles.sectionContent}>
                            {latestSaved.map((item) => (
                                <ArticleCard
                                    key={item.title}
                                    title={item.title}
                                    image={item.thumbnail}
                                    onPress={() =>
                                        router.push({
                                            pathname: "/article/[article]",
                                            params: { article: item.title },
                                        })
                                    }
                                    onRemove={() => removeArticle(item.title)}
                                />
                            ))}
                        </View>
                    ) : (
                        <View style={styles.sectionEmpty}>
                            <RemixIcon
                                name="bookmark-line"
                                size={28}
                                color={colors.textMuted}
                                fallback={null}
                            />
                            <Text style={styles.sectionEmptyText}>
                                No saved articles yet
                            </Text>
                        </View>
                    )}

                    {savedArticles.length > 0 && (
                        <SectionButton
                            text="View All Saved"
                            onPress={() => router.navigate("/saved")}
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

        // ── Full-screen empty state ──
        empty: {
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 40,
            backgroundColor: colors.background,
        },

        emptyTitle: {
            marginTop: 16,
            fontSize: 20,
            fontFamily: "Fraunces-Medium",
            color: colors.text,
        },

        emptySubtitle: {
            marginTop: 8,
            textAlign: "center",
            fontSize: 14,
            lineHeight: 22,
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
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
            fontFamily: "Fraunces-Medium",
        },

        sectionContent: {
            // ArticleCard handles its own padding
        },

        // ── Inline empty state (one section empty, other has data) ──
        sectionEmpty: {
            alignItems: "center",
            justifyContent: "center",
            paddingVertical: 32,
            paddingHorizontal: 24,
            gap: 8,
        },

        sectionEmptyText: {
            fontSize: 14,
            fontFamily: "DMSans-Medium",
            color: colors.textMuted,
        },
    });
