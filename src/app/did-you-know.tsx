import DidYouKnowCard from "@/components/DidYouKnowCard";
import { useScreenScroll } from "@/components/HeaderScroll";
import NoInternetView from "@/components/NoInternetView";
import { ThemeColors } from "@/constants/Colors";
import useNetworkStatus from "@/hooks/useNetworkStatus";
import useTheme from "@/hooks/useTheme";
import { useArticleCacheStore } from "@/stores/articleCache.store";
import { router } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const DidYouKnow = () => {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const onScroll = useScreenScroll();

    const isConnected = useNetworkStatus();
    const featuredData = useArticleCacheStore((state) => state.featuredData);
    const facts = featuredData?.dyk || [];

    const handleRetry = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace("/(tabs)");
        }
    };

    if (facts.length === 0) {
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
                    title="No Facts Available"
                    description="Could not load facts right now. Please try again."
                    onRetry={handleRetry}
                />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Animated.FlatList
                data={facts}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                keyExtractor={(item, index) => `${item.story}-${index}`}
                contentContainerStyle={[
                    styles.listContent,
                    {
                        paddingBottom: insets.bottom + 32,
                    },
                ]}
                renderItem={({ item, index }) => (
                    <DidYouKnowCard
                        html={item.html}
                        text={item.text}
                        key={index}
                    />
                )}
            />
        </View>
    );
};

export default DidYouKnow;

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
