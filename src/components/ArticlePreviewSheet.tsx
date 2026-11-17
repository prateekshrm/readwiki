import Colors from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { getArticleSummary } from "@/services/wikipedia";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Loader from "./Loader";

type ArticlePreviewSheetProps = {
    title: string | null;
    onDismiss: () => void;
};

type WikiSummary = {
    title?: string;
    description?: string;
    extract?: string;
    thumbnail?: { source: string; width: number; height: number };
    originalimage?: { source: string; width: number; height: number };
};

const ArticlePreviewSheet = ({
    title,
    onDismiss,
}: ArticlePreviewSheetProps) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();

    const [index, setIndex] = useState(title ? 1 : 0);
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<WikiSummary | null>(null);
    const lastTitleRef = useRef<string | null>(null);

    // Open and close the sheet based on the title prop.
    useEffect(() => {
        setIndex(title ? 1 : 0);

        if (!title) return;
        lastTitleRef.current = title;
        let cancelled = false;

        setLoading(true);
        setSummary(null);

        getArticleSummary(title)
            .then((data) => {
                if (!cancelled) {
                    setSummary(data);
                }
            })
            .catch((error) => {
                console.log("Failed to load article preview:", error);
                if (!cancelled) {
                    setSummary(null);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [title]);

    const activeTitle = title ?? lastTitleRef.current;
    const heroImage =
        summary?.thumbnail?.source ?? summary?.originalimage?.source;
    const displayTitle = summary?.title ?? activeTitle ?? "";
    const description = summary?.description;
    const extract = summary?.extract;

    const handleIndexChange = (nextIndex: number) => {
        setIndex(nextIndex);

        if (nextIndex === 0) {
            onDismiss();
        }
    };

    const handleOpenFullArticle = () => {
        const articleToOpen = displayTitle || activeTitle;

        setIndex(0);
        onDismiss();

        if (articleToOpen) {
            router.push({
                pathname: "/article/[article]",
                params: { article: articleToOpen },
            });
        }
    };

    return (
        <ModalBottomSheet
            index={index}
            onIndexChange={handleIndexChange}
            detents={[0, "content"]}
            scrimColor="rgba(0, 0, 0, 0.4)"
            surface={
                <View
                    style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: colors.background },
                    ]}
                />
            }
            surfaceStyle={{
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
            }}
        >
            {loading ? (
                <View
                    style={[
                        styles.loadingContainer,
                        { paddingBottom: insets.bottom + 16 },
                    ]}
                >
                    <Loader />
                </View>
            ) : (
                <View
                    style={[
                        styles.contentContainer,
                        { paddingBottom: insets.bottom + 16 },
                    ]}
                >
                    {/* Top section */}
                    <View style={styles.topSection}>
                        {heroImage ? (
                            <Image
                                source={heroImage}
                                style={styles.thumbnail}
                                contentFit="cover"
                                transition={200}
                            />
                        ) : (
                            <View style={styles.fallbackImageIcon}>
                                <RemixIcon
                                    name="file-list-2-line"
                                    size={28}
                                    color={colors.textMuted}
                                    fallback={null}
                                />
                            </View>
                        )}

                        <View style={styles.headerTextContainer}>
                            <Text
                                numberOfLines={2}
                                style={[styles.title, { color: colors.text }]}
                            >
                                {displayTitle}
                            </Text>

                            {!!description && (
                                <Text
                                    numberOfLines={2}
                                    style={[
                                        styles.subtitle,
                                        { color: colors.textMuted },
                                    ]}
                                >
                                    {description}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Article extract */}
                    <Text
                        numberOfLines={5}
                        style={[
                            styles.extract,
                            {
                                color: extract ? colors.text : colors.textMuted,
                            },
                        ]}
                    >
                        {extract ?? "No summary available for this article."}
                    </Text>

                    {/* Read full article */}
                    <Pressable
                        style={({ pressed }) => [
                            styles.readButton,
                            { backgroundColor: colors.primary },
                            pressed && styles.buttonPressed,
                        ]}
                        onPress={handleOpenFullArticle}
                    >
                        <Text
                            style={[
                                styles.readButtonText,
                                { color: colors.textInverse },
                            ]}
                        >
                            Read Full Article
                        </Text>

                        <RemixIcon
                            name="arrow-right-s-line"
                            size={18}
                            color={colors.textInverse}
                            fallback={null}
                        />
                    </Pressable>
                </View>
            )}
        </ModalBottomSheet>
    );
};

export default ArticlePreviewSheet;

const styles = StyleSheet.create({
    loadingContainer: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        padding: 16,
    },
    contentContainer: {
        padding: 16,
    },
    topSection: {
        flexDirection: "row",
        gap: 14,
        marginBottom: 16,
    },
    thumbnail: {
        width: 76,
        height: 76,
        borderRadius: 8,
        backgroundColor: Colors.backgroundMuted,
    },
    fallbackImageIcon: {
        width: 76,
        height: 76,
        borderRadius: 8,
        backgroundColor: Colors.backgroundMuted,
        alignItems: "center",
        justifyContent: "center",
    },
    headerTextContainer: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontFamily: "Fraunces-Medium",
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 18,
        fontFamily: "DMSans-Medium",
    },
    extract: {
        fontSize: 16,
        lineHeight: 22,
        fontFamily: "DMSans-Regular",
        marginBottom: 20,
    },
    readButton: {
        width: "100%",
        paddingVertical: 14,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
    },
    readButtonText: {
        fontSize: 16,
        fontFamily: "DMSans-SemiBold",
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
});
