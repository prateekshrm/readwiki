import FlowSkeleton from "@/components/FlowSkeleton";
import { useSolidHeader } from "@/components/HeaderScroll";
import NoInternetView from "@/components/NoInternetView";
import Colors from "@/constants/Colors";
import { fraunces } from "@/constants/Typography";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { getRandomArticles } from "@/services/wikipedia";
import { useLayoutStore } from "@/stores/layout.store";
import { toggleSavedArticle, useIsSaved } from "@/stores/savedArticles.store";
import { toast } from "@/stores/toast.store";
import { MaskedView } from "@expo/ui/community/masked-view";
import NetInfo from "@react-native-community/netinfo";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    FlatListProps,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height } = Dimensions.get("screen");
const darkColors = Colors.dark;

const BATCH_SIZE = 50;
const MAX_FETCH_ATTEMPTS = 3;
const INITIAL_PREFETCH_COUNT = 2;
const PREFETCH_AHEAD = 4;
const PREFETCH_CONCURRENCY = 2;
const IMAGE_HEADERS = { "User-Agent": "ReadWiki/2.0.0" };

const hasThumbnail = (item: any): boolean =>
    typeof item?.thumbnail?.source === "string" &&
    item.thumbnail.source.length > 0;

const hasExtract = (item: any): boolean =>
    typeof item?.extract === "string" && item.extract.trim().length > 0;

// Build a canonical Wikipedia URL for sharing. The random-article query returns
// `fullurl`, but fall back to constructing one from the title just in case.
const articleUrl = (item: any) =>
    item.fullurl ??
    item.canonicalurl ??
    `https://en.wikipedia.org/wiki/${encodeURIComponent(
        String(item.title).replace(/ /g, "_"),
    )}`;

// A translucent circular action button (save / share).
const CircleButton = ({
    icon,
    onPress,
}: {
    icon: string;
    onPress: () => void;
}) => (
    <Pressable
        onPress={onPress}
        style={({ pressed }) => [
            styles.circle,
            pressed && styles.circlePressed,
        ]}
        hitSlop={8}
    >
        <RemixIcon
            name={icon as any}
            size={22}
            color={darkColors.text}
            fallback={null}
        />
    </Pressable>
);

// Save button lives in its own component so it can subscribe to the saved store
// and flip its icon the moment the article is bookmarked.
const SaveButton = ({ item }: { item: any }) => {
    const saved = useIsSaved(item.title);

    return (
        <CircleButton
            icon={saved ? "bookmark-fill" : "bookmark-line"}
            onPress={() =>
                toggleSavedArticle({
                    title: item.title,
                    thumbnail: item.thumbnail?.source,
                    savedAt: Date.now(),
                })
            }
        />
    );
};

// Gently bobbing "swipe up" pill hint shown on the first card until the user swipes.
const SwipeHint = ({ topOffset }: { topOffset: number }) => {
    const offset = useSharedValue(0);
    const pulse = useSharedValue(1);

    useEffect(() => {
        offset.value = withRepeat(
            withTiming(-8, {
                duration: 900,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );
        pulse.value = withRepeat(
            withTiming(0.7, {
                duration: 900,
                easing: Easing.inOut(Easing.quad),
            }),
            -1,
            true,
        );
    }, [offset, pulse]);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateY: offset.value }],
        opacity: pulse.value,
    }));

    return (
        <Animated.View
            style={[styles.hint, { top: topOffset }, style]}
            pointerEvents="none"
        >
            <RemixIcon
                name="arrow-up-double-line"
                size={16}
                color={darkColors.text}
                fallback={null}
            />
            <Text style={styles.hintText}>Swipe for more</Text>
        </Animated.View>
    );
};

const Flow = () => {
    const [articles, setArticles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [loadMoreError, setLoadMoreError] = useState(false);
    const [hasSwiped, setHasSwiped] = useState(false);

    const insets = useSafeAreaInsets();
    const tabBarHeight = useLayoutStore((state) => state.tabBarHeight);
    const isConnected = useNetworkStatus();
    const isConnectedRef = useRef(isConnected);
    isConnectedRef.current = isConnected;
    const prevConnectedRef = useRef<boolean | null>(null);
    const prefetchedUrlsRef = useRef<Set<string>>(new Set());
    const articlesRef = useRef<any[]>([]);
    articlesRef.current = articles;

    // Flow is a full-screen dark pager, so keep the header in its white state.
    useSolidHeader();

    const preloadImages = useCallback(async (items: any[]) => {
        if (!isConnectedRef.current) return;

        const urls = items
            .map((item) => item?.thumbnail?.source)
            .filter(
                (url): url is string =>
                    typeof url === "string" &&
                    url.length > 0 &&
                    !prefetchedUrlsRef.current.has(url),
            );

        if (!urls.length) return;

        for (const url of urls) {
            prefetchedUrlsRef.current.add(url);
        }

        // Prefetch with bounded concurrency so Wikimedia CDN doesn't rate-limit (429)
        // and one failure never short-circuits the rest of the batch.
        let cursor = 0;
        const worker = async () => {
            while (cursor < urls.length) {
                const url = urls[cursor++];
                try {
                    const ok = await Image.prefetch(url, {
                        cachePolicy: "memory-disk",
                        headers: IMAGE_HEADERS,
                    });
                    if (!ok) {
                        prefetchedUrlsRef.current.delete(url);
                    }
                } catch {
                    prefetchedUrlsRef.current.delete(url);
                }
            }
        };

        await Promise.all(
            Array.from(
                { length: Math.min(PREFETCH_CONCURRENCY, urls.length) },
                worker,
            ),
        );
    }, []);

    const fetchArticlesWithImages = useCallback(async () => {
        const collected: any[] = [];
        const seenIds = new Set<number>();

        for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt++) {
            const batch = await getRandomArticles(BATCH_SIZE);
            for (const item of batch as any[]) {
                if (
                    hasThumbnail(item) &&
                    hasExtract(item) &&
                    !seenIds.has(item.pageid)
                ) {
                    seenIds.add(item.pageid);
                    collected.push(item);
                }
            }
            if (collected.length > 0) {
                break;
            }
        }

        return collected;
    }, []);

    const loadInitial = useCallback(async () => {
        if (!isConnectedRef.current) {
            setLoading(false);
            return;
        }

        try {
            const data = await fetchArticlesWithImages();
            if (data.length > 0) {
                // Only block initial skeleton on the first few cards; prefetch the rest in the background.
                await preloadImages(data.slice(0, INITIAL_PREFETCH_COUNT));
                void preloadImages(data.slice(INITIAL_PREFETCH_COUNT));
                setArticles(data);
            }
        } catch (error) {
            if (isConnectedRef.current) {
                console.error("Failed to load flow articles:", error);
                toast.error(
                    "Failed to Load",
                    "Could not load articles right now.",
                );
            }
        } finally {
            setLoading(false);
        }
    }, [fetchArticlesWithImages, preloadImages]);

    const loadMore = useCallback(async () => {
        if (loadingMore) return;

        if (!isConnectedRef.current) {
            setLoadMoreError(true);
            return;
        }

        setLoadingMore(true);
        setLoadMoreError(false);

        try {
            const more = await fetchArticlesWithImages();
            if (more.length > 0) {
                void preloadImages(more);
                setArticles((prev) => {
                    const existingIds = new Set(prev.map((a) => a.pageid));
                    const unique = more.filter(
                        (item) => !existingIds.has(item.pageid),
                    );
                    return unique.length > 0 ? [...prev, ...unique] : prev;
                });
            }
        } catch (error) {
            setLoadMoreError(true);
            if (isConnectedRef.current) {
                console.error("Failed to load more flow articles:", error);
                toast.error("Failed to Load", "Could not load more articles.");
            }
        } finally {
            setLoadingMore(false);
        }
    }, [fetchArticlesWithImages, loadingMore, preloadImages]);

    const loadMoreRef = useRef(loadMore);
    loadMoreRef.current = loadMore;

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 60,
    }).current;

    const onViewableItemsChanged = useRef<
        NonNullable<FlatListProps<any>["onViewableItemsChanged"]>
    >(({ viewableItems }) => {
        const maxIndex = viewableItems.reduce(
            (max, entry) =>
                typeof entry.index === "number" && entry.index > max
                    ? entry.index
                    : max,
            -1,
        );
        if (maxIndex < 0) return;

        if (maxIndex > 0) {
            setHasSwiped(true);
        }

        const current = articlesRef.current;
        const upcoming = current.slice(
            maxIndex + 1,
            maxIndex + 1 + PREFETCH_AHEAD,
        );
        if (upcoming.length > 0) {
            void preloadImages(upcoming);
        }

        if (maxIndex >= current.length - PREFETCH_AHEAD) {
            void loadMoreRef.current();
        }
    }).current;

    useEffect(() => {
        loadInitial();
    }, [loadInitial]);

    // Refetch when internet arrives
    useEffect(() => {
        if (prevConnectedRef.current === false && isConnected === true) {
            if (articlesRef.current.length === 0) {
                setLoading(true);
                loadInitial();
            } else if (loadMoreError) {
                loadMore();
            }
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected, loadInitial, loadMore, loadMoreError]);

    const handleRetryInitial = useCallback(async () => {
        const state = await NetInfo.fetch();
        const online =
            state.isConnected !== false && state.isInternetReachable !== false;
        if (!online) return;

        setLoading(true);
        loadInitial();
    }, [loadInitial]);

    const handleRetryMore = useCallback(async () => {
        const state = await NetInfo.fetch();
        const online =
            state.isConnected !== false && state.isInternetReachable !== false;
        if (!online) return;

        loadMore();
    }, [loadMore]);

    const openArticle = useCallback((title: string) => {
        router.navigate({
            pathname: "/article/[article]",
            params: { article: title },
        });
    }, []);

    const shareArticle = useCallback(async (item: any) => {
        try {
            await Share.share({
                message: articleUrl(item),
                url: articleUrl(item),
                title: item.title,
            });
        } catch {
            // User dismissed the share sheet; nothing to do.
        }
    }, []);

    const bottomPadding = (tabBarHeight || 88) + 20;

    const renderItem = useCallback(
        ({ item, index }: any) => {
            const thumbnail = item.thumbnail.source;

            return (
                <View style={styles.page}>
                    {/* Full-bleed blurred backdrop so the masked top image dissolves smoothly */}
                    <Image
                        source={{ uri: thumbnail, headers: IMAGE_HEADERS }}
                        style={styles.background}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        blurRadius={200}
                    />

                    {/* Flat dark overlay over every blurred backdrop so the
                        blur reads consistently regardless of the image. */}
                    <View style={styles.overlay} />

                    {/* Top-half hero image masked from opaque black at top to transparent at bottom */}
                    <MaskedView
                        style={styles.heroMask}
                        maskElement={
                            <LinearGradient
                                colors={["black", "black", "transparent"]}
                                locations={[0, 0.45, 1]}
                                style={StyleSheet.absoluteFill}
                            />
                        }
                    >
                        <Image
                            source={{ uri: thumbnail, headers: IMAGE_HEADERS }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            style={StyleSheet.absoluteFill}
                        />
                    </MaskedView>

                    {/* Top scrim keeps the header/status bar legible; the
                        stronger bottom scrim anchors the text. */}
                    <LinearGradient
                        colors={["rgba(0,0,0,0.5)", "transparent"]}
                        style={styles.topScrim}
                        pointerEvents="none"
                    />
                    <LinearGradient
                        colors={[
                            "transparent",
                            "rgba(0,0,0,0.5)",
                            "rgba(0,0,0,0.92)",
                        ]}
                        locations={[0, 0.45, 1]}
                        style={styles.bottomScrim}
                        pointerEvents="none"
                    />

                    {/* Bottom-anchored content with single-row controls */}
                    <View
                        style={[
                            styles.content,
                            { paddingBottom: bottomPadding },
                        ]}
                    >
                        <Text
                            style={[fraunces, styles.title]}
                            numberOfLines={2}
                        >
                            {item.title}
                        </Text>

                        <Text style={styles.extract} numberOfLines={4}>
                            {item.extract}
                        </Text>

                        <View style={styles.actions}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.readButton,
                                    pressed && styles.readButtonPressed,
                                ]}
                                onPress={() => openArticle(item.title)}
                            >
                                <Text style={styles.readButtonText}>
                                    Read Article
                                </Text>
                                <RemixIcon
                                    name="arrow-right-s-line"
                                    size={18}
                                    color={darkColors.textInverse}
                                    fallback={null}
                                />
                            </Pressable>

                            <SaveButton item={item} />

                            <CircleButton
                                icon="share-line"
                                onPress={() => shareArticle(item)}
                            />
                        </View>
                    </View>

                    {index === 0 && !hasSwiped && (
                        <SwipeHint topOffset={insets.top + 64} />
                    )}
                </View>
            );
        },
        [bottomPadding, hasSwiped, insets.top, openArticle, shareArticle],
    );

    if (loading) {
        return <FlowSkeleton />;
    }

    if (!articles || articles.length === 0) {
        if (!isConnected) {
            return (
                <View style={styles.container}>
                    <NoInternetView forceDark onRetry={handleRetryInitial} />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <NoInternetView
                    forceDark
                    iconName="refresh-line"
                    title="Couldn't Load Articles"
                    description="Something went wrong while fetching articles. Please try again."
                    onRetry={handleRetryInitial}
                />
            </View>
        );
    }

    const renderFooter = () => {
        if (loadingMore) {
            return <FlowSkeleton />;
        }

        if (!isConnected || loadMoreError) {
            return (
                <View style={styles.page}>
                    <NoInternetView
                        forceDark
                        iconName={
                            !isConnected ? "wifi-off-line" : "refresh-line"
                        }
                        title={
                            !isConnected
                                ? "No Internet Connection"
                                : "Couldn't Load More"
                        }
                        description={
                            !isConnected
                                ? "Reconnect to Wi-Fi or mobile data to keep exploring."
                                : "Something went wrong while loading more articles."
                        }
                        onRetry={handleRetryMore}
                    />
                </View>
            );
        }

        return undefined;
    };

    return (
        <FlatList
            data={articles}
            renderItem={renderItem}
            keyExtractor={(item) => item.pageid.toString()}
            pagingEnabled
            decelerationRate="fast"
            snapToAlignment="start"
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={2}
            viewabilityConfig={viewabilityConfig}
            onViewableItemsChanged={onViewableItemsChanged}
            initialNumToRender={3}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews
            getItemLayout={(_, index) => ({
                length: height,
                offset: height * index,
                index,
            })}
            ListFooterComponent={renderFooter()}
        />
    );
};

export default Flow;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: darkColors.background,
    },

    page: {
        flex: 1,
        height,
        backgroundColor: darkColors.background,
    },

    background: {
        ...StyleSheet.absoluteFill,
    },

    overlay: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "rgba(0,0,0,0.55)",
    },

    heroMask: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: height * 0.5,
    },

    topScrim: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: "22%",
    },

    bottomScrim: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "65%",
    },

    content: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        gap: 14,
    },

    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginTop: 6,
    },

    title: {
        color: darkColors.text,
        fontSize: 28,
        letterSpacing: -0.5,
    },

    extract: {
        color: darkColors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        fontFamily: "DMSans-Medium",
    },

    readButton: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        paddingVertical: 14,
        borderRadius: 999,
        backgroundColor: darkColors.primary,
    },

    readButtonPressed: {
        filter: "brightness(0.9)",
        transform: [{ scale: 0.98 }],
    },

    readButtonText: {
        fontFamily: "DMSans-SemiBold",
        fontSize: 15,
        color: darkColors.textInverse,
    },

    circle: {
        width: 52,
        height: 52,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: darkColors.backgroundMuted,
        borderWidth: 1,
        borderColor: darkColors.border,
    },

    circlePressed: {
        opacity: 0.7,
        transform: [{ scale: 0.94 }],
    },

    hint: {
        position: "absolute",
        alignSelf: "center",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: darkColors.surface,
        borderWidth: 1,
        borderColor: darkColors.border,
    },

    hintText: {
        color: darkColors.text,
        fontSize: 13,
        fontFamily: "DMSans-SemiBold",
    },
});
