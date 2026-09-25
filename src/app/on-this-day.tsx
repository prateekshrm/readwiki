import { useScreenScroll } from "@/components/HeaderScroll";
import Loader from "@/components/Loader";
import NoInternetView from "@/components/NoInternetView";
import OnThisDayEvent from "@/components/OnThisDayEvent";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { getFeaturedData } from "@/services/wikipedia";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const OnThisDay = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [loading, setLoading] = useState(true);
    const [onThisDayArticles, setOnThisDayArticles] = useState<any[]>([]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const prevConnectedRef = useRef<boolean | null>(null);

    const loadData = useCallback(async () => {
        try {
            const data = await getFeaturedData();
            setOnThisDayArticles(data?.onthisday || []);
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

    if (onThisDayArticles.length === 0) {
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
                    title="No Events Available"
                    description="Could not load historical events. Please try again."
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
                data={onThisDayArticles}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                onScroll={onScroll}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => {
                    return (
                        <OnThisDayEvent
                            year={item.year}
                            text={item.text}
                            pages={item.pages}
                            isFirst={index === 0}
                            isLast={index === onThisDayArticles.length - 1}
                            onPressPage={(article) => {
                                const target =
                                    article?.normalizedtitle || article?.title;
                                if (target) {
                                    router.push({
                                        pathname: "/article/[article]",
                                        params: {
                                            article: target,
                                        },
                                    });
                                }
                            }}
                        />
                    );
                }}
                keyExtractor={(item, index) =>
                    `${item.text}-${index}` ||
                    `${item.pages?.[0].title}-${index}`
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
};

export default OnThisDay;

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
