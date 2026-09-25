import { useTheme } from "@/hooks/useTheme";
import { getArticleSummary } from "@/services/wikipedia";
import { BottomSheet, RNHostView } from "@expo/ui";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import RemixIcon from "react-native-remix-icon";
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
    const { width: windowWidth } = useWindowDimensions();
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<WikiSummary | null>(null);
    const lastTitleRef = useRef<string | null>(null);

    useEffect(() => {
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

    const handleOpenFullArticle = () => {
        const articleToOpen = displayTitle || activeTitle;
        onDismiss();
        if (articleToOpen) {
            router.push({
                pathname: "/article/[article]",
                params: { article: articleToOpen },
            });
        }
    };

    // Calculate width ensuring the inner host view has bounded horizontal layout
    // const contentWidth = Math.max(windowWidth - 32, 280);

    return (
        <BottomSheet
            isPresented={!!title}
            onDismiss={onDismiss}
            showDragIndicator
            containerColor={colors.background}
        >
            <RNHostView matchContents>
                <View style={{ width: windowWidth }}>
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <Loader />
                        </View>
                    ) : (
                        <View style={styles.contentContainer}>
                            {/* Top section: image on left, title and subtitle on right */}
                            <View style={styles.topSection}>
                                {!!heroImage && (
                                    <View
                                        style={[
                                            styles.thumbnailWrapper,
                                            {
                                                backgroundColor:
                                                    colors.backgroundMuted,
                                            },
                                        ]}
                                    >
                                        <Image
                                            source={heroImage}
                                            style={styles.thumbnail}
                                            contentFit="cover"
                                            transition={200}
                                        />
                                    </View>
                                )}

                                <View style={styles.headerTextContainer}>
                                    <Text
                                        numberOfLines={2}
                                        style={[
                                            styles.title,
                                            { color: colors.text },
                                        ]}
                                    >
                                        {displayTitle}
                                    </Text>

                                    {!!description && (
                                        <Text
                                            numberOfLines={2}
                                            style={[
                                                styles.subtitle,
                                                {
                                                    color: colors.textMuted,
                                                },
                                            ]}
                                        >
                                            {description}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Below top section: description extract */}
                            <Text
                                numberOfLines={5}
                                style={[
                                    styles.extract,
                                    {
                                        color: extract
                                            ? colors.text
                                            : colors.textMuted,
                                    },
                                ]}
                            >
                                {extract ??
                                    "No summary available for this article."}
                            </Text>

                            {/* Read full article button */}
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
                </View>
            </RNHostView>
        </BottomSheet>
    );
};

export default ArticlePreviewSheet;

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    loadingContainer: {
        height: 200,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    contentContainer: {
        padding: 16,
    },
    topSection: {
        flexDirection: "row",
        gap: 14,
        marginBottom: 16,
    },
    thumbnailWrapper: {
        width: 76,
        height: 76,
        borderRadius: 12,
        overflow: "hidden",
        flexShrink: 0,
    },
    thumbnail: {
        width: "100%",
        height: "100%",
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
        backgroundColor: "#FFFFFF",
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
