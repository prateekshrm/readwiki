import ArticleCard from "@/components/ArticleCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { useTheme } from "@/hooks/useTheme";
import { useArticleCacheStore } from "@/stores/articleCache.store";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Trending = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const featuredData = useArticleCacheStore((state) => state.featuredData);
    const trendingArticles = featuredData?.mostread?.articles || [];

    const handleRetry = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    };

    if (trendingArticles.length === 0) {
        if (!isConnected) {
            return (
                <View style={styles.container}>
                    <NoInternetView onRetry={handleRetry} />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <NoInternetView
                    iconName="refresh-line"
                    title="No Articles Available"
                    description="Could not load trending articles. Please try again."
                    onRetry={handleRetry}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={trendingArticles}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => {
                    const history = item.view_history;
                    const lastDateViews = history.at(-1)?.views ?? 0;
                    const secondLastDateViews = history.at(-2)?.views ?? 0;
                    const tagIcon =
                        history.length < 2
                            ? undefined
                            : lastDateViews > secondLastDateViews
                              ? "arrow-right-up-line"
                              : lastDateViews < secondLastDateViews
                                ? "arrow-right-down-line"
                                : undefined;

                    return (
                        <ArticleCard
                            key={item.titles.normalized + index}
                            tag={`${new Intl.NumberFormat("en", {
                                notation: "compact",
                            }).format(item.views)} views`}
                            tagIcon={tagIcon}
                            title={item.titles.normalized}
                            subtitle={item.extract}
                            image={item.thumbnail?.source}
                            onPress={() =>
                                router.navigate({
                                    pathname: "/article/[article]",
                                    params: {
                                        article: item.titles.normalized,
                                    },
                                })
                            }
                        />
                    );
                }}
                keyExtractor={(item, index) =>
                    `${item.title}-${index}` || `${item.titles.normalized}`
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default Trending;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        listContent: {
            paddingTop: 100,
            paddingBottom: 24,
        },
        header: {
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 20,
        },
        title: {
            fontSize: 32,
            color: colors.text,
            fontFamily: "DMSans-Bold",
            letterSpacing: -1,
            marginBottom: 6,
        },
        subtitle: {
            fontSize: 15,
            color: colors.textSecondary,
            fontFamily: "DMSans-Medium",
        },
    });
