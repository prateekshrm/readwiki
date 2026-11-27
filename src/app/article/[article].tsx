import ArticlePreviewSheet from "@/components/ArticlePreviewSheet";
import ArticleSkeleton from "@/components/ArticleSkeleton";
import GalleryView from "@/components/GalleryView";
import { useScreenScroll } from "@/components/HeaderScroll";
import InfoboxSheet from "@/components/InfoboxSheet";
import NoInternetView from "@/components/NoInternetView";
import RichText from "@/components/RichText";
import TableView from "@/components/TableView";
import { ThemeColors } from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { useTheme } from "@/hooks/useTheme";
import { parseArticle, type Block } from "@/services/articleParser";
import { getFullArticle } from "@/services/wikipedia";
import { addToHistory } from "@/stores/articleHistory.store";
import { usePreferencesStore } from "@/stores/preferences.store";
import { toggleSavedArticle, useIsSaved } from "@/stores/savedArticles.store";
import { toast } from "@/stores/toast.store";
import { AnimatedLegendList } from "@legendapp/list/reanimated";
import { ModalBottomSheet } from "@swmansion/react-native-bottom-sheet";
import { Image } from "expo-image";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Linking,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Metadata used for the article header and for saving the article.
type ArticleMeta = {
    title: string;
    description?: string;
    thumbnail?: string;
    heroImage?: string;
    heroWidth?: number;
    heroHeight?: number;
};

// Wikipedia thumbnails embed their width (e.g. ".../250px-Foo.jpg").
// Bump it up so the full-screen image viewer shows a sharp version.
const biggerImage = (src: string) => src.replace(/\/(\d+)px-/, "/1280px-");

const openImage = (src: string) => {
    router.navigate({
        pathname: "/image/[image]",
        params: { image: biggerImage(src) },
    });
};

const articleUrl = (item: any) =>
    item.fullurl ??
    item.canonicalurl ??
    `https://en.wikipedia.org/wiki/${encodeURIComponent(
        String(item.title).replace(/ /g, "_"),
    )}`;

const shareArticle = async (item: any) => {
    try {
        await Share.share({
            message: articleUrl(item),
            url: articleUrl(item),
            title: item.title,
        });
    } catch {
        // User dismissed the share sheet; nothing to do.
    }
};

const openOnWikipedia = async (item: ArticleMeta) => {
    try {
        await Linking.openURL(articleUrl(item));
    } catch (error) {
        console.log("Failed to open article on Wikipedia:", error);
        toast.error(
            "Couldn't Open Wikipedia",
            "Unable to open the link in your browser.",
        );
    }
};

// Header buttons that save / unsave the current article and open the actions sheet.
const HeaderRight = ({
    meta,
    onMorePress,
    disabled,
}: {
    meta: ArticleMeta;
    onMorePress: () => void;
    disabled: boolean;
}) => {
    const saved = useIsSaved(meta.title);
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable
                style={({ pressed }) => [
                    styles.headerRightButton,
                    { backgroundColor: colors.backgroundMuted },
                    !disabled && pressed && styles.headerRightButtonPressed,
                    disabled && {
                        opacity: 0.6,
                    },
                ]}
                onPress={() =>
                    toggleSavedArticle({
                        title: meta.title,
                        thumbnail: meta.thumbnail,
                        savedAt: Date.now(),
                    })
                }
                disabled={disabled}
            >
                <RemixIcon
                    name={saved ? "bookmark-fill" : "bookmark-line"}
                    size={20}
                    color={colors.text}
                    fallback={null}
                />
            </Pressable>
            <Pressable
                style={({ pressed }) => [
                    styles.headerRightButton,
                    { backgroundColor: colors.backgroundMuted },
                    !disabled && pressed && styles.headerRightButtonPressed,
                    disabled && {
                        opacity: 0.6,
                    },
                ]}
                onPress={onMorePress}
                disabled={disabled}
            >
                <RemixIcon
                    name="more-fill"
                    size={20}
                    color={colors.text}
                    fallback={null}
                />
            </Pressable>
        </View>
    );
};

type ArticleBlockItemProps = {
    block: Block;
    fontScale: number;
    styles: ReturnType<typeof createStyles>;
    onLinkPress: (title: string) => void;
    onImagePress?: (src: string) => void;
    articleTitle?: string;
};

const ArticleBlockItem = memo(
    ({
        block,
        fontScale,
        styles,
        onLinkPress,
        onImagePress,
        articleTitle,
    }: ArticleBlockItemProps) => {
        switch (block.type) {
            case "heading": {
                const headingStyle =
                    block.level === 2
                        ? styles.heading2
                        : block.level === 3
                          ? styles.heading3
                          : block.level === 4
                            ? styles.heading4
                            : styles.heading5;

                const headingSize =
                    (block.level === 2
                        ? 30
                        : block.level === 3
                          ? 24
                          : block.level === 4
                            ? 20
                            : 16) * fontScale;

                return (
                    <Text
                        style={[
                            fraunces,
                            headingStyle,
                            { fontSize: headingSize },
                        ]}
                    >
                        {block.text}
                    </Text>
                );
            }

            case "paragraph":
                return (
                    <RichText
                        spans={block.spans}
                        onLinkPress={onLinkPress}
                        style={[
                            styles.paragraph,
                            {
                                fontSize: 16 * fontScale,
                                lineHeight: 26 * fontScale,
                            },
                        ]}
                    />
                );

            case "quote":
                return (
                    <View style={styles.quote}>
                        <RichText
                            spans={block.spans}
                            onLinkPress={onLinkPress}
                            style={[
                                styles.quoteText,
                                {
                                    fontSize: 16 * fontScale,
                                    lineHeight: 26 * fontScale,
                                },
                            ]}
                        />
                        {!!block.citation && (
                            <Text
                                style={[
                                    styles.quoteCitation,
                                    { fontSize: 13 * fontScale },
                                ]}
                            >
                                — {block.citation}
                            </Text>
                        )}
                    </View>
                );

            case "code":
                return (
                    <View style={styles.codeBlock}>
                        {!!block.language && (
                            <Text style={styles.codeLanguage}>
                                {block.language}
                            </Text>
                        )}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.codeScroll}
                        >
                            <Text
                                selectable
                                style={[
                                    styles.codeText,
                                    {
                                        fontSize: 13 * fontScale,
                                        lineHeight: 20 * fontScale,
                                    },
                                ]}
                            >
                                {block.code}
                            </Text>
                        </ScrollView>
                    </View>
                );

            case "infobox":
                return (
                    <InfoboxSheet
                        block={block}
                        onLinkPress={onLinkPress}
                        onImagePress={onImagePress}
                        articleTitle={articleTitle}
                    />
                );

            case "list":
                return (
                    <View style={styles.list}>
                        {block.items.map((item, index) => (
                            <View key={index} style={styles.listItem}>
                                <Text style={styles.bullet}>
                                    {block.ordered ? `${index + 1}.` : "•"}
                                </Text>
                                <RichText
                                    spans={item}
                                    onLinkPress={onLinkPress}
                                    style={[
                                        styles.paragraph,
                                        {
                                            flex: 1,
                                            marginBottom: 0,
                                            fontSize: 16 * fontScale,
                                            lineHeight: 26 * fontScale,
                                        },
                                    ]}
                                />
                            </View>
                        ))}
                    </View>
                );

            case "image": {
                const rawRatio =
                    block.width && block.height
                        ? block.width / block.height
                        : 3 / 2;
                const ratio = Math.max(0.4, Math.min(2.5, rawRatio));

                return (
                    <View style={styles.figure}>
                        <Pressable onPress={() => openImage(block.src)}>
                            <View style={styles.imageWrapper}>
                                <Image
                                    source={block.src}
                                    style={[
                                        styles.image,
                                        { aspectRatio: ratio },
                                    ]}
                                    contentFit="cover"
                                    transition={200}
                                />
                            </View>
                        </Pressable>
                        {!!block.caption && (
                            <Text style={styles.caption}>{block.caption}</Text>
                        )}
                    </View>
                );
            }

            case "gallery":
                return <GalleryView block={block} onImagePress={openImage} />;

            case "table":
                return (
                    <TableView
                        block={block}
                        onLinkPress={onLinkPress}
                        onImagePress={openImage}
                    />
                );

            default:
                return null;
        }
    },
);

ArticleBlockItem.displayName = "ArticleBlockItem";

const Article = () => {
    const { article } = useLocalSearchParams<{ article: string }>();
    const navigation = useNavigation();
    const preferences = usePreferencesStore();
    const insets = useSafeAreaInsets();
    const onScroll = useScreenScroll();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [blocks, setBlocks] = useState<Block[]>([]);
    const [meta, setMeta] = useState<ArticleMeta | null>(null);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const isConnected = useNetworkStatus();
    const prevConnectedRef = useRef<boolean | null>(null);

    const fontScale = preferences.fontScale;

    const [previewTitle, setPreviewTitle] = useState<string | null>(null);
    const [menuIndex, setMenuIndex] = useState(0);

    const activeMeta = useMemo(
        () => meta ?? (article ? { title: article } : null),
        [meta, article],
    );

    const handleLinkPress = useCallback((title: string) => {
        if (/^https?:\/\//i.test(title)) {
            Linking.openURL(title).catch((err) => {
                console.log("Failed to open external link:", err);
            });
            return;
        }
        setPreviewTitle(title);
    }, []);

    const handleDismissPreview = useCallback(() => {
        setPreviewTitle(null);
    }, []);

    const handleOpenMenu = useCallback(() => {
        setMenuIndex(1);
    }, []);

    const handleCloseMenu = useCallback(() => {
        setMenuIndex(0);
    }, []);

    const handleShare = useCallback(() => {
        if (!activeMeta) return;
        setMenuIndex(0);
        shareArticle(activeMeta);
    }, [activeMeta]);

    const handleReadOnWikipedia = useCallback(() => {
        if (!activeMeta) return;
        setMenuIndex(0);
        openOnWikipedia(activeMeta);
    }, [activeMeta]);

    const extraData = useMemo(
        () => ({ styles, fontScale }),
        [styles, fontScale],
    );

    const renderItem = useCallback(
        ({ item }: { item: Block }) => (
            <ArticleBlockItem
                block={item}
                fontScale={fontScale}
                styles={styles}
                onLinkPress={handleLinkPress}
                onImagePress={openImage}
                articleTitle={activeMeta?.title || article}
            />
        ),
        [fontScale, styles, handleLinkPress, activeMeta, article],
    );

    const keyExtractor = useCallback(
        (item: Block, index: number) => `${item.type}-${index}`,
        [],
    );

    const getItemType = useCallback((item: Block) => item.type, []);

    const headerRightDisabled = loading || !meta;

    useEffect(() => {
        if (activeMeta) {
            navigation.setOptions({
                headerRight: () => (
                    <HeaderRight
                        meta={activeMeta}
                        onMorePress={handleOpenMenu}
                        disabled={headerRightDisabled}
                    />
                ),
            });
        }
    }, [navigation, activeMeta, handleOpenMenu, headerRightDisabled]);

    const loadArticle = useCallback(
        async (forceRefresh = false) => {
            if (!article) return;
            try {
                const data = await getFullArticle(article, forceRefresh);

                if (data) {
                    const articleMeta: ArticleMeta = {
                        title: data.title || article,
                        description: data.description,
                        thumbnail: data.thumbnail,
                        heroImage: data.heroImage,
                        heroWidth: data.heroWidth,
                        heroHeight: data.heroHeight,
                    };

                    setMeta(articleMeta);

                    // Track this article in reading history.
                    addToHistory({
                        title: articleMeta.title,
                        thumbnail: articleMeta.thumbnail,
                        readAt: Date.now(),
                    });

                    if (data.html) {
                        setBlocks(
                            parseArticle(data.html, {
                                hasHeroImage: !!articleMeta.heroImage,
                            }),
                        );
                    }
                }
            } catch (error) {
                console.log("Failed to load article:", error);
                toast.error(
                    "Failed to Load Article",
                    "Please check your connection and try again.",
                );
            } finally {
                setLoading(false);
            }
        },
        [article],
    );

    useEffect(() => {
        loadArticle();
    }, [loadArticle]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);

        try {
            await loadArticle(true);
        } finally {
            setRefreshing(false);
        }
    }, [loadArticle]);

    // Refetch when internet arrives
    useEffect(() => {
        if (prevConnectedRef.current === false && isConnected === true) {
            setLoading(true);
            loadArticle(true);
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected, loadArticle]);

    if (loading) {
        return <ArticleSkeleton />;
    }

    if (!meta && blocks.length === 0) {
        if (!isConnected) {
            return (
                <View style={styles.container}>
                    <NoInternetView
                        onRetry={() => {
                            setLoading(true);
                            loadArticle(true);
                        }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <NoInternetView
                    iconName="file-warning-line"
                    title="Article Unavailable"
                    description="We couldn't load this article. Please check the title or try again later."
                    onRetry={() => {
                        setLoading(true);
                        loadArticle(true);
                    }}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <AnimatedLegendList
                data={blocks}
                extraData={extraData}
                keyExtractor={keyExtractor}
                getItemType={getItemType}
                renderItem={renderItem}
                contentContainerStyle={[
                    styles.content,
                    // With no hero image the title would sit under the transparent
                    // header, so push the content below it. Keep it immersive when
                    // there is a hero image.
                    !meta?.heroImage && { paddingTop: insets.top + 52 },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                drawDistance={1500}
                estimatedItemSize={100}
                recycleItems
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.text}
                        colors={[colors.text]}
                        progressBackgroundColor={colors.surface}
                        progressViewOffset={75}
                    />
                }
                ListHeaderComponent={
                    meta ? (
                        <View style={styles.header}>
                            {!!meta.heroImage && (
                                <Pressable
                                    onPress={() => openImage(meta.heroImage!)}
                                >
                                    <Image
                                        source={meta.heroImage}
                                        style={[
                                            styles.hero,
                                            {
                                                aspectRatio:
                                                    meta.heroWidth &&
                                                    meta.heroHeight
                                                        ? meta.heroWidth /
                                                          meta.heroHeight
                                                        : 3 / 2,
                                            },
                                        ]}
                                        contentFit="cover"
                                        transition={200}
                                    />
                                </Pressable>
                            )}

                            <Text style={[fraunces, styles.title]}>
                                {meta.title}
                            </Text>

                            {!!meta.description && (
                                <Text style={styles.description}>
                                    {meta.description}
                                </Text>
                            )}

                            <View style={styles.divider} />
                        </View>
                    ) : undefined
                }
            />

            <ArticlePreviewSheet
                title={previewTitle}
                onDismiss={handleDismissPreview}
            />

            <ModalBottomSheet
                detents={[0, "content"]}
                index={menuIndex}
                onIndexChange={setMenuIndex}
                onCloseRequest={handleCloseMenu}
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
                <View
                    style={[
                        styles.menuSheetContent,
                        { paddingBottom: insets.bottom + 16 },
                    ]}
                >
                    <Pressable
                        style={({ pressed }) => [
                            styles.menuSheetOption,
                            pressed && styles.menuSheetOptionPressed,
                        ]}
                        onPress={handleShare}
                    >
                        <RemixIcon
                            name="share-line"
                            size={20}
                            color={colors.text}
                            fallback={null}
                        />
                        <Text style={styles.menuSheetOptionText}>
                            Share article
                        </Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [
                            styles.menuSheetOption,
                            pressed && styles.menuSheetOptionPressed,
                        ]}
                        onPress={handleReadOnWikipedia}
                    >
                        <RemixIcon
                            name="external-link-line"
                            size={20}
                            color={colors.text}
                            fallback={null}
                        />
                        <Text style={styles.menuSheetOptionText}>
                            Read article on Wikipedia
                        </Text>
                    </Pressable>
                </View>
            </ModalBottomSheet>
        </View>
    );
};

export default Article;

const styles = StyleSheet.create({
    headerRightButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 100,
    },

    headerRightButtonPressed: {
        filter: "brightness(0.9)",
        transform: [{ scale: 0.98 }],
    },
});

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },

        loader: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
        },

        content: {
            paddingBottom: 48,
        },

        header: {
            marginBottom: 8,
        },

        hero: {
            width: "100%",
            backgroundColor: colors.backgroundMuted,
        },

        title: {
            fontSize: 34,
            color: colors.text,
            paddingHorizontal: 16,
            marginTop: 20,
        },

        description: {
            fontSize: 16,
            fontFamily: "DMSans-Medium",
            color: colors.textMuted,
            paddingHorizontal: 16,
            marginTop: 8,
        },

        divider: {
            height: 1,
            backgroundColor: colors.border,
            marginTop: 20,
            marginHorizontal: 16,
        },

        heading2: {
            color: colors.text,
            marginTop: 28,
            marginBottom: 12,
            paddingHorizontal: 16,
        },

        heading3: {
            color: colors.text,
            marginTop: 20,
            marginBottom: 10,
            paddingHorizontal: 16,
        },

        heading4: {
            color: colors.text,
            marginTop: 18,
            marginBottom: 8,
            paddingHorizontal: 16,
        },

        heading5: {
            color: colors.text,
            marginTop: 14,
            marginBottom: 6,
            paddingHorizontal: 16,
        },

        paragraph: {
            fontFamily: "DMSans-Regular",
            color: colors.text,
            marginBottom: 16,
            paddingHorizontal: 16,
        },

        quote: {
            marginHorizontal: 16,
            marginVertical: 12,
            paddingLeft: 14,
            borderLeftWidth: 3,
            borderLeftColor: colors.accent,
        },

        quoteText: {
            fontFamily: "DMSans-Regular",
            fontStyle: "italic",
            color: colors.text,
        },

        quoteCitation: {
            fontFamily: "DMSans-Medium",
            color: colors.textMuted,
            marginTop: 6,
        },

        codeBlock: {
            marginHorizontal: 16,
            marginVertical: 12,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 14,
        },

        codeLanguage: {
            fontSize: 11,
            fontFamily: "DMSans-Bold",
            color: colors.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginBottom: 6,
        },

        codeScroll: {
            flexGrow: 1,
        },

        codeText: {
            fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
            color: colors.text,
        },

        list: {
            paddingHorizontal: 16,
            marginBottom: 16,
            gap: 8,
        },

        listItem: {
            flexDirection: "row",
            gap: 10,
        },

        bullet: {
            fontFamily: "DMSans-SemiBold",
            color: colors.textSecondary,
            fontSize: 16,
            lineHeight: 28,
        },

        figure: {
            marginVertical: 14,
            paddingHorizontal: 16,
        },

        imageWrapper: {
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: colors.backgroundMuted,
        },

        image: {
            width: "100%",
            backgroundColor: colors.backgroundMuted,
        },

        caption: {
            fontSize: 13,
            fontFamily: "DMSans-Regular",
            color: colors.textMuted,
            marginTop: 8,
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

        menuSheetContent: {
            padding: 16,
            gap: 4,
        },

        menuSheetOption: {
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            padding: 14,
            borderRadius: 999,
        },

        menuSheetOptionPressed: {
            backgroundColor: colors.surfaceMuted,
        },

        menuSheetOptionText: {
            fontSize: 16,
            fontFamily: "DMSans-Medium",
            color: colors.text,
        },
    });
