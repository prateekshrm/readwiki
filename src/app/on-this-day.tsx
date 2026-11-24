import { useScreenScroll } from "@/components/HeaderScroll";
import NoInternetView from "@/components/NoInternetView";
import OnThisDayEvent from "@/components/OnThisDayEvent";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { useArticleCacheStore } from "@/stores/articleCache.store";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import RemixIcon from "react-native-remix-icon";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const TodaysDate = () => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const date = new Date();

    const formattedDate = date
        .toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
        })
        .replace(/^(\d+)/, (day) => {
            const n = Number(day);
            const suffix =
                n % 10 === 1 && n !== 11
                    ? "st"
                    : n % 10 === 2 && n !== 12
                      ? "nd"
                      : n % 10 === 3 && n !== 13
                        ? "rd"
                        : "th";

            return `${n}${suffix}`;
        });

    return (
        <View style={styles.otdSectionDate}>
            <RemixIcon
                name="calendar-event-line"
                size={14}
                color={colors.textSecondary}
                fallback={null}
            />
            <Text style={styles.otdSectionDateText}>{formattedDate}</Text>
        </View>
    );
};

const OnThisDay = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const featuredData = useArticleCacheStore((state) => state.featuredData);
    const onThisDayArticles = featuredData?.onthisday || [];

    const handleRetry = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    };

    if (onThisDayArticles.length === 0) {
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
                    title="No Events Available"
                    description="Could not load historical events. Please try again."
                    onRetry={handleRetry}
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
                ListHeaderComponent={<TodaysDate />}
                ListHeaderComponentStyle={{
                    paddingHorizontal: 16,
                    marginBottom: 12,
                }}
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
                                    router.navigate({
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

        otdSectionDate: {
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 999,
            backgroundColor: colors.backgroundMuted,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            alignSelf: "flex-start",
            marginTop: 8,
        },

        otdSectionDateText: {
            fontSize: 14,
            fontFamily: "DMSans-Medium",
            color: colors.text,
        },
    });
