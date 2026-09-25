import { useScreenScroll } from "@/components/HeaderScroll";
import Loader from "@/components/Loader";
import NewsCard from "@/components/NewsCard";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { getFeaturedData } from "@/services/wikipedia";
import { stripHtml } from "@/utils/html";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const News = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [news, setNews] = useState<any[]>([]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const prevConnectedRef = useRef<boolean | null>(null);

    const loadData = useCallback(async () => {
        try {
            const data = await getFeaturedData();
            setNews(data?.news || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refetch when internet arrives
    useEffect(() => {
        if (prevConnectedRef.current === false && isConnected === true) {
            setLoading(true);
            loadData();
        }
        prevConnectedRef.current = isConnected;
    }, [isConnected, loadData]);

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <Loader />
            </View>
        );
    }

    if (news.length === 0) {
        if (!isConnected) {
            return (
                <View style={styles.container}>
                    <NoInternetView
                        onRetry={() => {
                            setLoading(true);
                            loadData();
                        }}
                    />
                </View>
            );
        }

        return (
            <View style={styles.container}>
                <NoInternetView
                    iconName="refresh-line"
                    title="No News Available"
                    description="Could not load the latest news stories. Please try again."
                    onRetry={() => {
                        setLoading(true);
                        loadData();
                    }}
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
                                router.push({
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
