import { ThemeColors } from "@/constants/Colors";
import { useTheme } from "@/hooks/useTheme";
import { Image } from "expo-image";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import RemixIcon from "react-native-remix-icon";

export type OnThisDayPage = {
    title?: string;
    normalizedtitle?: string;
    thumbnail?: {
        source: string;
    };
    [key: string]: any;
};

type OnThisDayEventProps = {
    year: string | number;
    text: string;
    pages?: OnThisDayPage[];
    title?: string;
    image?: string;
    // Timeline flags so the connecting line stops at the first/last event.
    isFirst?: boolean;
    isLast?: boolean;
    onPressPage?: (page: OnThisDayPage) => void;
    onPress?: () => void;
};

export default function OnThisDayEvent({
    year,
    text,
    pages,
    title,
    image,
    isFirst,
    isLast,
    onPressPage,
    onPress,
}: OnThisDayEventProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const pageList: OnThisDayPage[] =
        pages && pages.length > 0
            ? pages
            : title
              ? [
                    {
                        normalizedtitle: title,
                        title: title,
                        thumbnail: image ? { source: image } : undefined,
                    },
                ]
              : [];

    return (
        <View style={[styles.row, isFirst && { marginTop: 12 }]}>
            <View style={styles.timeline}>
                {!isFirst && <View style={styles.lineTop} />}
                <View style={styles.dot} />
                {!isLast && <View style={styles.lineBottom} />}
            </View>

            <View
                style={[
                    styles.content,
                    isLast
                        ? {
                              paddingBottom: 0,
                          }
                        : {
                              paddingBottom: 28,
                          },
                ]}
            >
                <Text style={styles.year}>{year}</Text>
                <Text style={styles.text}>{text}</Text>

                {pageList.length > 0 && (
                    <View style={styles.pagesContainer}>
                        {pageList.map((article, index) => {
                            const articleTitle =
                                article.normalizedtitle || article.title;
                            const thumbnailSource = article.thumbnail?.source;

                            return (
                                <Pressable
                                    key={`${articleTitle}-${index}`}
                                    style={({ pressed }) => [
                                        styles.articleChip,
                                        pressed && styles.articleChipPressed,
                                    ]}
                                    onPress={() => {
                                        if (onPressPage) {
                                            onPressPage(article);
                                        } else if (onPress) {
                                            onPress();
                                        }
                                    }}
                                >
                                    {thumbnailSource ? (
                                        <Image
                                            source={thumbnailSource}
                                            style={styles.thumbnail}
                                            contentFit="cover"
                                        />
                                    ) : (
                                        <View style={styles.thumbnailFallback}>
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
                )}
            </View>
        </View>
    );
}

const DOT_SIZE = 12;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        row: {
            flexDirection: "row",
            paddingHorizontal: 16,
        },

        timeline: {
            width: 24,
            alignItems: "center",
        },

        lineTop: {
            width: 2,
            height: 8,
            backgroundColor: colors.border,
        },

        dot: {
            width: DOT_SIZE,
            height: DOT_SIZE,
            borderRadius: DOT_SIZE / 2,
            backgroundColor: colors.primary,
        },

        lineBottom: {
            flex: 1,
            width: 2,
            backgroundColor: colors.border,
        },

        content: {
            flex: 1,
            paddingLeft: 12,
        },

        year: {
            fontSize: 20,
            color: colors.text,
            fontFamily: "Fraunces-Medium",
            lineHeight: 22,
        },

        text: {
            marginTop: 4,
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            fontFamily: "DMSans-Medium",
        },

        pagesContainer: {
            marginTop: 12,
            gap: 8,
        },

        articleChip: {
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            padding: 8,
            paddingRight: 12,
            borderRadius: 12,
            backgroundColor: colors.surface,
        },

        articleChipPressed: {
            opacity: 0.8,
        },

        thumbnail: {
            width: 36,
            height: 36,
            borderRadius: 8,
        },

        thumbnailFallback: {
            width: 36,
            height: 36,
            borderRadius: 8,
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
