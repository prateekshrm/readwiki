import ArticleCard from "@/components/ArticleCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import Loader from "@/components/Loader";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import { useTheme } from "@/hooks/useTheme";
import { getFeaturedData } from "@/services/wikipedia";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Trending = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [trendingArticles, setTrendingArticles] = useState<any[]>([]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const prevConnectedRef = useRef<boolean | null>(null);

    const loadData = useCallback(async () => {
        try {
            const data = await getFeaturedData();
            setTrendingArticles(data?.mostread?.articles || []);
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

    if (trendingArticles.length === 0) {
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
                    title="No Articles Available"
                    description="Could not load trending articles. Please try again."
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
                data={trendingArticles}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                    <ArticleCard
                        tag={`${item.views.toLocaleString()} views`}
                        title={item.titles.normalized}
                        subtitle={item.extract}
                        image={item.thumbnail?.source}
                        onPress={() =>
                            router.push({
                                pathname: "/article/[article]",
                                params: {
                                    article: item.titles.normalized,
                                },
                            })
                        }
                    />
                )}
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
        loaderContainer: {
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
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
