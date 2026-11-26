import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import { useTheme } from "@/hooks/useTheme";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type NewsLink = {
    normalizedtitle?: string;
    title?: string;
    description?: string;
    thumbnail?: {
        source: string;
        width?: number;
        height?: number;
    };
    titles?: {
        normalized?: string;
        display?: string;
    };
};

type NewsStoryProps = {
    // Plain-text summary of the news story (HTML already stripped).
    story: string;
    image?: string;
    // All related Wikipedia articles for this news story.
    links?: NewsLink[];
    onPress?: () => void;
};

const getLinkTitle = (link: NewsLink): string | undefined =>
    link.normalizedtitle ?? link.titles?.normalized ?? link.title;

export default function NewsStory({
    story,
    image,
    links,
    onPress,
}: NewsStoryProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const insets = useSafeAreaInsets();
    const [sheetIndex, setSheetIndex] = useState(0);

    const relatedArticles = useMemo(
        () => (links ?? []).filter((link) => Boolean(getLinkTitle(link))),
        [links],
    );

    const handleCardPress = () => {
        setSheetIndex(1);
        onPress?.();
    };

    const handleArticlePress = (articleTitle: string) => {
        setSheetIndex(0);
        router.navigate({
            pathname: "/article/[article]",
            params: { article: articleTitle },
        });
    };

    return (
        <>
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    pressed && {
                        backgroundColor: colors.backgroundSecondary,
                    },
                ]}
                onPress={handleCardPress}
            >
                {image ? (
                    <Image
                        source={image}
                        style={styles.thumbnail}
                        contentFit="cover"
                    />
                ) : (
                    <View style={styles.thumbnailFallback}>
                        <RemixIcon
                            name="newspaper-line"
                            size={24}
                            color={colors.textMuted}
                            fallback={null}
                        />
                    </View>
                )}

                <View style={styles.content}>
                    <Text style={styles.story} numberOfLines={3}>
                        {story}
                    </Text>
                </View>
            </Pressable>

            <ModalBottomSheet
                detents={[0, "content"]}
                index={sheetIndex}
                onIndexChange={setSheetIndex}
                onCloseRequest={() => setSheetIndex(0)}
                lazy
                scrimColor="rgba(0, 0, 0, 0.4)"
                surface={
                    <View
                        style={[
                            StyleSheet.absoluteFill,
                            { backgroundColor: colors.surface },
                        ]}
                    />
                }
                surfaceStyle={{
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                }}
                settleDuration={300}
            >
                <View style={styles.sheetHandleContainer}>
                    <View style={styles.sheetHandle} />
                </View>

                <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={[
                        styles.sheetContent,
                        { paddingBottom: insets.bottom + 16 },
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.sheetEyebrow}>
                        <RemixIcon
                            name="newspaper-line"
                            size={16}
                            color={colors.accent}
                            fallback={null}
                        />
                        <Text style={styles.sheetEyebrowText}>In the News</Text>
                    </View>

                    <Text style={styles.sheetStory}>{story}</Text>

                    {relatedArticles.length > 0 && (
                        <>
                            <View style={styles.sheetDivider} />

                            <Text style={[fraunces, styles.sheetSectionTitle]}>
                                Related Articles
                            </Text>

                            <View style={styles.articleList}>
                                {relatedArticles.map((article, idx) => {
                                    const articleTitle = getLinkTitle(article);
                                    if (!articleTitle) return null;

                                    return (
                                        <Pressable
                                            key={`${articleTitle}-${idx}`}
                                            style={({ pressed }) => [
                                                styles.articleChip,
                                                pressed &&
                                                    styles.articleChipPressed,
                                            ]}
                                            onPress={() =>
                                                handleArticlePress(articleTitle)
                                            }
                                        >
                                            {article.thumbnail?.source ? (
                                                <Image
                                                    source={
                                                        article.thumbnail.source
                                                    }
                                                    style={
                                                        styles.articleThumbnail
                                                    }
                                                    contentFit="cover"
                                                />
                                            ) : (
                                                <View
                                                    style={
                                                        styles.articleThumbnailFallback
                                                    }
                                                >
                                                    <RemixIcon
                                                        name="file-list-2-line"
                                                        size={18}
                                                        color={colors.textMuted}
                                                        fallback={null}
                                                    />
                                                </View>
                                            )}

                                            <Text
                                                style={styles.articleTitle}
                                                numberOfLines={1}
                                            >
                                                {articleTitle}
                                            </Text>

                                            <RemixIcon
                                                name="arrow-right-s-line"
                                                size={18}
                                                color={colors.textSecondary}
                                                fallback={null}
                                            />
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </ScrollView>
            </ModalBottomSheet>
        </>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            position: "relative",
            flexDirection: "row",
            gap: 12,
            backgroundColor: colors.background,
            paddingHorizontal: 16,
            paddingVertical: 12,
        },

        thumbnail: {
            width: 72,
            height: 72,
            borderRadius: 12,
        },

        thumbnailFallback: {
            width: 72,
            height: 72,
            borderRadius: 12,
            backgroundColor: colors.backgroundMuted,
            alignItems: "center",
            justifyContent: "center",
        },

        content: {
            flex: 1,
            justifyContent: "center",
        },

        story: {
            color: colors.text,
            fontSize: 15,
            lineHeight: 21,
            fontFamily: "DMSans-SemiBold",
        },

        sheetHandleContainer: {
            alignItems: "center",
            paddingTop: 10,
            paddingBottom: 6,
        },

        sheetHandle: {
            width: 36,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.textSecondary,
        },

        sheetScroll: {
            flexGrow: 0,
            flexShrink: 1,
        },

        sheetContent: {
            paddingHorizontal: 16,
            paddingTop: 10,
        },

        sheetEyebrow: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 10,
        },

        sheetEyebrowText: {
            color: colors.accent,
            fontSize: 13,
            fontFamily: "DMSans-SemiBold",
            letterSpacing: 0.4,
            textTransform: "uppercase",
        },

        sheetStory: {
            color: colors.text,
            fontSize: 17,
            lineHeight: 25,
            fontFamily: "DMSans-Medium",
        },

        sheetDivider: {
            height: 1,
            backgroundColor: colors.divider,
            marginVertical: 16,
        },

        sheetSectionTitle: {
            color: colors.text,
            fontSize: 18,
            marginBottom: 12,
        },

        articleList: {
            gap: 8,
        },

        articleChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 8,
            paddingRight: 12,
            borderRadius: 999,
            backgroundColor: colors.surfaceMuted,
        },

        articleChipPressed: {
            backgroundColor: colors.backgroundMuted,
        },

        articleThumbnail: {
            width: 48,
            height: 36,
            borderRadius: 999,
        },

        articleThumbnailFallback: {
            width: 48,
            height: 36,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
            alignItems: "center",
            justifyContent: "center",
        },

        articleTitle: {
            flex: 1,
            color: colors.text,
            fontSize: 14,
            fontFamily: "DMSans-SemiBold",
        },
    });
