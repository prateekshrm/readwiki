import { useScreenScroll } from "@/components/HeaderScroll";
import NewsCard from "@/components/NewsCard";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { useArticleCacheStore } from "@/stores/articleCache.store";
import { stripHtml } from "@/utils/html";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const News = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const featuredData = useArticleCacheStore((state) => state.featuredData);
    const news = featuredData?.news || [];

    const handleRetry = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    };

    if (news.length === 0) {
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
                    title="No News Available"
                    description="Could not load the latest news stories. Please try again."
                    onRetry={handleRetry}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={news}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => {
                    const article = item.links?.[0];

                    return (
                        <NewsCard
                            story={stripHtml(item.story)}
                            title={article?.normalizedtitle}
                            image={article?.thumbnail?.source}
                            onPress={() =>
                                article &&
                                router.navigate({
                                    pathname: "/article/[article]",
                                    params: {
                                        article: article.normalizedtitle,
                                    },
                                })
                            }
                        />
                    );
                }}
                keyExtractor={(item, index) => `${item.story}-${index}`}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default News;

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        loaderContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: colors.background,
        },
        listContent: {
            paddingTop: 100,
        },
    });
